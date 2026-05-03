import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, SectionCard } from '@/components/layout/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Vote, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

const Polls = () => {
  const { isAdmin, user } = useAuth();
  const { t } = useLanguage();
  const [polls, setPolls] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', options: ['', ''] });

  const load = async () => {
    const [{ data: p }, { data: v }] = await Promise.all([
      supabase.from('polls' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('poll_votes' as any).select('*'),
    ]);
    setPolls((p as any) || []);
    setVotes((v as any) || []);
  };

  useEffect(() => { load(); }, []);

  const createPoll = async () => {
    const opts = form.options.map(o => o.trim()).filter(Boolean);
    if (!form.title.trim() || opts.length < 2) {
      toast.error('Need a title and at least 2 options');
      return;
    }
    const { error } = await supabase.from('polls' as any).insert({
      title: form.title, description: form.description || null, options: opts, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Poll created');
    setOpen(false);
    setForm({ title: '', description: '', options: ['', ''] });
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

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        icon={Vote}
        title="Polls & Voting"
        subtitle="Society polls and decisions"
        action={isAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-warm text-primary-foreground"><Plus className="h-4 w-4 mr-1" />New Poll</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Poll</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Question</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description (optional)</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Options</Label>
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
                <Button onClick={createPoll} className="w-full gradient-warm text-primary-foreground">Create</Button>
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
        return (
          <SectionCard key={poll.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-display font-semibold text-lg">{poll.title}</h3>
                {poll.description && <p className="text-sm text-muted-foreground mt-1">{poll.description}</p>}
                <div className="flex gap-2 mt-2">
                  <Badge variant={poll.is_active ? 'default' : 'secondary'}>{poll.is_active ? 'Active' : 'Closed'}</Badge>
                  <Badge variant="outline">{pollVotes.length} vote{pollVotes.length === 1 ? '' : 's'}</Badge>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => togglePoll(poll.id, poll.is_active)}>{poll.is_active ? 'Close' : 'Reopen'}</Button>
                  <Button size="icon" variant="ghost" onClick={() => deletePoll(poll.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {opts.map((opt, i) => {
                const count = pollVotes.filter(v => v.option_index === i).length;
                const pct = (count / total) * 100;
                const mine = myVote?.option_index === i;
                return (
                  <button
                    key={i}
                    disabled={!poll.is_active}
                    onClick={() => vote(poll.id, i)}
                    className={`relative w-full text-left p-3 rounded-lg border-2 overflow-hidden transition ${mine ? 'border-primary' : 'border-border'} hover:border-primary disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    <div className="absolute inset-0 bg-primary/10" style={{ width: `${pct}%` }} />
                    <div className="relative flex justify-between items-center">
                      <span className="font-medium">{opt} {mine && '✓'}</span>
                      <span className="text-sm text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
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
