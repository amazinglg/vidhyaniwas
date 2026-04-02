import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const ADMIN_ROLES: AppRole[] = ['master_admin', 'president', 'vice_president', 'supervisor'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isMasterAdmin: boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  isResident: boolean;
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
  isResident: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    
    setUserRole(data?.role as AppRole ?? null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchUserRole(session.user.id), 0);
        } else {
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
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
  };

  const isMasterAdmin = userRole === 'master_admin';
  const isAdmin = userRole ? ADMIN_ROLES.includes(userRole) : false;
  const isCoordinator = userRole === 'coordinator';
  const isResident = userRole === 'resident' || (!userRole && !!session);

  return (
    <AuthContext.Provider value={{ session, user, userRole, loading, signOut, isMasterAdmin, isAdmin, isCoordinator, isResident }}>
      {children}
    </AuthContext.Provider>
  );
};
