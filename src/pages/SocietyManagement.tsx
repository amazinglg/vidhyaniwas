import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Users, UserCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const SocietyManagement = () => {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [members, setMembers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', role_title: '', photo_url: '', display_order: '0' });

  const fetchMembers = async () => {
    const { data } = await supabase.from('society_management').select('*').order('display_order');
    setMembers(data || []);
  };

  useEffect(() => {
    fetchMembers();
    const channel = supabase.channel('society-mgmt-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'society_management' }, () => { fetchMembers(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', role_title: '', photo_url: '', display_order: String(members.length) });
    setDialogOpen(true);
  };

  const openEdit = (m: any) => {
    setEditingId(m.id);
    setForm({ name: m.name, role_title: m.role_title, photo_url: m.photo_url || '', display_order: String(m.display_order) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.role_title) { toast.error(t('please_fill_required')); return; }
    const payload = { name: form.name, role_title: form.role_title, photo_url: form.photo_url || null, display_order: Number(form.display_order) };
    if (editingId) {
      const { error } = await supabase.from('society_management').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); return; }
      toast.success(t('update'));
    } else {
      const { error } = await supabase.from('society_management').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success(t('add'));
    }
    setDialogOpen(false);
    fetchMembers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    await supabase.from('society_management').delete().eq('id', id);
    toast.success(t('delete'));
    fetchMembers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">{t('society_management')}</h1>
          <p className="text-muted-foreground mt-1">{t('society_mgmt_desc')}</p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} className="gradient-warm text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />{t('add')}
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p>{t('no_mgmt_members')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <Card key={m.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.name} className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <UserCircle className="h-7 w-7 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold font-display">{m.name}</h3>
                  <p className="text-sm text-muted-foreground">{m.role_title}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">{editingId ? t('edit') : t('add')} {t('society_management')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>{t('name')} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>{t('role_title')} *</Label><Input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} placeholder="e.g. President, Secretary" /></div>
            <div className="grid gap-2"><Label>{t('photo_url')}</Label><Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." /></div>
            <div className="grid gap-2"><Label>{t('display_order')}</Label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></div>
            <Button onClick={handleSave} className="w-full gradient-warm text-primary-foreground">{editingId ? t('update') : t('add')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocietyManagement;
