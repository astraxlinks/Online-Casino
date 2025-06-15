import { useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from '@/hooks/use-auth';

// Form schemas
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  agreeTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions",
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  
  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);
  
  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });
  
  // Register form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false,
    },
  });
  
  const onLogin = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({
      username: values.username,
      password: values.password,
    });
  };
  
  const onRegister = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate({
      username: values.username,
      email: values.email,
      password: values.password,
    });
  };
  
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col md:flex-row">
      {/* Left column - Auth forms */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-[#1E1E1E] border-[#333333]">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-heading font-bold bg-gradient-to-r from-[#5465FF] to-[#00E701] bg-clip-text text-transparent mb-2">
                RAGE BET
              </h1>
              <p className="text-gray-400">Sign in to start playing or create a new account</p>
            </div>
            
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your username" 
                              {...field} 
                              className="bg-[#2A2A2A] border-[#333333]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your password" 
                              {...field} 
                              className="bg-[#2A2A2A] border-[#333333]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-center justify-between">
                      <FormField
                        control={loginForm.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="rememberMe"
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-[#5465FF]"
                            />
                            <Label 
                              htmlFor="rememberMe" 
                              className="text-sm text-gray-400 cursor-pointer leading-none"
                            >
                              Remember me
                            </Label>
                          </div>
                        )}
                      />
                      
                      <Link href="/forgot-password" className="text-sm text-[#5465FF] hover:underline">
                        Forgot Password?
                      </Link>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[#5465FF] hover:bg-[#6677FF]"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Choose a username" 
                              {...field} 
                              className="bg-[#2A2A2A] border-[#333333]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter your email" 
                              {...field} 
                              className="bg-[#2A2A2A] border-[#333333]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Create a password" 
                              {...field} 
                              className="bg-[#2A2A2A] border-[#333333]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Confirm your password" 
                              {...field} 
                              className="bg-[#2A2A2A] border-[#333333]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="agreeTerms"
                      render={({ field }) => (
                        <div className="space-y-2">
                          <div className="flex items-start space-x-2">
                            <Checkbox 
                              id="agreeTerms"
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-[#5465FF] mt-0.5"
                            />
                            <Label 
                              htmlFor="agreeTerms" 
                              className="text-sm text-gray-400 cursor-pointer"
                            >
                              I agree to the Terms and Conditions and Privacy Policy
                            </Label>
                          </div>
                          <FormMessage className="ml-6" />
                        </div>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-[#5465FF] hover:bg-[#6677FF]"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Right column - Hero section */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-[#1E1E1E] to-[#121212] p-6 flex items-center justify-center">
        <div className="max-w-lg">
          <div className="text-center md:text-left mb-6">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Experience the Thrill of <span className="text-[#5465FF]">Rage</span> <span className="text-[#00E701]">Bet</span>
            </h2>
            <p className="text-gray-400 mb-6">
              Join thousands of players in the most exciting Rage Bet games. Play Slots, Dice, and Crash games with our virtual currency.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-[#2A2A2A] p-4 rounded-lg flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#5465FF] bg-opacity-20 flex items-center justify-center text-[#5465FF] flex-shrink-0">
                <i className="ri-shield-check-line"></i>
              </div>
              <div>
                <h3 className="font-heading font-bold mb-1">Secure Gaming</h3>
                <p className="text-gray-400 text-sm">Safe and fair games with transparent outcomes</p>
              </div>
            </div>
            
            <div className="bg-[#2A2A2A] p-4 rounded-lg flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#5465FF] bg-opacity-20 flex items-center justify-center text-[#5465FF] flex-shrink-0">
                <i className="ri-gamepad-line"></i>
              </div>
              <div>
                <h3 className="font-heading font-bold mb-1">Multiple Games</h3>
                <p className="text-gray-400 text-sm">Variety of games with different mechanics</p>
              </div>
            </div>
            
            <div className="bg-[#2A2A2A] p-4 rounded-lg flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#5465FF] bg-opacity-20 flex items-center justify-center text-[#5465FF] flex-shrink-0">
                <i className="ri-coin-line"></i>
              </div>
              <div>
                <h3 className="font-heading font-bold mb-1">Virtual Currency</h3>
                <p className="text-gray-400 text-sm">Start with 10,000 demo credits</p>
              </div>
            </div>
            
            <div className="bg-[#2A2A2A] p-4 rounded-lg flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#5465FF] bg-opacity-20 flex items-center justify-center text-[#5465FF] flex-shrink-0">
                <i className="ri-line-chart-line"></i>
              </div>
              <div>
                <h3 className="font-heading font-bold mb-1">Track Progress</h3>
                <p className="text-gray-400 text-sm">Monitor your wins and transaction history</p>
              </div>
            </div>
          </div>
          
          <div className="text-center md:text-left">
            <div className="inline-flex items-center space-x-2 text-gray-400 text-sm">
              <i className="ri-information-line"></i>
              <span>For entertainment purposes only. No real money is used.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
