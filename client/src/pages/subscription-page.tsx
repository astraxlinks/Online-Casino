import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { SubscriptionPlan } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ProtectedRoute } from '@/lib/protected-route';
import { Link, useLocation } from 'wouter';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, X, CreditCard, Award, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Make sure to call loadStripe outside of a component's render to avoid recreating the Stripe object on every render
// Use publishable key from environment variable
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Define subscription plan card component
interface PlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  onSelect: () => void;
}

function PlanCard({ plan, isCurrentPlan, onSelect }: PlanCardProps) {
  const tierColor = {
    bronze: 'bg-amber-700 text-white',
    silver: 'bg-gray-400 text-white',
    gold: 'bg-yellow-500 text-white',
  }[plan.tier] || 'bg-primary text-primary-foreground';

  return (
    <Card className={isCurrentPlan ? 'border-primary border-2' : ''}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">
            {plan.name} Plan
          </CardTitle>
          <Badge className={tierColor}>
            {plan.tier.toUpperCase()}
          </Badge>
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-4">${plan.price.toFixed(2)}<span className="text-sm font-normal">/month</span></div>
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          onClick={onSelect}
          variant={isCurrentPlan ? "outline" : "default"}
          disabled={isCurrentPlan}
          className="w-full"
        >
          {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Payment form component
function SubscriptionForm({ clientSecret, onSuccess, onCancel, plan }: { clientSecret: string, onSuccess: () => void, onCancel: () => void, plan: SubscriptionPlan }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/subscriptions',
      },
      redirect: 'if_required'
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
      // Cancel the subscription attempt if payment fails
      onCancel();
    } else {
      // The payment was successful!
      toast({
        title: "Subscription Successful!",
        description: `You are now subscribed to the ${plan.name} plan.`,
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <h3 className="font-medium mb-2">Subscribe to {plan.name} Plan</h3>
        <div className="bg-muted p-3 rounded-md mb-4">
          <p className="flex justify-between">
            <span>Monthly subscription</span>
            <span className="font-semibold">${plan.price.toFixed(2)}/month</span>
          </p>
        </div>
      </div>
      
      <PaymentElement />
      
      <div className="flex justify-between mt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? 'Processing...' : 'Subscribe Now'}
        </Button>
      </div>
    </form>
  );
}

// Manage current subscription component
interface CurrentSubscriptionProps {
  subscription: any;
  onCancel: () => void;
}

function CurrentSubscription({ subscription, onCancel }: CurrentSubscriptionProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { toast } = useToast();
  
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscriptions/cancel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/current'] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
      setConfirmCancel(false);
      onCancel();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Cancel",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Parse metadata if it's a string
  let metadata = subscription.metadata;
  try {
    if (typeof metadata === 'string') {
      metadata = JSON.parse(metadata);
    }
  } catch (e) {
    metadata = {};
  }

  const startDate = new Date(subscription.startDate);
  const endDate = subscription.endDate ? new Date(subscription.endDate) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Your Current Subscription</CardTitle>
          <Badge 
            className={
              subscription.tier === 'bronze' ? 'bg-amber-700 text-white' :
              subscription.tier === 'silver' ? 'bg-gray-400 text-white' :
              'bg-yellow-500 text-white'
            }
          >
            {subscription.tier.toUpperCase()}
          </Badge>
        </div>
        <CardDescription>
          {metadata.planName || subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant={subscription.status === 'active' ? 'default' : 'outline'}>
              {subscription.status.toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Price:</span>
            <span>${parseFloat(subscription.priceAmount).toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Start Date:</span>
            <span>{startDate.toLocaleDateString()}</span>
          </div>
          
          {endDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">End Date:</span>
              <span>{endDate.toLocaleDateString()}</span>
            </div>
          )}
          
          {metadata.features && (
            <Accordion type="single" collapsible>
              <AccordionItem value="features">
                <AccordionTrigger>Your Benefits</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {metadata.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center">
                        <Check className="h-4 w-4 text-primary mr-2" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={() => setConfirmCancel(true)}
        >
          Cancel Subscription
        </Button>
      </CardFooter>
      
      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Your Subscription?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your {metadata.planName || subscription.tier} subscription? 
              You'll lose all the benefits immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
            <p className="text-sm text-amber-800">
              Your subscription will be cancelled immediately. You won't be charged again.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(false)}>
              Keep Subscription
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => cancelSubscriptionMutation.mutate()}
              disabled={cancelSubscriptionMutation.isPending}
            >
              {cancelSubscriptionMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Main component
function SubscriptionPageContent() {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch available subscription plans
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscriptions/plans'],
    queryFn: async () => {
      const res = await fetch('/api/subscriptions/plans');
      if (!res.ok) throw new Error('Failed to fetch subscription plans');
      return res.json();
    }
  });
  
  // Fetch current subscription status
  const { 
    data: currentSubscription, 
    isLoading: subscriptionLoading,
    refetch: refetchSubscription
  } = useQuery({
    queryKey: ['/api/subscriptions/current'],
    queryFn: async () => {
      const res = await fetch('/api/subscriptions/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch subscription status');
      return res.json();
    },
    enabled: !!user
  });
  
  // Mutation to create a subscription
  const createSubscriptionMutation = useMutation({
    mutationFn: async (tier: string) => {
      const res = await apiRequest("POST", "/api/subscriptions/create", { tier });
      return res.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setShowPaymentForm(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Subscription",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    createSubscriptionMutation.mutate(plan.tier);
  };
  
  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setSelectedPlan(null);
    refetchSubscription();
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
  };
  
  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setSelectedPlan(null);
  };
  
  const handleCancelSuccess = () => {
    refetchSubscription();
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
  };
  
  if (plansLoading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // Show payment form if a plan is selected and clientSecret is available
  if (showPaymentForm && selectedPlan && clientSecret) {
    return (
      <div className="max-w-md mx-auto my-8">
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <SubscriptionForm 
            clientSecret={clientSecret} 
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
            plan={selectedPlan}
          />
        </Elements>
      </div>
    );
  }
  
  const hasActiveSubscription = currentSubscription && currentSubscription.active;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Choose a subscription plan to enhance your gaming experience.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setLocation('/')}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" /> Back to Home
        </Button>
      </div>
      
      {hasActiveSubscription && (
        <div className="mb-8">
          <CurrentSubscription 
            subscription={currentSubscription} 
            onCancel={handleCancelSuccess}
          />
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan: SubscriptionPlan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={
              hasActiveSubscription && 
              currentSubscription.tier === plan.tier
            }
            onSelect={() => handleSelectPlan(plan)}
          />
        ))}
      </div>
      
      <div className="mt-12 bg-muted p-6 rounded-lg">
        <div className="flex items-start">
          <div className="mr-4 mt-1">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Subscription Benefits</h3>
            <p className="text-muted-foreground mb-4">
              Enhance your gaming experience with exclusive benefits:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <li className="flex items-center">
                <Award className="h-5 w-5 text-primary mr-2" />
                <span>VIP badges to showcase your status</span>
              </li>
              <li className="flex items-center">
                <Star className="h-5 w-5 text-primary mr-2" />
                <span>Daily coin rewards</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Increased rewards multipliers</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-primary mr-2" />
                <span>Access to premium games</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <ProtectedRoute path="/subscriptions" component={SubscriptionPageContent} />
  );
}