import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PageKey =
  | 'dashboard' | 'residents' | 'maintenance' | 'expenses'
  | 'notices' | 'complaints' | 'society_management' | 'polls' | 'audit_log';

export const useRolePermissions = () => {
  const { userRole, isMasterAdmin } = useAuth();

  const { data: perms = [] } = useQuery({
    queryKey: ['role_page_permissions'],
    queryFn: async () => {
      const { data } = await supabase.from('role_page_permissions' as any).select('*');
      return (data as any[]) || [];
    },
    staleTime: 60_000,
  });

  const can = (page: PageKey) => {
    if (isMasterAdmin) return true; // master always has all access
    if (!userRole) return false;
    const row = perms.find((p: any) => p.role === userRole && p.page_key === page);
    return row ? !!row.allowed : false;
  };

  return { can, perms };
};
