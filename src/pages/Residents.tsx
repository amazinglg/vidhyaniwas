import { useState } from 'react';
import { Plus, Search, Phone, Mail, Home, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useResidents } from '@/hooks/useSocietyData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const Residents = () => {
  const { data: residents = [], isLoading } = useResidents();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', house_no: '', lane_no: '', mobile: '', email: '', family_members: '1' });

  const filtered = residents.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.house_no.toLowerCase().includes(search.toLowerCase()) ||
    r.mobile.includes(search)
  );

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', house_no: '', lane_no: '', mobile: '', email: '', family_members: '1' });
    setDialogOpen(true);
  };

  const openEdit = (r: typeof residents[0]) => {
    setEditingId(r.id);
    setForm({ name: r.name, house_no: r.house_no, lane_no: r.lane_no, mobile: r.mobile, email: r.email || '', family_members: String(r.family_members || 1) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.house_no || !form.mobile) { toast.error('Please fill required fields'); return; }
    const payload = { name: form.name, house_no: form.house_no, lane_no: form.lane_no, mobile: form.mobile, email: form.email || null, family_members: Number(form.family_members) };

    if (editingId) {
      const { error } = await supabase.from('residents').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); return; }
      toast.success('Resident updated');
    } else {
      const { error } = await supabase.from('residents').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Resident added');
    }
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('residents').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Resident removed');
    queryClient.invalidateQueries({ queryKey: ['residents'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Residents</h1>
          <p className="text-muted-foreground mt-1">{residents.length} total residents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Resident</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">{editingId ? 'Edit Resident' : 'Add New Resident'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>House No. *</Label><Input value={form.house_no} onChange={(e) => setForm({ ...form, house_no: e.target.value })} placeholder="e.g. A-101" /></div>
                <div className="grid gap-2"><Label>Lane No.</Label><Input value={form.lane_no} onChange={(e) => setForm({ ...form, lane_no: e.target.value })} /></div>
              </div>
              <div className="grid gap-2"><Label>Mobile *</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Family Members</Label><Input type="number" value={form.family_members} onChange={(e) => setForm({ ...form, family_members: e.target.value })} min="1" /></div>
              <Button onClick={handleSave} className="w-full mt-2">{editingId ? 'Update' : 'Add Resident'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search by name, house no., or mobile..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>House</TableHead>
              <TableHead>Lane</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Family</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No residents found. Add your first resident!</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id} className="animate-fade-in">
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><span className="flex items-center gap-1"><Home className="h-3.5 w-3.5 text-muted-foreground" />{r.house_no}</span></TableCell>
                <TableCell>{r.lane_no}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <span className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{r.mobile}</span>
                    {r.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{r.email}</span>}
                  </div>
                </TableCell>
                <TableCell>{r.family_members}</TableCell>
                <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Residents;
