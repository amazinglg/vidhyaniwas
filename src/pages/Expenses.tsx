import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Receipt, TrendingDown, Calendar, Edit2, Trash2, Eye, EyeOff, Download, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useExpenses } from '@/hooks/useSocietyData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import StatCard from '@/components/dashboard/StatCard';
import AuditHistoryDialog from '@/components/AuditHistoryDialog';
import type { Database } from '@/integrations/supabase/types';
import { PageHeader, SectionCard } from '@/components/layout/PagePrimitives';

type ExpenseCategory = Database['public']['Enums']['expense_category'];

const CATEGORY_KEYS: Record<string, string> = {
  repair: 'cat_repair', purchase: 'cat_purchase', maintenance: 'cat_maintenance',
  staff_salary: 'cat_staff_salary', electricity: 'cat_electricity', water: 'cat_water',
  security: 'cat_security', gardening: 'cat_gardening', cleaning: 'cat_cleaning',
  events: 'cat_events', legal: 'cat_legal', insurance: 'cat_insurance', other: 'cat_other',
};

const Expenses = () => {
  const { data: expenses = [], isLoading } = useExpenses();
  const { isAdmin, isCoordinator, isResident } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ category: 'maintenance' as ExpenseCategory, description: '', amount: '', date: new Date().toISOString().split('T')[0], approved_by_name: '', notes: '' });
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const readOnly = isResident || isCoordinator;

  // Fetch admin names for approved_by dropdown
  const { data: adminUsers = [] } = useQuery({
    queryKey: ['admin_users_for_dropdown'],
    queryFn: async () => {
      const { data: adminRoles } = await supabase.from('user_roles').select('user_id').in('role', ['master_admin', 'president', 'vice_president', 'treasury_head', 'secretary']);
      if (!adminRoles || adminRoles.length === 0) return [];
      const userIds = adminRoles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('full_name, user_id').in('user_id', userIds);
      return (profiles || []).filter((p: any) => p.full_name).map((p: any) => p.full_name);
    },
    enabled: isAdmin,
  });

  const filtered = useMemo(() => expenses.filter((e: any) => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || e.category === filterCategory;
    const matchMonth = filterMonth === 'all' || (e.date && e.date.slice(0, 7) === filterMonth);
    return matchSearch && matchCat && matchMonth;
  }), [expenses, search, filterCategory, filterMonth]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e: any) => { if (e.date) set.add(e.date.slice(0, 7)); });
    return Array.from(set).sort().reverse();
  }, [expenses]);

  const totalExpenses = filtered.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const openAdd = () => {
    setEditingId(null);
    setForm({ category: 'maintenance', description: '', amount: '', date: new Date().toISOString().split('T')[0], approved_by_name: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (e: any) => {
    setEditingId(e.id);
    setForm({ category: e.category, description: e.description, amount: String(e.amount), date: e.date, approved_by_name: e.approved_by_name || '', notes: e.notes || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount) { toast.error(t('please_fill_required')); return; }
    const payload = {
      category: form.category, description: form.description, amount: Number(form.amount),
      date: form.date, vendor: null, approved_by_name: form.approved_by_name || null, notes: form.notes || null,
    };
    if (editingId) {
      const { error } = await supabase.from('expenses').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); return; }
      toast.success(t('expense_updated'));
    } else {
      const { error } = await supabase.from('expenses').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success(t('expense_added'));
    }
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    toast.success(t('expense_deleted'));
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    const { error } = await supabase.from('expenses').update({ is_visible: !current }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    toast.success(t('visibility_updated'));
  };

  const downloadCSV = () => {
    const headers = [t('date'), t('category'), t('description'), t('amount'), t('approved_by'), t('notes')];
    const rows = filtered.map((e: any) => [e.date, t(CATEGORY_KEYS[e.category] || 'cat_other'), e.description, e.amount, e.approved_by_name || '', e.notes || '']);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        icon={Receipt}
        title={t('expenses')}
        subtitle={t('track_expenses')}
        action={<div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          )}
          {!readOnly && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1 md:mr-2" /> {t('add_expense')}</Button></DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">{editingId ? t('edit_expense') : t('add_expense')}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>{t('category')} *</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpenseCategory })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(CATEGORY_KEYS).map(([k, tKey]) => <SelectItem key={k} value={k}>{t(tKey)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label>{t('description')} *</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>{t('amount')} (₹) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                    <div className="grid gap-2"><Label>{t('date')} *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('approved_by')}</Label>
                    <Select value={form.approved_by_name} onValueChange={(v) => setForm({ ...form, approved_by_name: v })}>
                      <SelectTrigger><SelectValue placeholder={t('select')} /></SelectTrigger>
                      <SelectContent>
                        {adminUsers.map((name: string) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label>{t('notes')}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
                  <Button onClick={handleSave} className="w-full mt-2">{editingId ? t('update') : t('add_expense')}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>}
      />

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <StatCard title={t('total_expenses')} value={`₹${totalExpenses.toLocaleString('en-IN')}`} icon={TrendingDown} variant="destructive" />
        <StatCard title={t('this_month')} value={`₹${filtered.filter((e: any) => e.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s: number, e: any) => s + Number(e.amount), 0).toLocaleString('en-IN')}`} icon={Calendar} variant="primary" />
        <StatCard title={t('total_entries')} value={String(filtered.length)} icon={Receipt} variant="default" />
      </div>

      <SectionCard className="py-3 md:py-3">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder={t('search_expenses')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-44"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_categories')}</SelectItem>
              {Object.entries(CATEGORY_KEYS).map(([k, tKey]) => <SelectItem key={k} value={k}>{t(tKey)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-full sm:w-44"><Calendar className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_months')}</SelectItem>
              {monthOptions.map((m) => {
                const [y, mo] = m.split('-');
                const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return <SelectItem key={m} value={m}>{label}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t('loading')}</p>
        ) : filtered.length === 0 ? (
          <SectionCard className="p-8 text-center text-muted-foreground">{t('no_expenses_found')}</SectionCard>
        ) : filtered.map((e: any) => (
          <SectionCard key={e.id} className="py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{e.description}</p>
                <p className="text-xs text-muted-foreground">{e.date}</p>
              </div>
              <p className="font-bold text-destructive">₹{Number(e.amount).toLocaleString('en-IN')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{t(CATEGORY_KEYS[e.category] || 'cat_other')}</Badge>
              {e.approved_by_name && <span className="text-xs text-muted-foreground">by {e.approved_by_name}</span>}
            </div>
            {!readOnly && (
              <div className="flex gap-1 pt-1 border-t">
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => setHistoryRecordId(e.id)}>
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => toggleVisibility(e.id, e.is_visible)}>
                  {e.is_visible ? <Eye className="h-3.5 w-3.5 text-success" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(e)}><Edit2 className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            )}
          </SectionCard>
        ))}
      </div>

      {/* Desktop table view */}
      <SectionCard className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('date')}</TableHead>
              <TableHead>{t('category')}</TableHead>
              <TableHead>{t('description')}</TableHead>
              <TableHead>{t('approved_by')}</TableHead>
              <TableHead className="text-right">{t('amount')}</TableHead>
              {!readOnly && <TableHead className="text-right">{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={readOnly ? 5 : 6} className="text-center py-8 text-muted-foreground">{t('loading')}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={readOnly ? 5 : 6} className="text-center py-8 text-muted-foreground">{t('no_expenses_found')}</TableCell></TableRow>
            ) : filtered.map((e: any) => (
              <TableRow key={e.id} className="animate-fade-in">
                <TableCell>{e.date}</TableCell>
                <TableCell><Badge variant="secondary">{t(CATEGORY_KEYS[e.category] || 'cat_other')}</Badge></TableCell>
                <TableCell className="font-medium">{e.description}</TableCell>
                <TableCell>{e.approved_by_name || '-'}</TableCell>
                <TableCell className="text-right font-semibold text-destructive">₹{Number(e.amount).toLocaleString('en-IN')}</TableCell>
                {!readOnly && (
                  <TableCell className="text-right space-x-1">
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => setHistoryRecordId(e.id)}>
                        <History className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => toggleVisibility(e.id, e.is_visible)}>
                      {e.is_visible ? <Eye className="h-4 w-4 text-success" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
      <AuditHistoryDialog
        open={!!historyRecordId}
        onClose={() => setHistoryRecordId(null)}
        tableName="expenses"
        recordId={historyRecordId || ''}
      />
    </div>
  );
};

export default Expenses;
