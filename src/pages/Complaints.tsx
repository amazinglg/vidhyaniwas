import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useResidents, useComplaints } from '@/hooks/useSocietyData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { open: 'destructive', in_progress: 'default', resolved: 'secondary', closed: 'outline' };

const Complaints = () => {
  const { data: complaints = [], isLoading } = useComplaints();
  const { data: residents = [] } = useResidents();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ residentId: '', title: '', description: '', category: 'General' });

  const handleAdd = async () => {
    if (!form.residentId || !form.title) { toast.error('Please fill required fields'); return; }
    const { error } = await supabase.from('complaints').insert({
      resident_id: form.residentId, title: form.title, description: form.description || null, category: form.category,
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['complaints'] });
    setDialogOpen(false);
    toast.success('Complaint registered');
  };

  const updateStatus = async (id: string, status: string) => {
    const update: Record<string, unknown> = { status };
    if (status === 'resolved') update.resolved_at = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('complaints').update(update).eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['complaints'] });
    toast.success('Status updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Complaints & Requests</h1>
          <p className="text-muted-foreground mt-1">Manage resident grievances</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Complaint</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">Register Complaint</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Resident *</Label>
                <Select value={form.residentId} onValueChange={(v) => setForm({ ...form, residentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
                  <SelectContent>{residents.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.house_no})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="grid gap-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <Button onClick={handleAdd} className="w-full mt-2">Register</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resident</TableHead>
              <TableHead>House</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : complaints.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No complaints registered</TableCell></TableRow>
            ) : complaints.map((c) => (
              <TableRow key={c.id} className="animate-fade-in">
                <TableCell className="font-medium">{(c.residents as any)?.name}</TableCell>
                <TableCell>{(c.residents as any)?.house_no}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>{c.category}</TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell><Badge variant={statusBadge[c.status] || 'outline'}>{c.status.replace('_', ' ')}</Badge></TableCell>
                <TableCell>
                  <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Complaints;
