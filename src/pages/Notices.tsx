import { useState, useEffect } from 'react';
import { Plus, Megaphone, Trash2, Bell, Pencil, FileText, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useNotices } from '@/hooks/useSocietyData';
import { useAuth } from '@/contexts/AuthContext';
import { triggerPush } from '@/lib/triggerPush';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUnreadNotices } from '@/hooks/useUnreadNotices';
import { PageHeader, SectionCard } from '@/components/layout/PagePrimitives';

const priorityStyles: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/10 text-info border-info/20',
  high: 'gradient-warm text-primary-foreground',
  urgent: 'bg-destructive text-destructive-foreground',
};

type EditingNotice = {
  id?: string;
  title: string;
  content: string;
  priority: string;
  is_draft?: boolean;
  audience_type?: string;
  audience_user_ids?: string[];
};

const emptyForm: EditingNotice = { title: '', content: '', priority: 'medium' };

const Notices = () => {
  const { data: notices = [], isLoading } = useNotices();
  const { isAdmin, user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { markAllRead } = useUnreadNotices();

  useEffect(() => { markAllRead(); }, [markAllRead, notices.length]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditingNotice>(emptyForm);
  const [sendTo, setSendTo] = useState('all');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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

  const resetForm = () => {
    setForm(emptyForm);
    setSendTo('all');
    setSelectedUserIds([]);
    setEditingId(null);
    setUserSearch('');
    setUserRoleFilter('all');
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (n: any) => {
    setForm({
      id: n.id,
      title: n.title,
      content: n.content,
      priority: n.priority,
      is_draft: n.is_draft,
    });
    setEditingId(n.id);
    setSendTo(n.audience_type || 'all');
    setSelectedUserIds(n.audience_user_ids || []);
    setDialogOpen(true);
  };

  const persist = async (asDraft: boolean) => {
    if (!form.title || !form.content) { toast.error(t('please_fill_required')); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        content: form.content,
        priority: form.priority,
        is_draft: asDraft,
        audience_type: sendTo,
        audience_user_ids: sendTo === 'specific' ? selectedUserIds : [],
      };

      let noticeId = editingId;
      const wasDraft = form.is_draft ?? false;

      if (editingId) {
        const { error } = await supabase.from('notices').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('notices').insert(payload).select().single();
        if (error) throw error;
        noticeId = data.id;
      }

      // Only fan out push + create notifications row when publishing (not for drafts)
      const isNewlyPublished = !asDraft && (!editingId || wasDraft);
      if (isNewlyPublished && noticeId) {
        // Reset existing notifications row(s) to reflect latest audience
        await supabase.from('notifications').delete().eq('notice_id', noticeId);
        await supabase.from('notifications').insert({
          notice_id: noticeId,
          target_type: sendTo,
          target_user_ids: sendTo === 'specific' ? selectedUserIds : [],
        });

        const audience =
          sendTo === 'admins' ? { kind: 'admins' as const } :
          sendTo === 'specific' ? { kind: 'users' as const, userIds: selectedUserIds } :
          { kind: 'all' as const };
        void triggerPush({
          title: `Notice: ${form.title}`,
          body: form.content.substring(0, 150),
          url: '/notices',
          tag: `notice-${noticeId}`,
          audience,
          excludeUserId: user?.id,
        });
      } else if (!asDraft && editingId && !wasDraft) {
        // Edited an already-published notice → keep notifications row in sync with new audience
        await supabase.from('notifications').delete().eq('notice_id', editingId);
        await supabase.from('notifications').insert({
          notice_id: editingId,
          target_type: sendTo,
          target_user_ids: sendTo === 'specific' ? selectedUserIds : [],
        });
      }

      queryClient.invalidateQueries({ queryKey: ['notices'] });
      setDialogOpen(false);
      resetForm();
      toast.success(asDraft ? 'Draft saved' : (editingId && !wasDraft ? 'Notice updated' : t('notice_published')));
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['notices'] });
    toast.success(t('notice_deleted'));
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-3xl mx-auto">
      <PageHeader
        icon={Megaphone}
        title={t('notices')}
        subtitle={t('stay_updated')}
        action={isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openNew} size="sm" className="gradient-warm text-primary-foreground shrink-0 h-9 px-2 sm:px-3">
                <Plus className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">{t('new_notice')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingId ? (form.is_draft ? 'Edit draft' : 'Edit notice') : t('create_notice')}
                </DialogTitle>
              </DialogHeader>
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
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Search name / mobile / house"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="h-9 text-sm col-span-2"
                      />
                      <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                        <SelectTrigger className="h-9 text-sm col-span-2"><SelectValue placeholder="All roles" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All roles</SelectItem>
                          <SelectItem value="master_admin">Master Admin</SelectItem>
                          <SelectItem value="president">President</SelectItem>
                          <SelectItem value="vice_president">Vice President</SelectItem>
                          <SelectItem value="treasury_head">Treasury Head</SelectItem>
                          <SelectItem value="secretary">Secretary</SelectItem>
                          <SelectItem value="coordinator">Coordinator</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="resident">Resident</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(() => {
                      const q = userSearch.trim().toLowerCase();
                      const filtered = allUsers.filter(u => {
                        const matchesRole = userRoleFilter === 'all' || userRoles[u.user_id] === userRoleFilter;
                        if (!matchesRole) return false;
                        if (!q) return true;
                        return (u.full_name || '').toLowerCase().includes(q)
                          || (u.mobile || '').toLowerCase().includes(q)
                          || (u.house_no || '').toLowerCase().includes(q);
                      });
                      return (
                        <>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{filtered.length} matches • {selectedUserIds.length} selected</span>
                            <button type="button" className="underline" onClick={() => setSelectedUserIds(filtered.map(u => u.user_id))}>Select all visible</button>
                          </div>
                          <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                            {filtered.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">No users match</p>
                            ) : filtered.map(u => (
                              <label key={u.user_id} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer text-sm">
                                <Checkbox checked={selectedUserIds.includes(u.user_id)} onCheckedChange={() => toggleUser(u.user_id)} />
                                <span className="flex-1 truncate">{u.full_name || u.mobile} {u.house_no && <span className="text-xs text-muted-foreground">· {u.house_no}</span>}</span>
                              </label>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    onClick={() => persist(true)}
                    disabled={saving}
                    variant="outline"
                  >
                    <FileText className="h-4 w-4 mr-2" /> Save draft
                  </Button>
                  <Button
                    onClick={() => persist(false)}
                    disabled={saving}
                    className="gradient-warm text-primary-foreground"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {editingId && !form.is_draft ? 'Update' : 'Send'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="grid gap-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t('loading')}</p>
        ) : notices.length === 0 ? (
          <SectionCard className="p-8 text-center text-muted-foreground">{t('no_notices')}</SectionCard>
        ) : notices.map((n: any) => (
          <SectionCard key={n.id} className={`py-3 hover:shadow-md transition-all animate-fade-in border-l-4 ${n.is_draft ? 'border-l-muted-foreground opacity-80' : 'border-l-primary'}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow ${n.is_draft ? 'bg-muted' : 'gradient-warm'}`}>
                {n.is_draft
                  ? <FileText className="h-5 w-5 text-muted-foreground" />
                  : <Megaphone className="h-5 w-5 text-primary-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold font-display text-foreground">{n.title}</h3>
                  <Badge className={priorityStyles[n.priority] || 'bg-muted'}>{t(n.priority)}</Badge>
                  {n.is_draft && <Badge variant="outline">Draft</Badge>}
                  {!n.is_draft && isAdmin && n.audience_type && (
                    <Badge variant="outline" className="text-xs">
                      {n.audience_type === 'all' ? 'All' : n.audience_type === 'admins' ? 'Admins' : `${(n.audience_user_ids || []).length} users`}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.content}</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(n)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
};

export default Notices;
