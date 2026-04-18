import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Phone, Lock, User, Home, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import buildingBg from '@/assets/building-bg.jpg';

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ mobile: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    password: '', fullName: '', mobile: '', 
    house_no: '', lane_no: '', resident_type: 'owner' 
  });
  const [ownerError, setOwnerError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: email, error: lookupError } = await supabase.rpc('get_email_by_mobile', { _mobile: loginForm.mobile });
    
    if (lookupError || !email) {
      toast.error('No account found with this mobile number');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email as string,
      password: loginForm.password,
    });
    if (error) {
      toast.error(error.message);
    } else {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data: profile } = await supabase.from('profiles').select('is_approved, is_blocked').eq('user_id', session.session.user.id).maybeSingle();
        if (profile && (profile as any).is_blocked) {
          await supabase.auth.signOut();
          toast.error('Something went wrong. Please contact the admins.');
          setLoading(false);
          return;
        }
        if (profile && !profile.is_approved) {
          await supabase.auth.signOut();
          toast.error('Your signup is pending approval from Society management. Please wait for approval.');
          setLoading(false);
          return;
        }
      }
      toast.success('Welcome back!');
      navigate('/');
    }
    setLoading(false);
  };

  const validateOwnerExists = async () => {
    if (signupForm.resident_type === 'owner') {
      setOwnerError('');
      return true;
    }
    const { data: owners } = await supabase.from('residents').select('id')
      .eq('house_no', signupForm.house_no)
      .eq('lane_no', signupForm.lane_no)
      .eq('resident_type', 'owner')
      .eq('is_active', true);
    
    if (!owners || owners.length === 0) {
      setOwnerError('No house owner found for this house number and lane. House owner must be registered first.');
      return false;
    }
    setOwnerError('');
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.mobile || !signupForm.house_no || !signupForm.lane_no) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    const ownerValid = await validateOwnerExists();
    if (!ownerValid) { setLoading(false); return; }

    let ownerId: string | null = null;
    if (signupForm.resident_type !== 'owner') {
      const { data: owners } = await supabase.from('residents').select('id')
        .eq('house_no', signupForm.house_no)
        .eq('lane_no', signupForm.lane_no)
        .eq('resident_type', 'owner')
        .limit(1);
      ownerId = owners?.[0]?.id || null;
    }

    if (signupForm.resident_type === 'owner') {
      const { data: existingOwners } = await supabase.from('residents').select('id')
        .eq('house_no', signupForm.house_no)
        .eq('lane_no', signupForm.lane_no)
        .eq('resident_type', 'owner');
      if (existingOwners && existingOwners.length > 0) {
        toast.error('A house owner already exists for this house. Please sign up as a member or tenant.');
        setLoading(false);
        return;
      }
    }

    // Auto-generate email from mobile
    const autoEmail = `${signupForm.mobile}@society.local`;

    const { error } = await supabase.auth.signUp({
      email: autoEmail,
      password: signupForm.password,
      options: {
        data: {
          full_name: signupForm.fullName,
          mobile: signupForm.mobile,
          house_no: signupForm.house_no,
          lane_no: signupForm.lane_no,
          resident_type: signupForm.resident_type,
          owner_id: ownerId,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Your signup is pending approval from Society management.');
      await supabase.auth.signOut();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={buildingBg} alt="" className="w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />
      </div>

      <div className="relative z-10 flex items-center justify-center w-full p-4">
        <Card className="w-full max-w-md p-6 sm:p-8 glass border-white/20 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl gradient-warm shadow-lg mb-3">
              <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">Shri Vidhya Niwas</h1>
            <p className="text-sm text-muted-foreground mt-1">Society Management System</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" className="font-semibold">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="font-semibold">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="grid gap-2">
                  <Label className="font-medium">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" type="tel" placeholder="Enter your mobile number" value={loginForm.mobile} onChange={(e) => setLoginForm({ ...loginForm, mobile: e.target.value })} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" type="password" placeholder="Enter your password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 gradient-warm text-primary-foreground font-semibold text-base shadow-lg hover:shadow-xl transition-all" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="grid gap-2">
                  <Label className="font-medium">I am a *</Label>
                  <Select value={signupForm.resident_type} onValueChange={(v) => { setSignupForm({ ...signupForm, resident_type: v }); setOwnerError(''); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">House Owner</SelectItem>
                      <SelectItem value="member">Family Member</SelectItem>
                      <SelectItem value="tenant">Tenant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="font-medium">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" value={signupForm.fullName} onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })} placeholder="Your full name" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label className="font-medium">House No. *</Label>
                    <div className="relative">
                      <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-10" value={signupForm.house_no} onChange={(e) => setSignupForm({ ...signupForm, house_no: e.target.value })} placeholder="e.g. A-101" required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-medium">Lane No. *</Label>
                    <Input value={signupForm.lane_no} onChange={(e) => setSignupForm({ ...signupForm, lane_no: e.target.value })} placeholder="e.g. 1" required />
                  </div>
                </div>
                {signupForm.resident_type !== 'owner' && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-amber-700 dark:text-amber-300">Enter the correct House No. & Lane No. — you cannot change these later. House owner must be registered first.</span>
                  </div>
                )}
                {ownerError && (
                  <p className="text-xs text-destructive font-medium">{ownerError}</p>
                )}
                <div className="grid gap-2">
                  <Label className="font-medium">Mobile Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" value={signupForm.mobile} onChange={(e) => setSignupForm({ ...signupForm, mobile: e.target.value })} placeholder="10-digit mobile" required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="font-medium">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" type="password" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} placeholder="Min 6 characters" required minLength={6} />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 gradient-warm text-primary-foreground font-semibold text-base shadow-lg" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Your signup will be reviewed by Society management before you can log in.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
