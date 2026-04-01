import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Receipt, TrendingDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useExpenses } from '@/hooks/useSocietyData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import StatCard from '@/components/dashboard/StatCard';
import type { Database } from '@/integrations/supabase/types';

type ExpenseCategory = Database['public']['Enums']['expense_category'];

const CATEGORY_LABELS: Record<string, string> = {
  repair: 'Repair', purchase: 'New Purchase', maintenance: 'General Maintenance',
  staff_salary: 'Staff Salary', electricity: 'Electricity', water: 'Water Supply',
  security: 'Security', gardening: 'Gardening', cleaning: 'Cleaning',
  events: 'Events & Functions', legal: 'Legal', insurance: 'Insurance', other: 'Other',
};

const Expenses = () => {
  const { data: expenses = [], isLoading } = useExpenses();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ category: 'maintenance' as ExpenseCategory, description: '', amount: '', date: new Date().toISOString().split('T')[0], vendor: '', approved_by_name: '', notes: '' });

  const filtered = useMemo(() => expenses.filter((e) => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase()) || (e.vendor?.toLowerCase().includes(search.toLowerCase()));
    const matchCat = filterCategory === 'all' || e.category === filterCategory;
    return matchSearch && matchCat;
  }), [expenses, search, filterCategory]);

  const totalExpenses = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  const handleAdd = async () => {
    if (!form.description || !form.amount) { toast.error('Please fill required fields'); return; }
    const { error } = await supabase.from('expenses').insert({
      category: form.category, description: form.description, amount: Number(form.amount),
      date: form.date, vendor: form.vendor || null, approved_by_name: form.approved_by_name || null, notes: form.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    setDialogOpen(false);
    setForm({ category: 'maintenance', description: '', amount: '', date: new Date().toISOString().split('T')[0], vendor: '', approved_by_name: '', notes: '' });
    toast.success('Expense added');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track all society expenditures</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Expense</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">Add New Expense</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpenseCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Description *</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Vendor</Label><Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Approved By</Label><Input value={form.approved_by_name} onChange={(e) => setForm({ ...form, approved_by_name: e.target.value })} /></div>
              </div>
              <div className="grid gap-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <Button onClick={handleAdd} className="w-full mt-2">Add Expense</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Expenses" value={`₹${totalExpenses.toLocaleString('en-IN')}`} icon={TrendingDown} variant="destructive" />
        <StatCard title="This Month" value={`₹${filtered.filter((e) => e.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, e) => s + Number(e.amount), 0).toLocaleString('en-IN')}`} icon={Calendar} variant="primary" />
        <StatCard title="Total Entries" value={String(filtered.length)} icon={Receipt} variant="default" />
      </div>

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
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

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
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No expenses found</TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id} className="animate-fade-in">
                <TableCell>{e.date}</TableCell>
                <TableCell><Badge variant="secondary">{CATEGORY_LABELS[e.category] || e.category}</Badge></TableCell>
                <TableCell className="font-medium">{e.description}</TableCell>
                <TableCell>{e.vendor || '-'}</TableCell>
                <TableCell>{e.approved_by_name || '-'}</TableCell>
                <TableCell className="text-right font-semibold text-destructive">₹{Number(e.amount).toLocaleString('en-IN')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Expenses;
