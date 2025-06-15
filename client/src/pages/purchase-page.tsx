import { useState, useEffect } from 'react';
import MainLayout from '@/components/layouts/main-layout';
import { ProtectedRoute } from '@/lib/protected-route';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter
} from '@/components/ui/card';
import { Coins, CreditCard, ChevronLeft, Home, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import CoinPackages from '@/components/coin-packages';
import Checkout from '@/components/checkout';
import { useLocation } from 'wouter';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/hooks/use-auth';
import { Progress } from '@/components/ui/progress';

enum PurchaseStep {
  SELECT_PACKAGE = 'select_package',
  CHECKOUT = 'checkout',
  SUCCESS = 'success'
}

export function PurchasePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<PurchaseStep>(PurchaseStep.SELECT_PACKAGE);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState(33);

  // Update progress bar based on current step
  useEffect(() => {
    if (step === PurchaseStep.SELECT_PACKAGE) {
      setProgressValue(33);
    } else if (step === PurchaseStep.CHECKOUT) {
      setProgressValue(66);
    } else if (step === PurchaseStep.SUCCESS) {
      setProgressValue(100);
    }
  }, [step]);

  const handleContinue = () => {
    if (!selectedPackageId) {
      toast({
        title: 'No Package Selected',
        description: 'Please select a coin package to continue',
        variant: 'destructive',
      });
      return;
    }

    setStep(PurchaseStep.CHECKOUT);
  };

  const handleCancel = () => {
    if (step === PurchaseStep.CHECKOUT) {
      setStep(PurchaseStep.SELECT_PACKAGE);
    } else {
      navigate('/');
    }
  };

  const handleSuccess = () => {
    setStep(PurchaseStep.SUCCESS);
    toast({
      title: 'Purchase Completed!',
      description: 'Your coins have been added to your account',
    });
  };

  return (
    <div className="w-full max-w-full py-6 px-4 md:px-6">
      {/* Top navigation bar */}
      <div className="flex justify-between items-center mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Games
        </Button>
        
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">Current Balance:</span>
          <div className="flex items-center bg-muted/30 px-3 py-1 rounded-lg">
            <Coins className="h-4 w-4 text-yellow-500 mr-1" />
            <div className="font-semibold">{user?.balance ? parseFloat(user.balance.toString()).toLocaleString() : 0}</div>
          </div>
        </div>
      </div>

      {/* Progress tracker */}
      <div className="mb-8">
        <div className="flex justify-between mb-2 text-sm">
          <div className={`flex flex-col items-center ${step === PurchaseStep.SELECT_PACKAGE ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 
              ${step === PurchaseStep.SELECT_PACKAGE ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              1
            </div>
            <span>Select Package</span>
          </div>
          <div className={`flex flex-col items-center ${step === PurchaseStep.CHECKOUT ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1
              ${step === PurchaseStep.CHECKOUT ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              2
            </div>
            <span>Payment</span>
          </div>
          <div className={`flex flex-col items-center ${step === PurchaseStep.SUCCESS ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1
              ${step === PurchaseStep.SUCCESS ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              3
            </div>
            <span>Confirmation</span>
          </div>
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>
      
      {/* Page title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">
          {step === PurchaseStep.SELECT_PACKAGE && "Choose a Coin Package"}
          {step === PurchaseStep.CHECKOUT && "Secure Checkout"}
          {step === PurchaseStep.SUCCESS && "Purchase Complete!"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {step === PurchaseStep.SELECT_PACKAGE && "Select the coin package that best suits your needs"}
          {step === PurchaseStep.CHECKOUT && "Your payment is processed securely through Stripe"}
          {step === PurchaseStep.SUCCESS && "Your coins have been added to your account"}
        </p>
      </div>

      {/* Main content card */}
      <Card className="border shadow-md bg-card mb-8">
        <CardContent className="p-6 md:p-8">
          {step === PurchaseStep.SELECT_PACKAGE && (
            <>
              <Alert className="mb-6 bg-blue-500/10 text-blue-500 border-blue-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Get More, Pay Less</AlertTitle>
                <AlertDescription>
                  Our larger packages offer better value with discounts up to 25%!
                </AlertDescription>
              </Alert>
              
              <CoinPackages onSelectPackage={setSelectedPackageId} />
              
              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleContinue}
                  disabled={!selectedPackageId}
                  className="sm:ml-2"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Continue to Payment
                </Button>
              </div>
            </>
          )}

          {step === PurchaseStep.CHECKOUT && selectedPackageId && (
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-between mb-6">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep(PurchaseStep.SELECT_PACKAGE)}
                  className="text-muted-foreground hover:text-foreground p-0"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to packages
                </Button>
              </div>

              <Checkout
                packageId={selectedPackageId}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </div>
          )}

          {step === PurchaseStep.SUCCESS && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="mb-8 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-4">
                  <Check className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-green-500 mb-2">Thank You for Your Purchase!</h2>
                <p className="text-muted-foreground">
                  Your coins have been successfully added to your account balance.
                </p>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-6 mb-8 inline-block">
                <div className="flex items-center justify-center mb-2">
                  <Coins className="h-6 w-6 text-yellow-500 mr-2" />
                  <span className="text-xl font-semibold">Balance Updated</span>
                </div>
                <p className="text-3xl font-bold">
                  {user?.balance ? parseFloat(user.balance.toString()).toLocaleString() : 0} coins
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/')}
                  className="sm:px-8"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Start Playing
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => setStep(PurchaseStep.SELECT_PACKAGE)}
                  className="sm:px-8"
                >
                  <Coins className="mr-2 h-4 w-4" />
                  Buy More Coins
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer information */}
      <Card className="border shadow-sm mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Important Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">About Virtual Currency</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Coins are virtual currency used only within this platform</li>
                <li>Virtual currency has no real-world value or exchange rate</li>
                <li>All purchases are final and non-refundable</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Support & Security</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Purchases are securely processed through Stripe</li>
                <li>Coins are added to your account immediately after payment</li>
                <li>For any issues, please contact our customer support team</li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0 text-xs text-muted-foreground">
          By making a purchase, you agree to our <a href="/terms-of-service" className="text-primary hover:underline">Terms of Service</a> and <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>.
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ProtectedPurchasePage() {
  return <ProtectedRoute path="/purchase" component={PurchasePage} />;
}