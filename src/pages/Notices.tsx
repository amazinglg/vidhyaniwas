import { useState } from 'react';
import { Plus, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotices } from '@/hooks/useSocietyData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const priorityStyles: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/10 text-info border-info/20',
  high: 'gradient-warm text-primary-foreground',
  urgent: 'bg-destructive text-destructive-foreground',
};

const Notices = () => {
  const { data: notices = [], isLoading } = useNotices();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'medium' });

  const handleAdd = async () => {
    if (!form.title || !form.content) { toast.error('Please fill all fields'); return; }
    const { error } = await supabase.from('notices').insert({ title: form.title, content: form.content, priority: form.priority });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['notices'] });
    setDialogOpen(false);
    setForm({ title: '', content: '', priority: 'medium' });
    toast.success('Notice published');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Notices & Announcements</h1>
          <p className="text-muted-foreground mt-1">Stay updated with society news</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="gradient-warm text-primary-foreground shadow-lg"><Plus className="h-4 w-4 mr-2" /> New Notice</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="font-display">Create Notice</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Content *</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} /></div>
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} className="w-full mt-2 gradient-warm text-primary-foreground">Publish Notice</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : notices.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No notices yet.</Card>
        ) : notices.map((n) => (
          <Card key={n.id} className="p-5 hover:shadow-md transition-all animate-fade-in border-l-4 border-l-primary">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-warm shadow">
                <Megaphone className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold font-display text-foreground">{n.title}</h3>
                  <Badge className={priorityStyles[n.priority] || 'bg-muted'}>{n.priority}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.content}</p>
                <p className="text-xs text-muted-foreground mt-3">{new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Notices;
