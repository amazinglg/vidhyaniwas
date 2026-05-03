import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/components/layout/PagePrimitives';
import { toast } from 'sonner';
import { Shield, Plus, Eye, Pencil } from 'lucide-react';

const DEFAULT_ROLES = ['president', 'vice_president', 'treasury_head', 'secretary', 'supervisor', 'coordinator', 'resident'];
const PAGES = ['dashboard', 'residents', 'maintenance', 'expenses', 'notices', 'complaints', 'society_management', 'polls'];

const RolePermissionsCard = () => {
  const [perms, setPerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRole, setNewRole] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('role_page_permissions' as any).select('*');
    setPerms((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Discover roles from existing rows + defaults — exclude master_admin (always full access)
  const allRoles = Array.from(new Set([...DEFAULT_ROLES, ...perms.map((p: any) => p.role)]))
    .filter((r) => r !== 'master_admin');

  const getRow = (role: string, page: string) =>
    perms.find((p: any) => p.role === role && p.page_key === page);

  const isOn = (role: string, page: string, field: 'can_read' | 'can_write') => {
    const row = getRow(role, page);
    if (!row) return false;
    if (field === 'can_read' && row.can_read === undefined) return !!row.allowed;
    return !!row[field];
  };

  const toggle = async (role: string, page: string, field: 'can_read' | 'can_write') => {
    const row = getRow(role, page);
    const current = isOn(role, page, field);
    const otherField = field === 'can_read' ? 'can_write' : 'can_read';
    const otherVal = row ? !!row[otherField] : false;

    const payload: any = {
      [field]: !current,
      [otherField]: otherVal,
      allowed: field === 'can_read' ? !current : (row ? !!row.can_read : false),
    };
    // Auto-disable write if read is turned off
    if (field === 'can_read' && !(!current)) {
      payload.can_write = false;
    }

    if (row) {
      await supabase.from('role_page_permissions' as any).update(payload).eq('id', row.id);
    } else {
      await supabase.from('role_page_permissions' as any).insert({ role, page_key: page, ...payload });
    }
    load();
  };

  const addRole = async () => {
    const name = newRole.trim().toLowerCase().replace(/\s+/g, '_');
    if (!/^[a-z][a-z0-9_]{1,30}$/.test(name)) {
      toast.error('Use lowercase letters, digits, underscores (2-31 chars)');
      return;
    }
    setAdding(true);
    const { error } = await supabase.rpc('add_custom_role' as any, { _role_name: name });
    if (error) {
      toast.error(error.message);
      setAdding(false);
      return;
    }
    // Seed default rows so the role appears in the matrix
    const seed = PAGES.map(p => ({ role: name, page_key: p, can_read: false, can_write: false, allowed: false }));
    await supabase.from('role_page_permissions' as any).insert(seed);
    toast.success(`Role "${name}" created and synced`);
    setNewRole('');
    setAdding(false);
    load();
  };

  if (loading) return <SectionCard>Loading…</SectionCard>;

  return (
    <SectionCard>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-display font-bold">Role Page Permissions</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        <Eye className="inline h-3 w-3" /> = view page, <Pencil className="inline h-3 w-3" /> = create/edit/delete. Master Admin always has full access.
      </p>

      <div className="flex gap-2 mb-4 p-3 rounded-lg bg-muted/40 border border-border">
        <Input
          placeholder="new_role_name"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="text-sm"
        />
        <Button size="sm" onClick={addRole} disabled={adding || !newRole.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Add Role
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-3 sticky left-0 bg-card">Role</th>
              {PAGES.map(p => (
                <th key={p} className="text-center px-2 py-2 capitalize text-xs whitespace-nowrap">
                  {p.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRoles.map(role => (
              <tr key={role} className="border-b border-border">
                <td className="py-2 pr-3 font-medium capitalize sticky left-0 bg-card whitespace-nowrap">
                  {role.replace(/_/g, ' ')}
                </td>
                {PAGES.map(page => {
                  const r = isOn(role, page, 'can_read');
                  const w = isOn(role, page, 'can_write');
                  return (
                    <td key={page} className="text-center px-2 py-2">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-1.5" title="View">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <Switch checked={r} onCheckedChange={() => toggle(role, page, 'can_read')} />
                        </div>
                        <div className="flex items-center gap-1.5" title="Edit">
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                          <Switch checked={w} disabled={!r} onCheckedChange={() => toggle(role, page, 'can_write')} />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
};

export default RolePermissionsCard;
