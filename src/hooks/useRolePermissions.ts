import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PageKey =
  | 'dashboard' | 'residents' | 'maintenance' | 'expenses'
  | 'notices' | 'complaints' | 'society_management' | 'polls' | 'audit_log';

export const useRolePermissions = () => {
  const { userRole, isMasterAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: perms = [] } = useQuery({
    queryKey: ['role_page_permissions'],
    queryFn: async () => {
      const { data } = await supabase.from('role_page_permissions' as any).select('*');
      return (data as any[]) || [];
    },
    staleTime: 30_000,
  });

  // Live-sync: any change to role_page_permissions instantly refreshes every client.
  useEffect(() => {
    const ch = supabase
      .channel('role_page_permissions_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_page_permissions' },
        () => qc.invalidateQueries({ queryKey: ['role_page_permissions'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

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
