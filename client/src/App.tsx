import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { BanNotification } from "@/components/ban-notification";
import { HelmetProvider } from 'react-helmet-async';
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import SlotsPage from "@/pages/slots-page";
import DicePage from "@/pages/dice-page";
import CrashPage from "@/pages/crash-page";
import RoulettePage from "@/pages/roulette-page";
import BlackjackPage from "@/pages/blackjack-page";
import PlinkoPage from "@/pages/plinko-page";
import AdminPage from "@/pages/admin-page";
import HistoryPage from "@/pages/history-page";
import PurchasePage from "@/pages/purchase-page";
import RewardsPage from "@/pages/rewards-page";
import SubscriptionPage from "@/pages/subscription-page";
import SupportPage from "@/pages/support-page";
import PrivacyPolicyPage from "@/pages/privacy-policy-page";
import TermsOfServicePage from "@/pages/terms-of-service-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/slots" component={SlotsPage} />
      <ProtectedRoute path="/dice" component={DicePage} />
      <ProtectedRoute path="/crash" component={CrashPage} />
      <ProtectedRoute path="/roulette" component={RoulettePage} />
      <ProtectedRoute path="/blackjack" component={BlackjackPage} />
      <ProtectedRoute path="/plinko" component={PlinkoPage} />
      <ProtectedRoute path="/history" component={HistoryPage} />
      <ProtectedRoute path="/purchase" component={PurchasePage} />
      <ProtectedRoute path="/rewards" component={RewardsPage} />
      <ProtectedRoute path="/subscriptions" component={SubscriptionPage} />
      <ProtectedRoute path="/support" component={SupportPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <AuthProvider>
          <BanNotification />
          <Router />
          <Toaster />
        </AuthProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
