import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Reset link sent to your email');
    setIsSubmitted(true);
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/1/13/Seal_of_Karnataka.svg" alt="KSP Logo" className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            KSP AI Crime Investigation System
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              {isSubmitted 
                ? "Check your email for the reset link" 
                : "Enter your email address and we'll send you a link to reset your password"}
            </CardDescription>
          </CardHeader>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@ksp.gov.in" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Link to="/login" className="flex items-center gap-2 text-xs text-primary hover:underline">
                  <ArrowLeft className="w-3 h-3" /> Back to Login
                </Link>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-6">
                If an account exists for {email}, you will receive a password reset link shortly.
              </p>
              <Link to="/login" className="flex items-center justify-center w-full h-10 px-4 py-2 border rounded-md hover:bg-slate-50 transition-colors">
                Return to Login
              </Link>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
