import { useState, useEffect } from 'react';
import { Plus, MessageSquareWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  open: 'bg-destructive text-destructive-foreground',
  in_progress: 'gradient-warm text-primary-foreground',
  resolved: 'bg-success text-success-foreground',
  closed: 'bg-muted text-muted-foreground',
};

const MyComplaints = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'General' });
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
      toast.error(residentId ? 'Please fill the title' : 'Your profile is not linked to a resident record');
      return;
    }
    const { error } = await supabase.from('complaints').insert({
      resident_id: residentId,
      title: form.title,
      description: form.description || null,
      category: form.category,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['my_complaints'] });
    setDialogOpen(false);
    setForm({ title: '', description: '', category: 'General' });
    toast.success('Complaint submitted');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">My Complaints</h1>
          <p className="text-muted-foreground mt-1">Track your submitted complaints</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-warm text-primary-foreground shadow-lg"><Plus className="h-4 w-4 mr-2" /> New Complaint</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">Submit a Complaint</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="grid gap-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <Button onClick={handleAdd} className="w-full mt-2 gradient-warm text-primary-foreground">Submit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : complaints.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No complaints submitted yet.</Card>
      ) : complaints.map((c: any) => (
        <Card key={c.id} className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
              <MessageSquareWarning className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold font-display">{c.title}</h3>
                <Badge className={statusColors[c.status] || 'bg-muted'}>{c.status.replace('_', ' ')}</Badge>
                <Badge variant="outline">{c.category}</Badge>
              </div>
              {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
              {c.admin_comment && (
                <div className="mt-3 p-3 rounded-lg bg-info/10 border border-info/20">
                  <p className="text-xs font-medium text-info mb-1">Admin Response</p>
                  <p className="text-sm">{c.admin_comment}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">{new Date(c.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MyComplaints;
