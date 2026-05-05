import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Plus, Save } from 'lucide-react';
import { SectionCard } from '@/components/layout/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_LABELS } from '@/types/society';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const PAGES = [
  ['dashboard', 'Dashboard'],
  ['residents', 'Residents'],
  ['maintenance', 'Maintenance'],
  ['expenses', 'Expenses'],
  ['notices', 'Notices'],
  ['complaints', 'Complaints'],
  ['society_management', 'Society Management'],
] as const;

const BASE_ROLES = ['president', 'vice_president', 'treasury_head', 'secretary', 'supervisor', 'coordinator', 'resident', 'helper'];

type Row = { id?: string; role: string; page_key: string; can_read: boolean; can_write: boolean };

const RolePermissionsCard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [roles, setRoles] = useState<string[]>(BASE_ROLES);
  const [newRole, setNewRole] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchRows = async () => {
    const { data } = await supabase.from('role_page_permissions').select('id,role,page_key,can_read,can_write').neq('role', 'master_admin');
    const nextRows = (data || []) as Row[];
    setRows(nextRows);
    setRoles(Array.from(new Set([...BASE_ROLES, ...nextRows.map((r) => r.role)])));
  };

  useEffect(() => {
    void fetchRows();
    const channel = supabase.channel('permissions-card-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_page_permissions' }, () => { void fetchRows(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const byKey = useMemo(() => new Map(rows.map((r) => [`${r.role}:${r.page_key}`, r])), [rows]);

  const updatePermission = async (role: string, page: string, field: 'can_read' | 'can_write', value: boolean) => {
    const existing = byKey.get(`${role}:${page}`);
    const next = {
      role: role as any,
      page_key: page,
      allowed: field === 'can_read' ? value : (existing?.can_read ?? true),
      can_read: field === 'can_read' ? value : (existing?.can_read ?? true),
      can_write: field === 'can_write' ? value : (existing?.can_write ?? false),
      updated_by: user?.id ?? null,
    };
    if (field === 'can_write' && value) next.can_read = true;
    setSavingKey(`${role}:${page}:${field}`);
    const { error } = await supabase.from('role_page_permissions').upsert(next, { onConflict: 'role,page_key' });
    setSavingKey(null);
    if (error) { toast.error(error.message); return; }
    toast.success(t('permission_updated'));
    void fetchRows();
  };

  const addRole = async () => {
    const role = newRole.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!role || role === 'master_admin') { toast.error('Use a valid non-master role name'); return; }
    const { error } = await supabase.rpc('add_custom_role' as any, { _role_name: role });
    if (error) { toast.error(error.message); return; }
    for (const [page] of PAGES) {
      await supabase.from('role_page_permissions').upsert({ role: role as any, page_key: page, allowed: false, can_read: false, can_write: false, updated_by: user?.id ?? null }, { onConflict: 'role,page_key' });
    }
    setNewRole('');
    toast.success(t('role_added'));
    void fetchRows();
  };

  return (
    <SectionCard className="py-4 mt-6 border-primary/20 bg-primary/5">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <h3 className="text-lg font-bold font-display">{t('permission_matrix')}</h3>
            <p className="text-sm text-muted-foreground">{t('permission_matrix_desc')}</p>
            <Badge variant="outline" className="mt-2">{t('master_admin_unrestricted')}</Badge>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder={t('new_role_placeholder')} className="h-9" />
          <Button onClick={addRole} size="sm" className="h-9 shrink-0"><Plus className="h-4 w-4 mr-1" />{t('add_role')}</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="text-left p-3 min-w-40">{t('role')}</th>
              {PAGES.map(([, label]) => <th key={label} className="p-3 min-w-36 text-center">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {roles.filter((r) => r !== 'master_admin').map((role) => (
              <tr key={role} className="border-t align-top">
                <td className="p-3 font-medium">{ROLE_LABELS[role] || role}</td>
                {PAGES.map(([page]) => {
                  const row = byKey.get(`${role}:${page}`);
                  const read = row?.can_read ?? false;
                  const write = row?.can_write ?? false;
                  return (
                    <td key={page} className="p-3">
                      <div className="flex flex-col items-center gap-2">
                        <Label className="flex items-center gap-2 text-xs font-normal"><Switch checked={read} disabled={savingKey === `${role}:${page}:can_read`} onCheckedChange={(v) => updatePermission(role, page, 'can_read', v)} />{t('view')}</Label>
                        <Label className="flex items-center gap-2 text-xs font-normal"><Switch checked={write} disabled={savingKey === `${role}:${page}:can_write`} onCheckedChange={(v) => updatePermission(role, page, 'can_write', v)} />{t('write')}</Label>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Save className="h-3.5 w-3.5" />{t('permission_live_note')}</div>
    </SectionCard>
  );
};

export default RolePermissionsCard;
