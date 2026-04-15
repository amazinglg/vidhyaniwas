import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Phone, Users, IndianRupee, AlertTriangle, CheckCircle2, Clock, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { paid: 'default', partial: 'secondary', pending: 'outline', overdue: 'destructive' };
const statusIcon: Record<string, any> = { paid: CheckCircle2, partial: Clock, pending: Clock, overdue: AlertTriangle };

interface Props {
  owner: any;
  open: boolean;
  onClose: () => void;
}

const TenantModal = ({ owner, open, onClose }: Props) => {
  const { t } = useLanguage();
  const { isAdmin, isResident, isCoordinator, residentId } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [addDialog, setAddDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', mobile: '', family_members: '1' });

  const canEdit = isAdmin || (residentId === owner?.id);
  const canView = !isResident && !isCoordinator;

  const fetchTenants = async () => {
    if (!owner?.id) return;
    const { data } = await supabase.from('residents').select('*').eq('owner_id', owner.id).eq('resident_type', 'tenant');
    setTenants(data || []);
  };

  useEffect(() => {
    if (open && owner?.id) fetchTenants();
  }, [open, owner?.id]);

  const handleSave = async () => {
    if (!form.name || !form.mobile) { toast.error(t('please_fill_required')); return; }
    const payload = {
      name: form.name, mobile: form.mobile,
      family_members: Number(form.family_members),
      house_no: owner.house_no, lane_no: owner.lane_no,
      resident_type: 'tenant' as const, owner_id: owner.id,
    };
    if (editingId) {
      const { error } = await supabase.from('residents').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); return; }
      toast.success(t('resident_updated'));
    } else {
      const { error } = await supabase.from('residents').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success(t('tenant_added'));
    }
    setAddDialog(false);
    fetchTenants();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    await supabase.from('residents').delete().eq('id', id);
    toast.success(t('tenant_removed'));
    fetchTenants();
  };

  const openAdd = () => { setEditingId(null); setForm({ name: '', mobile: '', family_members: '1' }); setAddDialog(true); };
  const openEdit = (t: any) => { setEditingId(t.id); setForm({ name: t.name, mobile: t.mobile, family_members: String(t.family_members || 1) }); setAddDialog(true); };

  if (!owner) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('tenants')} - {owner.name} ({owner.house_no})
            </DialogTitle>
          </DialogHeader>

          {canEdit && (
            <Button size="sm" onClick={openAdd} className="w-fit">
              <Plus className="h-4 w-4 mr-1" />{t('add_tenant')}
            </Button>
          )}

          {tenants.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">{t('no_tenants')}</p>
          ) : (
            <div className="space-y-3">
              {tenants.map(tenant => (
                <Card key={tenant.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{tenant.mobile}</p>
                      <p className="text-xs text-muted-foreground">{t('family_members')}: {tenant.family_members || 1}</p>
                      <p className="text-xs text-muted-foreground">{t('family_members')}: {tenant.family_members || 1}</p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(tenant)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(tenant.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? t('edit_tenant') : t('add_tenant')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>{t('full_name')} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>{t('mobile')} *</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
            <div className="grid gap-2"><Label>{t('family_members')}</Label><Input type="number" value={form.family_members} onChange={(e) => setForm({ ...form, family_members: e.target.value })} min="1" /></div>
            <div className="grid gap-2"><Label>{t('family_members')}</Label><Input type="number" value={form.family_members} onChange={(e) => setForm({ ...form, family_members: e.target.value })} min="1" /></div>
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <p><span className="text-muted-foreground">{t('house_no')}:</span> <span className="font-medium">{owner.house_no}</span></p>
              <p><span className="text-muted-foreground">{t('lane_no')}:</span> <span className="font-medium">{owner.lane_no}</span></p>
            </div>
            <Button onClick={handleSave} className="w-full">{editingId ? t('update') : t('add_tenant')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TenantModal;
