import { useEffect, useState } from 'react';
import { 
  useStripe, 
  useElements, 
  PaymentElement,
  Elements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Loader2, Coins, CreditCard, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CoinPackage } from '@shared/schema';

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CheckoutFormProps {
  clientSecret: string;
  packageDetails: CoinPackage;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ clientSecret, packageDetails, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/purchase',
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: 'Payment Failed',
          description: error.message || 'Something went wrong with your payment.',
          variant: 'destructive',
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: 'Payment Successful',
          description: `You purchased ${packageDetails.coins.toLocaleString()} coins!`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Payment Status',
          description: 'Your payment is processing.',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-muted/20 p-5 rounded-xl mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Coins className="h-5 w-5 mr-2 text-yellow-500" />
          Order Summary
        </h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center py-1 border-b border-dashed border-muted">
            <span className="text-muted-foreground">Package</span>
            <span className="font-medium">{packageDetails.name}</span>
          </div>
          
          <div className="flex justify-between items-center py-1 border-b border-dashed border-muted">
            <span className="text-muted-foreground">Coins</span>
            <div className="flex items-center">
              <Coins className="h-4 w-4 mr-1 text-yellow-500" />
              <span className="font-medium">{packageDetails.coins.toLocaleString()}</span>
            </div>
          </div>
          
          {packageDetails.discount && packageDetails.discount > 0 && (
            <div className="flex justify-between items-center py-1 border-b border-dashed border-muted">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium text-green-500">{packageDetails.discount}% OFF</span>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-2 mt-1">
            <span className="font-semibold">Total</span>
            <div className="font-bold text-xl">${packageDetails.price.toFixed(2)}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-card p-5 rounded-xl border mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <CreditCard className="h-5 w-5 mr-2" />
          Payment Details
        </h3>
        
        <PaymentElement className="mb-2" />
        
        <div className="text-xs text-muted-foreground mt-4 flex items-center">
          <div className="flex-1 border-t border-muted mr-4"></div>
          <span>All transactions are secure and encrypted</span>
          <div className="flex-1 border-t border-muted ml-4"></div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isProcessing}
          className="sm:flex-1"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || !elements || isProcessing}
          className="sm:flex-[2]"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <div className="flex items-center">
              Complete Purchase - <div className="ml-1">${packageDetails.price.toFixed(2)}</div>
            </div>
          )}
        </Button>
      </div>
      
      <div className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center">
        <div className="flex mr-1">
          <svg viewBox="0 0 32 32" className="h-4 w-4 mr-1">
            <path fill="#5468FF" d="M0 4c0-1.1.9-2 2-2h28a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4z" />
            <path fill="#FFF" d="M13 0h6v32h-6z" />
            <path fill="#FFF" d="M0 13h32v6H0z" />
          </svg>
          <svg viewBox="0 0 32 32" className="h-4 w-4">
            <path d="M0 4c0-1.1.9-2 2-2h28a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4z" fill="#EB1C26" />
            <path d="M16 28c6.627 0 12-5.373 12-12S22.627 4 16 4 4 9.373 4 16s5.373 12 12 12z" fill="#FFF" />
            <path d="M16 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" fill="#EB1C26" />
          </svg>
        </div>
        <span>Payment processed securely by Stripe</span>
      </div>
    </form>
  );
}

interface CheckoutProps {
  packageId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function Checkout({ packageId, onSuccess, onCancel }: CheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Get package details
  const { data: packages, isLoading: isPackagesLoading } = useQuery<CoinPackage[]>({
    queryKey: ['/api/coins/packages'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const packageDetails = packages?.find((pkg: CoinPackage) => pkg.id === packageId);
  
  // Create payment intent
  const { mutate: createPaymentIntent, isPending: isCreatingPayment } = useMutation({
    mutationFn: async () => {
      if (!packageDetails) throw new Error('Package not found');
      
      const res = await apiRequest('POST', '/api/coins/create-payment-intent', {
        packageId,
        amount: packageDetails.price
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create payment');
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: Error) => {
      toast({
        title: 'Payment Setup Failed',
        description: error.message || 'Could not initialize payment. Please try again.',
        variant: 'destructive',
      });
      onCancel();
    }
  });
  
  // When package details are loaded, create payment intent
  useEffect(() => {
    if (packageDetails && !clientSecret && !isCreatingPayment) {
      createPaymentIntent();
    }
  }, [packageDetails, clientSecret, isCreatingPayment, createPaymentIntent]);
  
  // Show loading state
  if (isPackagesLoading || isCreatingPayment || !clientSecret || !packageDetails) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Setting up payment...</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ 
      clientSecret,
      appearance: {
        theme: 'night' as const,
        labels: 'floating'
      }
    }}>
      <CheckoutForm 
        clientSecret={clientSecret} 
        packageDetails={packageDetails}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}