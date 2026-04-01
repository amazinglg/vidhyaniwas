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
import { Textarea } from '@/components/ui/textarea';
import { mockExpenses } from '@/data/mockData';
import { Expense, ExpenseCategory, EXPENSE_CATEGORY_LABELS } from '@/types/society';
import { toast } from 'sonner';
import StatCard from '@/components/dashboard/StatCard';
import { Receipt, TrendingDown, Calendar } from 'lucide-react';

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    category: 'maintenance' as ExpenseCategory,
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    approvedBy: '',
    notes: '',
  });

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch = e.description.toLowerCase().includes(search.toLowerCase()) || (e.vendor?.toLowerCase().includes(search.toLowerCase()));
      const matchCat = filterCategory === 'all' || e.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [expenses, search, filterCategory]);

  const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0);
  const thisMonth = filtered.filter((e) => e.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, e) => s + e.amount, 0);

  const handleAdd = () => {
    if (!form.description || !form.amount) {
      toast.error('Please fill required fields');
      return;
    }
    const newExpense: Expense = {
      id: String(Date.now()),
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
      vendor: form.vendor || undefined,
      approvedBy: form.approvedBy || undefined,
      notes: form.notes || undefined,
    };
    setExpenses((prev) => [...prev, newExpense]);
    setDialogOpen(false);
    setForm({ category: 'maintenance', description: '', amount: '', date: new Date().toISOString().split('T')[0], vendor: '', approvedBy: '', notes: '' });
    toast.success('Expense added successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track all society expenditures</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Add New Expense</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpenseCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Description *</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was the expense for?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Amount (₹) *</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Date *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Vendor</Label>
                  <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Optional" />
                </div>
                <div className="grid gap-2">
                  <Label>Approved By</Label>
                  <Input value={form.approvedBy} onChange={(e) => setForm({ ...form, approvedBy: e.target.value })} placeholder="Optional" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={2} />
              </div>
              <Button onClick={handleAdd} className="w-full mt-2">Add Expense</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Expenses" value={`₹${totalExpenses.toLocaleString('en-IN')}`} icon={TrendingDown} variant="destructive" />
        <StatCard title="This Month" value={`₹${thisMonth.toLocaleString('en-IN')}`} icon={Calendar} variant="primary" />
        <StatCard title="Total Entries" value={String(filtered.length)} icon={Receipt} variant="default" />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Approved By</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => (
              <TableRow key={e.id} className="animate-fade-in">
                <TableCell>{e.date}</TableCell>
                <TableCell><Badge variant="secondary">{EXPENSE_CATEGORY_LABELS[e.category]}</Badge></TableCell>
                <TableCell className="font-medium">{e.description}</TableCell>
                <TableCell>{e.vendor || '-'}</TableCell>
                <TableCell>{e.approvedBy || '-'}</TableCell>
                <TableCell className="text-right font-semibold text-destructive">₹{e.amount.toLocaleString('en-IN')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Expenses;
