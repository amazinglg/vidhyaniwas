import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Users, UserCircle, Phone, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { PageHeader, SectionCard } from '@/components/layout/PagePrimitives';

const SocietyManagement = () => {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [members, setMembers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', role_title: '', photo_url: '', mobile: '', display_order: '0' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setForm({ name: '', role_title: '', photo_url: '', mobile: '', display_order: String(members.length) });
    setDialogOpen(true);
  };

  const openEdit = (m: any) => {
    setEditingId(m.id);
    setForm({ name: m.name, role_title: m.role_title, photo_url: m.photo_url || '', mobile: m.mobile || '', display_order: String(m.display_order) });
    setDialogOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `society-mgmt/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(fileName, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
    setForm({ ...form, photo_url: urlData.publicUrl });
    setUploading(false);
    toast.success('Photo uploaded');
  };

  const handleSave = async () => {
    if (!form.name || !form.role_title) { toast.error(t('please_fill_required')); return; }
    const payload: any = { name: form.name, role_title: form.role_title, photo_url: form.photo_url || null, mobile: form.mobile || null, display_order: Number(form.display_order) };
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
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        icon={Users}
        title={t('society_management')}
        subtitle={t('society_mgmt_desc')}
        action={isAdmin && (
          <Button size="sm" onClick={openAdd} className="gradient-warm text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />{t('add')}
          </Button>
        )}
      />

      {members.length === 0 ? (
        <SectionCard className="p-8 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p>{t('no_mgmt_members')}</p>
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <SectionCard key={m.id} className="py-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.name} className="h-24 w-24 rounded-full object-cover" />
                  ) : (
                    <UserCircle className="h-12 w-12 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold font-display text-lg">{m.name}</h3>
                  <p className="text-sm text-muted-foreground">{m.role_title}</p>
                  {m.mobile && (
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                      <Phone className="h-3.5 w-3.5" />{m.mobile}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                )}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">{editingId ? t('edit') : t('add')} {t('society_management')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>{t('name')} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>{t('role_title')} *</Label><Input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} placeholder="e.g. President, Secretary" /></div>
            <div className="grid gap-2"><Label>{t('mobile')}</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>{t('photo')}</Label>
              <div className="flex items-center gap-3">
                {form.photo_url && <img src={form.photo_url} alt="" className="h-16 w-16 rounded-lg object-cover" />}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-1" />{uploading ? t('loading') : t('upload_photo')}
                </Button>
              </div>
            </div>
            <div className="grid gap-2"><Label>{t('display_order')}</Label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></div>
            <Button onClick={handleSave} className="w-full gradient-warm text-primary-foreground">{editingId ? t('update') : t('add')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocietyManagement;
