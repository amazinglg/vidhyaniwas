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
    if (isMasterAdmin) return true;
    if (!userRole) return false;
    const row = perms.find((p: any) => p.role === userRole && p.page_key === page);
    if (!row) return false;
    // Backward-compat: if can_read missing, fall back to allowed
    return row.can_read !== undefined ? !!row.can_read : !!row.allowed;
  };

  const canWrite = (page: PageKey) => {
    if (isMasterAdmin) return true;
    if (!userRole) return false;
    const row = perms.find((p: any) => p.role === userRole && p.page_key === page);
    return row ? !!row.can_write : false;
  };

  return { can, canWrite, perms };
};
