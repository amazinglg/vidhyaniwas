import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const ADMIN_ROLES: string[] = ['master_admin', 'president', 'vice_president', 'treasury_head', 'secretary'];
const SUPERVISOR_ROLE = 'supervisor';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isMasterAdmin: boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  isSupervisor: boolean;
  isResident: boolean;
  profileId: string | null;
  residentId: string | null;
  isApproved: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
  isMasterAdmin: false,
  isAdmin: false,
  isCoordinator: false,
  isSupervisor: false,
  isResident: false,
  profileId: null,
  residentId: null,
  isApproved: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [residentId, setResidentId] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    
    setUserRole(data?.role as AppRole ?? null);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, resident_id, is_approved')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      setProfileId(data.id);
      setResidentId(data.resident_id);
      setIsApproved(data.is_approved ?? true);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setProfileId(null);
          setResidentId(null);
          setIsApproved(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserRole(null);
    setProfileId(null);
    setResidentId(null);
    setIsApproved(false);
  };

  const isMasterAdmin = userRole === 'master_admin';
  const isAdmin = userRole ? ADMIN_ROLES.includes(userRole) : false;
  const isCoordinator = userRole === 'coordinator';
  const isSupervisor = userRole === SUPERVISOR_ROLE;
  const isResident = userRole === 'resident' || (!userRole && !!session);

  return (
    <AuthContext.Provider value={{ session, user, userRole, loading, signOut, isMasterAdmin, isAdmin, isCoordinator, isSupervisor, isResident, profileId, residentId, isApproved }}>
      {children}
    </AuthContext.Provider>
  );
};
