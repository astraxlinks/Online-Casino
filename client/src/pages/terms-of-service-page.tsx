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

export default function TermsOfServicePage() {
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
          <CardTitle className="text-2xl md:text-3xl font-bold text-center">Terms of Service</CardTitle>
          <p className="text-center text-muted-foreground mt-2">Last Updated: March 23, 2025</p>
        </CardHeader>
        
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using our virtual casino platform, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our application.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">2. Virtual Currency</h2>
          <p>
            <strong>2.1 No Real Money Gambling:</strong> Our platform is for entertainment purposes only and does not offer real money gambling. 
            All coins and currency in our games are virtual and have no real-world monetary value.
          </p>
          <p>
            <strong>2.2 No Cash Value:</strong> Virtual coins and other in-game items have no cash value and cannot be exchanged for real money, 
            goods, or services outside of our application.
          </p>
          <p>
            <strong>2.3 Non-Refundable:</strong> All purchases of virtual coins are final and non-refundable except as required by applicable law.
          </p>
          <p>
            <strong>2.4 No Real-World Winnings:</strong> You cannot win real money or prizes using our platform. All winnings are virtual and confined to the application.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
          <p>
            <strong>3.1 Account Creation:</strong> You are responsible for maintaining the confidentiality of your account and password.
            You agree to accept responsibility for all activities that occur under your account.
          </p>
          <p>
            <strong>3.2 Age Restriction:</strong> You must be at least 18 years old to use our services. By using our platform, you represent and warrant that you are at least 18 years of age.
          </p>
          <p>
            <strong>3.3 Account Termination:</strong> We reserve the right to terminate or suspend your account and access to our services for any reason, including violation of these Terms.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">4. Prohibited Activities</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Use our services for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to any part of our services</li>
            <li>Cheat, hack, or manipulate games, systems, or other users</li>
            <li>Use automated scripts, bots, or other software to interact with our services</li>
            <li>Sell, trade, or transfer your account to another person</li>
            <li>Exploit bugs or glitches in our software</li>
          </ul>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
          <p>
            Our platform, including all content, features, and functionality, is owned by us and is protected by copyright, trademark, and other intellectual property laws.
            You may not reproduce, distribute, modify, create derivative works of, publicly display, or exploit our content without our permission.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">6. Disclaimer of Warranties</h2>
          <p>
            Our services are provided "as is" and "as available" without any warranties of any kind, either express or implied.
            We do not guarantee that our services will be uninterrupted, secure, or error-free.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
            including but not limited to loss of profits, data, use, or other intangible losses.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">8. Responsible Gaming</h2>
          <p>
            While our platform does not involve real money gambling, we encourage responsible gaming habits. Set time limits for your gaming sessions and remember that gaming should be for entertainment.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
          <p>
            We may update these Terms of Service from time to time. We will notify you of any changes by posting the new Terms on this page.
            Your continued use of our platform after any changes constitutes your acceptance of the new Terms.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">10. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which we operate,
            without regard to its conflict of law provisions.
          </p>
          
          <Separator className="my-6" />
          
          <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
            <br />
            <a href="mailto:support@virtualcasino.example" className="text-primary hover:underline">support@virtualcasino.example</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}