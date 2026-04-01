import { useState } from 'react';
import { Plus, Search, Phone, Mail, Home, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockResidents } from '@/data/mockData';
import { Resident, ROLE_LABELS, UserRole } from '@/types/society';
import { toast } from 'sonner';

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  master_admin: 'destructive',
  president: 'default',
  vice_president: 'default',
  supervisor: 'secondary',
  coordinator: 'secondary',
  resident: 'outline',
};

const Residents = () => {
  const [residents, setResidents] = useState<Resident[]>(mockResidents);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [form, setForm] = useState({
    name: '', houseNo: '', laneNo: '', mobile: '', email: '', familyMembers: '1', role: 'resident' as UserRole,
  });

  const filtered = residents.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.houseNo.toLowerCase().includes(search.toLowerCase()) ||
    r.mobile.includes(search)
  );

  const openAdd = () => {
    setEditingResident(null);
    setForm({ name: '', houseNo: '', laneNo: '', mobile: '', email: '', familyMembers: '1', role: 'resident' });
    setDialogOpen(true);
  };

  const openEdit = (r: Resident) => {
    setEditingResident(r);
    setForm({ name: r.name, houseNo: r.houseNo, laneNo: r.laneNo, mobile: r.mobile, email: r.email || '', familyMembers: String(r.familyMembers || 1), role: r.role });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.houseNo || !form.mobile) {
      toast.error('Please fill required fields');
      return;
    }
    if (editingResident) {
      setResidents((prev) => prev.map((r) => r.id === editingResident.id ? { ...r, ...form, familyMembers: Number(form.familyMembers) } : r));
      toast.success('Resident updated successfully');
    } else {
      const newResident: Resident = {
        id: String(Date.now()),
        ...form,
        familyMembers: Number(form.familyMembers),
        isActive: true,
      };
      setResidents((prev) => [...prev, newResident]);
      toast.success('Resident added successfully');
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setResidents((prev) => prev.filter((r) => r.id !== id));
    toast.success('Resident removed');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Residents</h1>
          <p className="text-muted-foreground mt-1">{residents.length} total residents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Resident</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">{editingResident ? 'Edit Resident' : 'Add New Resident'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter full name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>House No. *</Label>
                  <Input value={form.houseNo} onChange={(e) => setForm({ ...form, houseNo: e.target.value })} placeholder="e.g. A-101" />
                </div>
                <div className="grid gap-2">
                  <Label>Lane No. *</Label>
                  <Input value={form.laneNo} onChange={(e) => setForm({ ...form, laneNo: e.target.value })} placeholder="e.g. 1" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Mobile Number *</Label>
                <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="10-digit mobile" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Family Members</Label>
                  <Input type="number" value={form.familyMembers} onChange={(e) => setForm({ ...form, familyMembers: e.target.value })} min="1" />
                </div>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full mt-2">{editingResident ? 'Update Resident' : 'Add Resident'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search by name, house no., or mobile..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>House</TableHead>
              <TableHead>Lane</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Family</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id} className="animate-fade-in">
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><span className="flex items-center gap-1"><Home className="h-3.5 w-3.5 text-muted-foreground" />{r.houseNo}</span></TableCell>
                <TableCell>{r.laneNo}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <span className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{r.mobile}</span>
                    {r.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{r.email}</span>}
                  </div>
                </TableCell>
                <TableCell>{r.familyMembers}</TableCell>
                <TableCell><Badge variant={roleBadgeVariant[r.role] || 'outline'}>{ROLE_LABELS[r.role]}</Badge></TableCell>
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
