import { useState, useEffect } from 'react';
import { Plus, MessageSquareWarning, XCircle, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ComplaintImageUploader } from '@/components/ComplaintImageUploader';
import { ComplaintAttachmentsView } from '@/components/ComplaintAttachmentsView';
import { triggerPush } from '@/lib/triggerPush';
import { PageHeader, SectionCard } from '@/components/layout/PagePrimitives';

const statusColors: Record<string, string> = {
  open: 'bg-destructive text-destructive-foreground',
  in_progress: 'gradient-warm text-primary-foreground',
  pending_user_reply: 'bg-info text-info-foreground',
  resolved: 'bg-success text-success-foreground',
  withdrawn: 'bg-muted text-muted-foreground',
};

const MyComplaints = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; description: string; category: string; attachments: string[] }>({ title: '', description: '', category: 'General', attachments: [] });
  const [residentId, setResidentId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('resident_id').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data?.resident_id) setResidentId(data.resident_id);
    });
  }, [user]);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['my_complaints', residentId],
    queryFn: async () => {
      if (!residentId) return [];
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!residentId,
  });

  const handleAdd = async () => {
    if (!form.title || !residentId) {
      toast.error(residentId ? t('please_fill_required') : 'Your profile is not linked to a resident record');
      return;
    }
    const { error } = await supabase.from('complaints').insert({
      resident_id: residentId,
      title: form.title,
      description: form.description || null,
      category: form.category,
      created_by: user?.id,
      attachments: form.attachments,
    });
    if (error) { toast.error(error.message); return; }
    void triggerPush({
      title: 'New complaint raised',
      body: form.title,
      url: '/complaints',
      tag: 'new-complaint',
      audience: { kind: 'admins' },
      excludeUserId: user?.id,
    });
    queryClient.invalidateQueries({ queryKey: ['my_complaints'] });
    setDialogOpen(false);
    setForm({ title: '', description: '', category: 'General', attachments: [] });
    toast.success(t('complaint_submitted'));
  };

  const handleWithdraw = async (complaintId: string) => {
    if (!confirm(t('confirm_withdraw_complaint'))) return;
    const { error } = await supabase.from('complaints').update({ status: 'withdrawn' }).eq('id', complaintId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['my_complaints'] });
    toast.success(t('complaint_withdrawn'));
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-3xl mx-auto">
      <PageHeader
        icon={MessageSquareWarning}
        title={t('my_complaints')}
        subtitle={t('track_complaints')}
        action={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-warm text-primary-foreground"><Plus className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">{t('new_complaint')}</span></Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">{t('submit_complaint')}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label>{t('title')} *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid gap-2"><Label>{t('description')}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="grid gap-2"><Label>{t('category')}</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div className="grid gap-2">
                <Label>{t('photos_optional')}</Label>
                {user && <ComplaintImageUploader userId={user.id} value={form.attachments} onChange={(a) => setForm({ ...form, attachments: a })} max={3} />}
              </div>
              <Button onClick={handleAdd} className="w-full mt-2 gradient-warm text-primary-foreground">{t('submit')}</Button>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">{t('loading')}</p>
      ) : complaints.length === 0 ? (
        <SectionCard className="p-8 text-center text-muted-foreground">{t('no_complaints_submitted')}</SectionCard>
      ) : complaints.map((c: any) => (
        <SectionCard key={c.id} className="py-3 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
              <MessageSquareWarning className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold font-display">{c.title}</h3>
                <Badge className={statusColors[c.status] || 'bg-muted'}>{t(c.status)}</Badge>
                <Badge variant="outline">{c.category}</Badge>
              </div>
              {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
              {c.assigned_to && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  <span>{t('assigned_to')}: <span className="font-medium text-foreground">{c.assigned_to}</span></span>
                </div>
              )}
              <ComplaintAttachmentsView paths={c.attachments || []} />
              {c.admin_comment && (
                <div className="mt-3 p-3 rounded-lg bg-info/10 border border-info/20">
                  <p className="text-xs font-medium text-info mb-1">{t('admin_response')}</p>
                  <p className="text-sm">{c.admin_comment}</p>
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                {(c.status === 'open' || c.status === 'in_progress' || c.status === 'pending_user_reply') && (
                  <Button variant="outline" size="sm" onClick={() => handleWithdraw(c.id)} className="text-destructive border-destructive/30">
                    <XCircle className="h-3 w-3 mr-1" />{t('withdraw')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      ))}
    </div>
  );
};

export default MyComplaints;
