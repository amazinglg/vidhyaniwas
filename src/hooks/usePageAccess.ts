import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PageKey = 'dashboard' | 'residents' | 'maintenance' | 'expenses' | 'notices' | 'complaints' | 'society_management';

type PermissionRow = { role: string; page_key: string; can_read: boolean; can_write: boolean };

const ADMIN_FALLBACK = new Set(['dashboard', 'residents', 'maintenance', 'expenses', 'notices', 'complaints', 'society_management']);
const SUPERVISOR_FALLBACK = new Set(['complaints', 'notices', 'society_management']);
const COORDINATOR_FALLBACK = new Set(['residents', 'notices', 'society_management']);
const RESIDENT_FALLBACK = new Set(['residents', 'maintenance', 'expenses', 'notices', 'society_management']);

const fallbackRead = (role: string | null, page: string) => {
  if (role === 'master_admin') return true;
  if (role && ['president', 'vice_president', 'treasury_head', 'secretary'].includes(role)) return ADMIN_FALLBACK.has(page);
  if (role === 'supervisor') return SUPERVISOR_FALLBACK.has(page);
  if (role === 'coordinator') return COORDINATOR_FALLBACK.has(page);
  return RESIDENT_FALLBACK.has(page);
};

const fallbackWrite = (role: string | null, page: string) => {
  if (role === 'master_admin') return true;
  if (role && ['president', 'vice_president', 'treasury_head', 'secretary'].includes(role)) return ADMIN_FALLBACK.has(page);
  return role === 'supervisor' && page === 'complaints';
};

export const usePermissionRows = () => {
  const { userRole, isMasterAdmin, session } = useAuth();
  const [rows, setRows] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    if (!session) { setRows([]); setLoading(false); return; }
    const { data } = await supabase.from('role_page_permissions').select('role,page_key,can_read,can_write');
    setRows((data || []) as PermissionRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchRows();
    const channel = supabase.channel('role-permissions-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_page_permissions' }, () => { void fetchRows(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  return { rows, loading, isMasterAdmin, userRole };
};

export const usePageAccess = (page: PageKey) => {
  const { rows, loading, isMasterAdmin, userRole } = usePermissionRows();
  return useMemo(() => {
    if (isMasterAdmin) return { canRead: true, canWrite: true, loading };
    const row = rows.find((r) => r.role === userRole && r.page_key === page);
    return {
      canRead: row ? row.can_read : fallbackRead(userRole, page),
      canWrite: row ? row.can_write : fallbackWrite(userRole, page),
      loading,
    };
  }, [isMasterAdmin, loading, page, rows, userRole]);
};
