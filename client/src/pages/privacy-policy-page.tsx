import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl md:text-3xl font-bold text-center">Privacy Policy</CardTitle>
          <p className="text-center text-muted-foreground mt-2">Last Updated: March 23, 2025</p>
        </CardHeader>
        
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
          <p>
            Welcome to our virtual casino platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
            We respect your privacy and are committed to protecting it through our compliance with this policy.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
          <h3 className="text-lg font-medium mb-2">2.1 Account Information</h3>
          <p>
            When you create an account, we collect basic information such as your username and password. 
            We do not collect personal identifiable information like your real name, address, or phone number.
          </p>
          
          <h3 className="text-lg font-medium mb-2">2.2 Transaction Information</h3>
          <p>
            If you choose to purchase virtual coins, payment processing is handled by Stripe, a trusted third-party payment processor. 
            We do not store your complete payment information on our servers. Please refer to Stripe's privacy policy for more information about how they handle your payment data.
          </p>
          
          <h3 className="text-lg font-medium mb-2">2.3 Usage Information</h3>
          <p>
            We collect information about your interactions with our application, such as game play statistics, virtual currency balances, and feature usage.
            This information is used to improve your gaming experience and our services.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Provide, maintain, and improve our services</li>
            <li>Process your transactions for virtual coins</li>
            <li>Track your virtual currency balance and transaction history</li>
            <li>Monitor and analyze usage patterns and trends</li>
            <li>Prevent fraudulent activities and ensure security</li>
            <li>Communicate with you about your account or our services</li>
          </ul>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">4. Disclosure of Your Information</h2>
          <p>We do not sell, trade, or otherwise transfer your information to third parties. However, we may disclose information in the following situations:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>To service providers who perform services on our behalf (like payment processing)</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights, property, or safety, and that of our users</li>
          </ul>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your information against unauthorized access, theft, and loss.
            However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">6. Children's Privacy</h2>
          <p>
            Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18.
            If you believe we have collected information from a child under 18, please contact us immediately.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">7. Changes to Our Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            You are advised to review this Privacy Policy periodically for any changes.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy, please contact us at:
            <br />
            <a href="mailto:support@virtualcasino.example" className="text-primary hover:underline">support@virtualcasino.example</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}