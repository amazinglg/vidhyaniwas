import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SectionCard } from '@/components/layout/PagePrimitives';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

const ROLES = ['president', 'vice_president', 'treasury_head', 'secretary', 'supervisor', 'coordinator', 'resident'];
const PAGES = ['dashboard', 'residents', 'maintenance', 'expenses', 'notices', 'complaints', 'society_management', 'polls'];

const RolePermissionsCard = () => {
  const [perms, setPerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from('role_page_permissions' as any).select('*');
    setPerms((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const isAllowed = (role: string, page: string) => {
    const row = perms.find(p => p.role === role && p.page_key === page);
    return row ? !!row.allowed : false;
  };

  const toggle = async (role: string, page: string) => {
    const current = isAllowed(role, page);
    const row = perms.find(p => p.role === role && p.page_key === page);
    if (row) {
      await supabase.from('role_page_permissions' as any).update({ allowed: !current }).eq('id', row.id);
    } else {
      await supabase.from('role_page_permissions' as any).insert({ role, page_key: page, allowed: !current });
    }
    toast.success('Permission updated');
    load();
  };

  if (loading) return <SectionCard>Loading…</SectionCard>;

  return (
    <SectionCard>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-display font-bold">Role Page Visibility</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Control which sidebar pages each role can access. Master Admin always sees everything.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-3">Role</th>
              {PAGES.map(p => <th key={p} className="text-center px-2 py-2 capitalize text-xs">{p.replace(/_/g, ' ')}</th>)}
            </tr>
          </thead>
          <tbody>
            {ROLES.map(role => (
              <tr key={role} className="border-b border-border">
                <td className="py-2 pr-3 font-medium capitalize">{role.replace(/_/g, ' ')}</td>
                {PAGES.map(page => (
                  <td key={page} className="text-center px-2 py-2">
                    <Switch checked={isAllowed(role, page)} onCheckedChange={() => toggle(role, page)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
};

export default RolePermissionsCard;
