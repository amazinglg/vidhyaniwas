import { useState, useMemo } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockCollections, mockResidents } from '@/data/mockData';
import { MaintenanceCollection } from '@/types/society';
import { toast } from 'sonner';
import StatCard from '@/components/dashboard/StatCard';
import { IndianRupee, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default',
  partial: 'secondary',
  pending: 'outline',
  overdue: 'destructive',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const Maintenance = () => {
  const [collections, setCollections] = useState<MaintenanceCollection[]>(mockCollections);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    residentId: '', amount: '', month: MONTHS[new Date().getMonth()], year: '2024', paymentMode: 'upi' as string, receiptNo: '',
  });

  const filtered = useMemo(() => {
    return collections.filter((c) => {
      const matchSearch = c.residentName.toLowerCase().includes(search.toLowerCase()) || c.houseNo.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchMonth = filterMonth === 'all' || c.month === filterMonth;
      return matchSearch && matchStatus && matchMonth;
    });
  }, [collections, search, filterStatus, filterMonth]);

  const totalCollected = filtered.reduce((s, c) => s + c.amount, 0);
  const totalPending = filtered.reduce((s, c) => s + c.dueAmount, 0);
  const paidCount = filtered.filter((c) => c.status === 'paid').length;
  const overdueCount = filtered.filter((c) => c.status === 'overdue' || c.status === 'pending').length;

  const handleAdd = () => {
    const resident = mockResidents.find((r) => r.id === form.residentId);
    if (!resident || !form.amount) {
      toast.error('Please fill all required fields');
      return;
    }
    const dueAmount = 3000 - Number(form.amount);
    const newCollection: MaintenanceCollection = {
      id: String(Date.now()),
      residentId: resident.id,
      residentName: resident.name,
      houseNo: resident.houseNo,
      amount: Number(form.amount),
      dueAmount: Math.max(0, dueAmount),
      paidDate: new Date().toISOString().split('T')[0],
      month: form.month,
      year: Number(form.year),
      status: dueAmount <= 0 ? 'paid' : dueAmount < 3000 ? 'partial' : 'pending',
      paymentMode: form.paymentMode as MaintenanceCollection['paymentMode'],
      receiptNo: form.receiptNo || undefined,
    };
    setCollections((prev) => [...prev, newCollection]);
    setDialogOpen(false);
    toast.success('Payment recorded successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Maintenance Fund</h1>
          <p className="text-muted-foreground mt-1">Track annual maintenance collections</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Record Payment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Record Maintenance Payment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Resident *</Label>
                <Select value={form.residentId} onValueChange={(v) => setForm({ ...form, residentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
                  <SelectContent>
                    {mockResidents.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name} ({r.houseNo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Amount (₹) *</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="3000" />
                </div>
                <div className="grid gap-2">
                  <Label>Payment Mode</Label>
                  <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Month</Label>
                  <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Receipt No.</Label>
                  <Input value={form.receiptNo} onChange={(e) => setForm({ ...form, receiptNo: e.target.value })} placeholder="Optional" />
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full mt-2">Record Payment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Collected" value={`₹${totalCollected.toLocaleString('en-IN')}`} icon={IndianRupee} variant="success" />
        <StatCard title="Pending Dues" value={`₹${totalPending.toLocaleString('en-IN')}`} icon={AlertTriangle} variant="warning" />
        <StatCard title="Paid" value={String(paidCount)} icon={CheckCircle2} variant="primary" />
        <StatCard title="Overdue" value={String(overdueCount)} icon={Clock} variant="destructive" />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search resident or house..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resident</TableHead>
              <TableHead>House</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} className="animate-fade-in">
                <TableCell className="font-medium">{c.residentName}</TableCell>
                <TableCell>{c.houseNo}</TableCell>
                <TableCell>{c.month} {c.year}</TableCell>
                <TableCell className="text-success font-medium">₹{c.amount.toLocaleString('en-IN')}</TableCell>
                <TableCell className={c.dueAmount > 0 ? 'text-destructive font-medium' : ''}>₹{c.dueAmount.toLocaleString('en-IN')}</TableCell>
                <TableCell className="capitalize">{c.paymentMode?.replace('_', ' ') || '-'}</TableCell>
                <TableCell>{c.paidDate || '-'}</TableCell>
                <TableCell><Badge variant={statusBadge[c.status]}>{c.status.charAt(0).toUpperCase() + c.status.slice(1)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Maintenance;
