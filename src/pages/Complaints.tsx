import { useState } from 'react';
import { MessageSquareWarning, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useComplaints } from '@/hooks/useSocietyData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  open: 'bg-destructive text-destructive-foreground',
  in_progress: 'gradient-warm text-primary-foreground',
  resolved: 'bg-success text-success-foreground',
  closed: 'bg-muted text-muted-foreground',
};

const Complaints = () => {
  const { data: complaints = [], isLoading } = useComplaints();
  const queryClient = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [comment, setComment] = useState('');

  const updateStatus = async (id: string, status: string) => {
    const update: Record<string, unknown> = { status };
    if (status === 'resolved') update.resolved_at = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('complaints').update(update).eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['complaints'] });
    toast.success('Status updated');
  };

  const addComment = async () => {
    if (!selectedComplaint || !comment.trim()) return;
    const { error } = await supabase.from('complaints').update({ admin_comment: comment }).eq('id', selectedComplaint.id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['complaints'] });
    setSelectedComplaint(null);
    setComment('');
    toast.success('Comment added');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-foreground">Manage Complaints</h1>
        <p className="text-muted-foreground mt-1">Review, comment and resolve resident complaints</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {['open', 'in_progress', 'resolved', 'closed'].map(status => {
          const count = complaints.filter((c: any) => c.status === status).length;
          return (
            <Card key={status} className="p-4 text-center">
              <p className="text-2xl font-bold font-display">{count}</p>
              <p className="text-sm text-muted-foreground capitalize">{status.replace('_', ' ')}</p>
            </Card>
          );
        })}
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
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No complaints</TableCell></TableRow>
            ) : complaints.map((c: any) => (
              <TableRow key={c.id} className="animate-fade-in">
                <TableCell className="font-medium">{c.residents?.name}</TableCell>
                <TableCell>{c.residents?.house_no}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>{c.category}</TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell><Badge className={statusColors[c.status] || 'bg-muted'}>{c.status.replace('_', ' ')}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}>
                      <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedComplaint(c); setComment(c.admin_comment || ''); }}>
                      <MessageSquareWarning className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Respond to Complaint</DialogTitle></DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-semibold">{selectedComplaint.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedComplaint.description}</p>
              </div>
              <div className="grid gap-2">
                <Label>Admin Comment / Response</Label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Write your response..." />
              </div>
              <Button onClick={addComment} className="w-full gradient-warm text-primary-foreground">
                <Send className="h-4 w-4 mr-2" /> Send Response
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Complaints;
