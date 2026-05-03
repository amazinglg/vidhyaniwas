import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, SectionCard } from '@/components/layout/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Vote, Plus, Trash2, X, Bell, Megaphone, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { triggerPush } from '@/lib/triggerPush';

const ADMIN_ROLES = ['master_admin', 'president', 'vice_president', 'treasury_head', 'secretary'];

const Polls = () => {
  const { isAdmin, user } = useAuth();
  const { t } = useLanguage();
  const [polls, setPolls] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', options: ['', ''] });
  const [sendTo, setSendTo] = useState<'all' | 'admins' | 'specific'>('all');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  const load = async () => {
    const [{ data: p }, { data: v }] = await Promise.all([
      supabase.from('polls' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('poll_votes' as any).select('*'),
    ]);
    setPolls((p as any) || []);
    setVotes((v as any) || []);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name, mobile, house_no').eq('is_approved', true);
      setAllUsers(data || []);
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const map: Record<string, string> = {};
      (roles || []).forEach((r: any) => { map[r.user_id] = r.role; });
      setUserRoles(map);
    })();
  }, [isAdmin]);

  const resetForm = () => {
    setForm({ title: '', description: '', options: ['', ''] });
    setSendTo('all');
    setSelectedUserIds([]);
    setUserSearch('');
    setUserRoleFilter('all');
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return allUsers.filter(u => {
      const matchesRole = userRoleFilter === 'all' || userRoles[u.user_id] === userRoleFilter;
      if (!matchesRole) return false;
      if (!q) return true;
      return (u.full_name || '').toLowerCase().includes(q)
        || (u.mobile || '').toLowerCase().includes(q)
        || (u.house_no || '').toLowerCase().includes(q);
    });
  }, [allUsers, userRoles, userSearch, userRoleFilter]);

  const audienceFor = (sendTo: string, ids: string[]) =>
    sendTo === 'admins' ? { kind: 'admins' as const } :
    sendTo === 'specific' ? { kind: 'users' as const, userIds: ids } :
    { kind: 'all' as const };

  const createPoll = async () => {
    const opts = form.options.map(o => o.trim()).filter(Boolean);
    if (!form.title.trim() || opts.length < 2) {
      toast.error('Need a title and at least 2 options');
      return;
    }
    if (sendTo === 'specific' && selectedUserIds.length === 0) {
      toast.error('Select at least one user');
      return;
    }
    const { data, error } = await supabase.from('polls' as any).insert({
      title: form.title,
      description: form.description || null,
      options: opts,
      created_by: user?.id,
      audience_type: sendTo,
      audience_user_ids: sendTo === 'specific' ? selectedUserIds : [],
    }).select().single();
    if (error) { toast.error(error.message); return; }

    const pollId = (data as any)?.id;
    // Create inbox notifications for targeted audience
    let targetIds: string[] = [];
    if (sendTo === 'all') {
      const { data: profs } = await supabase.from('profiles').select('user_id').eq('is_approved', true);
      targetIds = (profs || []).map((p: any) => p.user_id);
    } else if (sendTo === 'admins') {
      const { data: rs } = await supabase.from('user_roles').select('user_id').in('role', ADMIN_ROLES as any);
      targetIds = (rs || []).map((r: any) => r.user_id);
    } else {
      targetIds = selectedUserIds;
    }
    targetIds = Array.from(new Set(targetIds.filter(id => id && id !== user?.id)));
    if (targetIds.length) {
      await supabase.from('inbox_notifications').insert(
        targetIds.map(uid => ({
          user_id: uid,
          title: 'New poll: ' + form.title,
          body: (form.description || '').substring(0, 150),
          type: 'poll_new',
          link: '/polls',
          related_id: pollId,
        }))
      );
    }
    void triggerPush({
      title: 'New poll: ' + form.title,
      body: form.description?.substring(0, 150) || 'Cast your vote',
      url: '/polls',
      tag: 'poll-' + pollId,
      audience: audienceFor(sendTo, selectedUserIds),
      excludeUserId: user?.id,
    });

    toast.success('Poll created');
    setOpen(false);
    resetForm();
    load();
  };

  const vote = async (pollId: string, idx: number) => {
    if (!user) return;
    const existing = votes.find(v => v.poll_id === pollId && v.user_id === user.id);
    if (existing) {
      await supabase.from('poll_votes' as any).update({ option_index: idx }).eq('id', existing.id);
    } else {
      await supabase.from('poll_votes' as any).insert({ poll_id: pollId, user_id: user.id, option_index: idx });
    }
    toast.success('Vote recorded');
    load();
  };

  const deletePoll = async (id: string) => {
    if (!confirm('Delete this poll?')) return;
    await supabase.from('polls' as any).delete().eq('id', id);
    load();
  };

  const togglePoll = async (id: string, active: boolean) => {
    await supabase.from('polls' as any).update({ is_active: !active }).eq('id', id);
    load();
  };

  const releaseOutcome = async (poll: any) => {
    if (!confirm('Release the outcome to all targeted users? This will close the poll and notify them.')) return;
    const opts: string[] = Array.isArray(poll.options) ? poll.options : [];
    const pollVotes = votes.filter(v => v.poll_id === poll.id);
    const counts = opts.map((_, i) => pollVotes.filter(v => v.option_index === i).length);
    const max = Math.max(...counts, 0);
    const winners = opts.filter((_, i) => counts[i] === max && max > 0);
    const total = pollVotes.length;
    const summary = winners.length === 1
      ? `Winner: "${winners[0]}" with ${max}/${total} votes`
      : winners.length > 1
        ? `Tied: ${winners.map(w => `"${w}"`).join(', ')} (${max} votes each)`
        : 'No votes were cast';

    await supabase.from('polls' as any).update({
      outcome_released: true,
      outcome_released_at: new Date().toISOString(),
      is_active: false,
    }).eq('id', poll.id);

    // Notify the audience
    let targetIds: string[] = [];
    if (poll.audience_type === 'all') {
      const { data: profs } = await supabase.from('profiles').select('user_id').eq('is_approved', true);
      targetIds = (profs || []).map((p: any) => p.user_id);
    } else if (poll.audience_type === 'admins') {
      const { data: rs } = await supabase.from('user_roles').select('user_id').in('role', ADMIN_ROLES as any);
      targetIds = (rs || []).map((r: any) => r.user_id);
    } else {
      targetIds = poll.audience_user_ids || [];
    }
    targetIds = Array.from(new Set(targetIds.filter(Boolean)));
    if (targetIds.length) {
      await supabase.from('inbox_notifications').insert(
        targetIds.map(uid => ({
          user_id: uid,
          title: 'Poll result: ' + poll.title,
          body: summary,
          type: 'poll_result',
          link: '/polls',
          related_id: poll.id,
        }))
      );
    }
    void triggerPush({
      title: 'Poll result: ' + poll.title,
      body: summary,
      url: '/polls',
      tag: 'poll-result-' + poll.id,
      audience: audienceFor(poll.audience_type, poll.audience_user_ids || []),
    });

    toast.success('Outcome released');
    load();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        icon={Vote}
        title="Polls & Voting"
        subtitle="Society polls and decisions"
        action={isAdmin ? (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-warm text-primary-foreground"><Plus className="h-4 w-4 mr-1" />New Poll</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Poll</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Question *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description (optional)</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Options *</Label>
                  {form.options.map((o, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={o} onChange={e => { const n = [...form.options]; n[i] = e.target.value; setForm({ ...form, options: n }); }} placeholder={`Option ${i + 1}`} />
                      {form.options.length > 2 && (
                        <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
                      )}
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setForm({ ...form, options: [...form.options, ''] })}><Plus className="h-3 w-3 mr-1" />Add option</Button>
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1"><Bell className="h-4 w-4" /> Send to</Label>
                  <Select value={sendTo} onValueChange={(v) => setSendTo(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="admins">Admins only</SelectItem>
                      <SelectItem value="specific">Specific users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {sendTo === 'specific' && (
                  <div className="grid gap-2">
                    <Label>Select users</Label>
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
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{filteredUsers.length} matches • {selectedUserIds.length} selected</span>
                      <button type="button" className="underline" onClick={() => setSelectedUserIds(filteredUsers.map(u => u.user_id))}>Select all visible</button>
                    </div>
                    <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                      {filteredUsers.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">No users match</p>
                      ) : filteredUsers.map(u => (
                        <label key={u.user_id} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer text-sm">
                          <Checkbox checked={selectedUserIds.includes(u.user_id)} onCheckedChange={() => toggleUser(u.user_id)} />
                          <span className="flex-1 truncate">{u.full_name || u.mobile} {u.house_no && <span className="text-xs text-muted-foreground">· {u.house_no}</span>}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <Button onClick={createPoll} className="w-full gradient-warm text-primary-foreground">Create & Send</Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : undefined}
      />

      {polls.length === 0 && (
        <SectionCard><p className="text-center text-muted-foreground py-8">No polls yet.</p></SectionCard>
      )}

      {polls.map(poll => {
        const pollVotes = votes.filter(v => v.poll_id === poll.id);
        const myVote = pollVotes.find(v => v.user_id === user?.id);
        const total = pollVotes.length || 1;
        const opts: string[] = Array.isArray(poll.options) ? poll.options : [];
        const audienceLabel = poll.audience_type === 'all' ? 'All' : poll.audience_type === 'admins' ? 'Admins' : `${(poll.audience_user_ids || []).length} users`;
        return (
          <SectionCard key={poll.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-display font-semibold text-lg">{poll.title}</h3>
                {poll.description && <p className="text-sm text-muted-foreground mt-1">{poll.description}</p>}
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant={poll.is_active ? 'default' : 'secondary'}>{poll.is_active ? 'Active' : 'Closed'}</Badge>
                  <Badge variant="outline">{pollVotes.length} vote{pollVotes.length === 1 ? '' : 's'}</Badge>
                  {isAdmin && <Badge variant="outline" className="text-xs"><Users className="h-3 w-3 mr-1" />{audienceLabel}</Badge>}
                  {poll.outcome_released && <Badge className="bg-success text-success-foreground"><Megaphone className="h-3 w-3 mr-1" />Outcome released</Badge>}
                </div>
              </div>
              {isAdmin && (
                <div className="flex flex-col gap-1 items-end">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => togglePoll(poll.id, poll.is_active)}>{poll.is_active ? 'Close' : 'Reopen'}</Button>
                    <Button size="icon" variant="ghost" onClick={() => deletePoll(poll.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  {!poll.outcome_released && (
                    <Button size="sm" variant="outline" onClick={() => releaseOutcome(poll)} className="text-xs">
                      <Megaphone className="h-3 w-3 mr-1" />Release outcome
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {opts.map((opt, i) => {
                const count = pollVotes.filter(v => v.option_index === i).length;
                const pct = (count / total) * 100;
                const mine = myVote?.option_index === i;
                const showCounts = isAdmin || poll.outcome_released || !!myVote;
                return (
                  <button
                    key={i}
                    disabled={!poll.is_active}
                    onClick={() => vote(poll.id, i)}
                    className={`relative w-full text-left p-3 rounded-lg border-2 overflow-hidden transition ${mine ? 'border-primary' : 'border-border'} hover:border-primary disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {showCounts && <div className="absolute inset-0 bg-primary/10" style={{ width: `${pct}%` }} />}
                    <div className="relative flex justify-between items-center">
                      <span className="font-medium">{opt} {mine && '✓'}</span>
                      {showCounts && <span className="text-sm text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
};

export default Polls;
