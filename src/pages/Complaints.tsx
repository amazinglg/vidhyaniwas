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
import { mockComplaints, mockResidents } from '@/data/mockData';
import { Complaint } from '@/types/society';
import { toast } from 'sonner';

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'destructive',
  in_progress: 'default',
  resolved: 'secondary',
  closed: 'outline',
};

const Complaints = () => {
  const [complaints, setComplaints] = useState<Complaint[]>(mockComplaints);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ residentId: '', title: '', description: '', category: 'General' });

  const handleAdd = () => {
    const resident = mockResidents.find((r) => r.id === form.residentId);
    if (!resident || !form.title) { toast.error('Please fill required fields'); return; }
    const newComplaint: Complaint = {
      id: String(Date.now()), residentId: resident.id, residentName: resident.name,
      houseNo: resident.houseNo, title: form.title, description: form.description,
      category: form.category, status: 'open', createdAt: new Date().toISOString().split('T')[0],
    };
    setComplaints((prev) => [newComplaint, ...prev]);
    setDialogOpen(false);
    toast.success('Complaint registered');
  };

  const updateStatus = (id: string, status: Complaint['status']) => {
    setComplaints((prev) => prev.map((c) => c.id === id ? { ...c, status, resolvedAt: status === 'resolved' ? new Date().toISOString().split('T')[0] : c.resolvedAt } : c));
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
                  <SelectContent>{mockResidents.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.houseNo})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="grid gap-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Plumbing, Electrical" /></div>
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
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complaints.map((c) => (
              <TableRow key={c.id} className="animate-fade-in">
                <TableCell className="font-medium">{c.residentName}</TableCell>
                <TableCell>{c.houseNo}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>{c.category}</TableCell>
                <TableCell>{c.createdAt}</TableCell>
                <TableCell>{c.assignedTo || '-'}</TableCell>
                <TableCell><Badge variant={statusBadge[c.status]}>{c.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</Badge></TableCell>
                <TableCell>
                  <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v as Complaint['status'])}>
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
