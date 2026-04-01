import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', fullName: '', mobile: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      navigate('/');
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.mobile) {
      toast.error('Mobile number is required');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        data: {
          full_name: signupForm.fullName,
          mobile: signupForm.mobile,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Please check your email to verify.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary mb-3">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display">Shri Vidhya Niwas</h1>
          <p className="text-sm text-muted-foreground">Society Management System</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>Password</Label>
                <Input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label>Full Name</Label>
                <Input value={signupForm.fullName} onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>Mobile Number *</Label>
                <Input value={signupForm.mobile} onChange={(e) => setSignupForm({ ...signupForm, mobile: e.target.value })} placeholder="10-digit mobile" required />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>Password</Label>
                <Input type="password" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Sign up with your registered mobile number to link your resident profile automatically.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
