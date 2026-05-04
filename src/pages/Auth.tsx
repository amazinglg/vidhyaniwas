import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Phone, Lock, User, Home, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import buildingBg from '@/assets/building-bg.jpg';

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ mobile: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    password: '', fullName: '', mobile: '',
    house_no: '', lane_no: '', resident_type: 'owner',
    owner_mobile: '',
  });
  const [ownerInfo, setOwnerInfo] = useState<{ name: string; house_no: string; lane_no: string } | null>(null);
  const [ownerError, setOwnerError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Account lockout check (defensive — ignore if RPC unavailable)
    try {
      const { data: locked } = await supabase.rpc('is_mobile_locked' as any, { _mobile: loginForm.mobile });
      if (locked) {
        toast.error('Too many failed attempts. Account is temporarily locked. Please contact a Master Admin to reset your password.');
        setLoading(false);
        return;
      }
    } catch {}


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
      await supabase.rpc('record_login_attempt' as any, { _mobile: loginForm.mobile, _success: false });
      toast.error(error.message);
    } else {
      await supabase.rpc('record_login_attempt' as any, { _mobile: loginForm.mobile, _success: true });
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

  // For tenant/family: lookup owner by mobile and auto-fill house/lane
  const lookupOwnerByMobile = async (ownerMobile: string) => {
    if (!ownerMobile || ownerMobile.length < 8) {
      setOwnerInfo(null);
      setOwnerError('');
      return;
    }
    setLookingUp(true);
    setOwnerError('');
    const { data, error } = await supabase.rpc('signup_lookup_owner', { _owner_mobile: ownerMobile });
    setLookingUp(false);
    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      setOwnerInfo(null);
      setOwnerError("No registered house owner found with this mobile number. Please ask your house owner to sign up first.");
      return;
    }
    const owner = Array.isArray(data) ? data[0] : data;
    setOwnerInfo({ name: owner.owner_name, house_no: owner.house_no, lane_no: owner.lane_no });
    setSignupForm(prev => ({ ...prev, house_no: owner.house_no, lane_no: owner.lane_no }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.mobile) {
      toast.error('Please fill all required fields');
      return;
    }

    // Owner: needs house & lane
    if (signupForm.resident_type === 'owner' && (!signupForm.house_no || !signupForm.lane_no)) {
      toast.error('Please fill house number and lane number');
      return;
    }

    // Family/Tenant: needs owner_mobile + matched owner
    if (signupForm.resident_type !== 'owner') {
      if (!signupForm.owner_mobile) {
        toast.error("Please enter your house owner's mobile number");
        return;
      }
      if (!ownerInfo) {
        toast.error("House owner not found. Please verify the owner's mobile number.");
        return;
      }
    }

    setLoading(true);

    let ownerId: string | null = null;
    if (signupForm.resident_type !== 'owner' && ownerInfo) {
      // Re-fetch the owner id
      const { data } = await supabase.rpc('signup_lookup_owner', { _owner_mobile: signupForm.owner_mobile });
      const owner = Array.isArray(data) ? data[0] : data;
      ownerId = owner?.owner_id || null;
      if (!ownerId) {
        toast.error('Could not link to house owner. Please try again.');
        setLoading(false);
        return;
      }
    }

    if (signupForm.resident_type === 'owner') {
      const { data: existingOwners } = await supabase.from('residents').select('id')
        .eq('house_no', signupForm.house_no)
        .eq('lane_no', signupForm.lane_no)
        .eq('resident_type', 'owner')
        .eq('is_active', true);
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
                  <Select value={signupForm.resident_type} onValueChange={(v) => {
                    setSignupForm({ ...signupForm, resident_type: v, owner_mobile: '', house_no: v === 'owner' ? signupForm.house_no : '', lane_no: v === 'owner' ? signupForm.lane_no : '' });
                    setOwnerError('');
                    setOwnerInfo(null);
                  }}>
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

                {signupForm.resident_type === 'owner' ? (
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
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label className="font-medium">House Owner's Mobile *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-10"
                          value={signupForm.owner_mobile}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSignupForm({ ...signupForm, owner_mobile: v });
                            setOwnerInfo(null);
                            setOwnerError('');
                          }}
                          onBlur={() => lookupOwnerByMobile(signupForm.owner_mobile)}
                          placeholder="Enter house owner's registered mobile"
                          required
                        />
                      </div>
                      {lookingUp && <p className="text-xs text-muted-foreground">Looking up owner…</p>}
                      {ownerInfo && (
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs">
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <span className="text-green-700 dark:text-green-300">
                            Owner: <strong>{ownerInfo.name}</strong> • House {ownerInfo.house_no} • Lane {ownerInfo.lane_no}
                          </span>
                        </div>
                      )}
                      {ownerError && (
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <span className="text-amber-700 dark:text-amber-300">{ownerError}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="grid gap-2">
                  <Label className="font-medium">Your Mobile Number *</Label>
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
                <Button type="submit" className="w-full h-11 gradient-warm text-primary-foreground font-semibold text-base shadow-lg" disabled={loading || (signupForm.resident_type !== 'owner' && !ownerInfo)}>
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
