import { useState, useMemo } from 'react';
import { Plus, Search, Filter, IndianRupee, CheckCircle2, AlertTriangle, Clock, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useResidents, useMaintenanceCollections } from '@/hooks/useSocietyData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import StatCard from '@/components/dashboard/StatCard';

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { paid: 'default', partial: 'secondary', pending: 'outline', overdue: 'destructive' };

const Maintenance = () => {
  const { data: collections = [], isLoading } = useMaintenanceCollections();
  const { data: residents = [] } = useResidents();
  const { isAdmin, isCoordinator, isResident } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ residentId: '', amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'upi', receiptNo: '' });
  const readOnly = isResident || isCoordinator;

  const filtered = useMemo(() => collections.filter((c: any) => {
    const name = (c.residents as any)?.name || '';
    const houseNo = (c.residents as any)?.house_no || '';
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || houseNo.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchMonth = filterMonth === 'all' || c.month === filterMonth;
    return matchSearch && matchStatus && matchMonth;
  }), [collections, search, filterStatus, filterMonth]);

  const totalCollected = filtered.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const totalPending = filtered.reduce((s: number, c: any) => s + Number(c.due_amount || 0), 0);

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const openAdd = () => {
    setEditingId(null);
    setForm({ residentId: '', amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'upi', receiptNo: '' });
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({ residentId: c.resident_id, amount: String(c.amount), date: c.paid_date || new Date().toISOString().split('T')[0], paymentMode: c.payment_mode || 'upi', receiptNo: c.receipt_no || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.residentId || !form.amount) { toast.error(t('please_fill_required')); return; }
    const amt = Number(form.amount);
    const dueAmount = Math.max(0, 3000 - amt);
    // Derive month from the date
    const dateObj = new Date(form.date);
    const month = MONTHS[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    const payload = {
      resident_id: form.residentId, amount: amt, due_amount: dueAmount,
      paid_date: form.date, month, year,
      status: dueAmount <= 0 ? 'paid' : amt > 0 ? 'partial' : 'pending',
      payment_mode: form.paymentMode, receipt_no: form.receiptNo || null,
    };
    if (editingId) {
      const { error } = await supabase.from('maintenance_collections').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); return; }
      toast.success(t('payment_recorded'));
    } else {
      const { error } = await supabase.from('maintenance_collections').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success(t('payment_recorded'));
    }
    queryClient.invalidateQueries({ queryKey: ['maintenance_collections'] });
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    const { error } = await supabase.from('maintenance_collections').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['maintenance_collections'] });
    toast.success(t('delete'));
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    const { error } = await supabase.from('maintenance_collections').update({ is_visible: !current }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['maintenance_collections'] });
    toast.success(t('visibility_updated'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">{t('maintenance_fund')}</h1>
          <p className="text-muted-foreground mt-1">{t('track_maintenance')}</p>
        </div>
        {!readOnly && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> {t('record_payment')}</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="font-display">{editingId ? t('edit') + ' ' + t('record_payment') : t('record_payment')}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t('resident')} *</Label>
                  <Select value={form.residentId} onValueChange={(v) => setForm({ ...form, residentId: v })}>
                    <SelectTrigger><SelectValue placeholder={t('select_resident')} /></SelectTrigger>
                    <SelectContent>{residents.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.house_no})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>{t('amount')} (₹) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>{t('date')} *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>{t('payment_mode')}</Label>
                    <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{t('cash')}</SelectItem>
                        <SelectItem value="upi">{t('upi')}</SelectItem>
                        <SelectItem value="bank_transfer">{t('bank_transfer')}</SelectItem>
                        <SelectItem value="cheque">{t('cheque')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label>{t('receipt_no')}</Label><Input value={form.receiptNo} onChange={(e) => setForm({ ...form, receiptNo: e.target.value })} /></div>
                </div>
                <Button onClick={handleSave} className="w-full mt-2">{editingId ? t('update') : t('record_payment')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title={t('total_collected')} value={`₹${totalCollected.toLocaleString('en-IN')}`} icon={IndianRupee} variant="success" />
        <StatCard title={t('pending_dues')} value={`₹${totalPending.toLocaleString('en-IN')}`} icon={AlertTriangle} variant="warning" />
        <StatCard title={t('paid')} value={String(filtered.filter((c: any) => c.status === 'paid').length)} icon={CheckCircle2} variant="primary" />
        <StatCard title={t('overdue')} value={String(filtered.filter((c: any) => c.status === 'overdue' || c.status === 'pending').length)} icon={Clock} variant="destructive" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder={t('search_residents')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_status')}</SelectItem>
              <SelectItem value="paid">{t('paid')}</SelectItem>
              <SelectItem value="partial">{t('partial')}</SelectItem>
              <SelectItem value="pending">{t('pending')}</SelectItem>
              <SelectItem value="overdue">{t('overdue')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_months')}</SelectItem>
              {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('resident')}</TableHead>
              <TableHead>{t('house')}</TableHead>
              <TableHead>{t('date')}</TableHead>
              <TableHead>{t('paid')}</TableHead>
              <TableHead>{t('due')}</TableHead>
              <TableHead>{t('mode')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              {!readOnly && <TableHead className="text-right">{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={readOnly ? 7 : 8} className="text-center py-8 text-muted-foreground">{t('loading')}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={readOnly ? 7 : 8} className="text-center py-8 text-muted-foreground">{t('no_records_found')}</TableCell></TableRow>
            ) : filtered.map((c: any) => (
              <TableRow key={c.id} className="animate-fade-in">
                <TableCell className="font-medium">{(c.residents as any)?.name}</TableCell>
                <TableCell>{(c.residents as any)?.house_no}</TableCell>
                <TableCell>{c.paid_date || '-'}</TableCell>
                <TableCell className="text-success font-medium">₹{Number(c.amount).toLocaleString('en-IN')}</TableCell>
                <TableCell className={Number(c.due_amount) > 0 ? 'text-destructive font-medium' : ''}>₹{Number(c.due_amount).toLocaleString('en-IN')}</TableCell>
                <TableCell className="capitalize">{c.payment_mode?.replace('_', ' ') || '-'}</TableCell>
                <TableCell><Badge variant={statusBadge[c.status] || 'outline'}>{c.status}</Badge></TableCell>
                {!readOnly && (
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleVisibility(c.id, c.is_visible)} title={c.is_visible ? t('hidden') : t('visible')}>
                      {c.is_visible ? <Eye className="h-4 w-4 text-success" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Maintenance;
