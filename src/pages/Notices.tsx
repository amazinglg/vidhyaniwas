import { useState, useEffect } from 'react';
import { Plus, Megaphone, Trash2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useNotices } from '@/hooks/useSocietyData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUnreadNotices } from '@/hooks/useUnreadNotices';

const priorityStyles: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/10 text-info border-info/20',
  high: 'gradient-warm text-primary-foreground',
  urgent: 'bg-destructive text-destructive-foreground',
};

const Notices = () => {
  const { data: notices = [], isLoading } = useNotices();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { markAllRead } = useUnreadNotices();

  // Mark all notices as read when this page is opened
  useEffect(() => { markAllRead(); }, [markAllRead, notices.length]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'medium' });
  const [sendTo, setSendTo] = useState('all');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) return;
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name, mobile, house_no, lane_no').eq('is_approved', true);
      setAllUsers(data || []);
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const map: Record<string, string> = {};
      (roles || []).forEach((r: any) => { map[r.user_id] = r.role; });
      setUserRoles(map);
    };
    fetchUsers();
  }, [isAdmin]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleAdd = async () => {
    if (!form.title || !form.content) { toast.error(t('please_fill_required')); return; }
    const { data: noticeData, error } = await supabase.from('notices').insert({ title: form.title, content: form.content, priority: form.priority }).select().single();
    if (error) { toast.error(error.message); return; }

    // Create notification record
    if (noticeData) {
      await supabase.from('notifications').insert({
        notice_id: noticeData.id,
        target_type: sendTo,
        target_user_ids: sendTo === 'specific' ? selectedUserIds : [],
      });
    }

    queryClient.invalidateQueries({ queryKey: ['notices'] });
    setDialogOpen(false);
    setForm({ title: '', content: '', priority: 'medium' });
    setSendTo('all');
    setSelectedUserIds([]);
    toast.success(t('notice_published'));
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['notices'] });
    toast.success(t('notice_deleted'));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground truncate">{t('notices')}</h1>
          <p className="text-muted-foreground mt-1 text-sm truncate">{t('stay_updated')}</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gradient-warm text-primary-foreground shadow-lg shrink-0 h-9 px-2 sm:px-3"><Plus className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">{t('new_notice')}</span></Button></DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">{t('create_notice')}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>{t('title')} *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid gap-2"><Label>{t('content')} *</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} /></div>
                <div className="grid gap-2">
                  <Label>{t('priority')}</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('low')}</SelectItem>
                      <SelectItem value="medium">{t('medium')}</SelectItem>
                      <SelectItem value="high">{t('high')}</SelectItem>
                      <SelectItem value="urgent">{t('urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1"><Bell className="h-4 w-4" /> {t('send_to')}</Label>
                  <Select value={sendTo} onValueChange={setSendTo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_users')}</SelectItem>
                      <SelectItem value="admins">{t('admins_only')}</SelectItem>
                      <SelectItem value="specific">{t('specific_users')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {sendTo === 'specific' && (
                  <div className="grid gap-2">
                    <Label>{t('select_users')}</Label>
                    <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                      {allUsers.map(u => (
                        <label key={u.user_id} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer text-sm">
                          <Checkbox checked={selectedUserIds.includes(u.user_id)} onCheckedChange={() => toggleUser(u.user_id)} />
                          <span>{u.full_name || u.mobile}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <Button onClick={handleAdd} className="w-full mt-2 gradient-warm text-primary-foreground">{t('publish_notice')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t('loading')}</p>
        ) : notices.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">{t('no_notices')}</Card>
        ) : notices.map((n: any) => (
          <Card key={n.id} className="p-5 hover:shadow-md transition-all animate-fade-in border-l-4 border-l-primary">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-warm shadow">
                <Megaphone className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold font-display text-foreground">{n.title}</h3>
                  <Badge className={priorityStyles[n.priority] || 'bg-muted'}>{t(n.priority)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.content}</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Notices;
