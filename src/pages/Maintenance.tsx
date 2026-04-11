import { useState, useMemo } from 'react';
import { Plus, Search, Filter, IndianRupee, CheckCircle2, AlertTriangle, Clock, Edit2, Trash2, Eye, EyeOff, Settings2, Download, BanknoteIcon, History, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useResidents, useMaintenanceCollections } from '@/hooks/useSocietyData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import StatCard from '@/components/dashboard/StatCard';
import AuditHistoryDialog from '@/components/AuditHistoryDialog';
import { downloadReceipt } from '@/utils/generateReceipt';
import { Textarea } from '@/components/ui/textarea';

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { paid: 'default', partial: 'secondary', pending: 'outline', overdue: 'destructive' };

const DEFAULT_TOTAL_MAINTENANCE = 3000;

const Maintenance = () => {
  const { data: collections = [], isLoading } = useMaintenanceCollections();
  const { data: residents = [] } = useResidents();
  const { isAdmin, isCoordinator, isResident, isMasterAdmin } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ residentId: '', totalMaintenance: String(DEFAULT_TOTAL_MAINTENANCE), amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'upi', receiptNo: '', dueDate: '' });
  const [defaultAmountDialog, setDefaultAmountDialog] = useState(false);
  const [defaultAmount, setDefaultAmount] = useState(String(DEFAULT_TOTAL_MAINTENANCE));
  const [duePaymentDialog, setDuePaymentDialog] = useState(false);
  const [duePaymentEntry, setDuePaymentEntry] = useState<any>(null);
  const [duePaymentForm, setDuePaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'upi', receiptNo: '' });
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const readOnly = isResident || isCoordinator;


  const computeDue = (total: number, paid: number) => Math.max(0, total - paid);

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
    setForm({ residentId: '', totalMaintenance: defaultAmount, amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'upi', receiptNo: '', dueDate: '' });
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      residentId: c.resident_id,
      totalMaintenance: String(c.total_maintenance || DEFAULT_TOTAL_MAINTENANCE),
      amount: String(c.amount),
      date: c.paid_date || new Date().toISOString().split('T')[0],
      paymentMode: c.payment_mode || 'upi',
      receiptNo: c.receipt_no || '',
      dueDate: c.due_date || '',
    });
    setDialogOpen(true);
  };

  const openDuePayment = (c: any) => {
    setDuePaymentEntry(c);
    setDuePaymentForm({ amount: String(c.due_amount), date: new Date().toISOString().split('T')[0], paymentMode: 'upi', receiptNo: '' });
    setDuePaymentDialog(true);
  };

  const handleSave = async () => {
    if (!form.residentId || !form.amount) { toast.error(t('please_fill_required')); return; }
    const amt = Number(form.amount);
    const totalMaint = Number(form.totalMaintenance) || DEFAULT_TOTAL_MAINTENANCE;
    const dueAmount = computeDue(totalMaint, amt);
    const dateObj = new Date(form.date);
    const month = MONTHS[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    const payload: any = {
      resident_id: form.residentId, amount: amt, due_amount: dueAmount,
      total_maintenance: totalMaint,
      paid_date: form.date, month, year,
      status: dueAmount <= 0 ? 'paid' : amt > 0 ? 'partial' : 'pending',
      payment_mode: form.paymentMode, receipt_no: form.receiptNo || null,
      due_date: form.dueDate || null,
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

  const handleDuePayment = async () => {
    if (!duePaymentEntry || !duePaymentForm.amount) { toast.error(t('please_fill_required')); return; }
    const payAmount = Number(duePaymentForm.amount);
    const remainingDue = Math.max(0, Number(duePaymentEntry.due_amount) - payAmount);
    
    // Update the original entry - reduce due, change status
    const newOriginalDue = remainingDue;
    const newOriginalStatus = newOriginalDue <= 0 ? 'paid' : 'partial';
    await supabase.from('maintenance_collections').update({ 
      due_amount: newOriginalDue, 
      status: newOriginalStatus 
    }).eq('id', duePaymentEntry.id);

    // Create a new entry for the due payment
    const dateObj = new Date(duePaymentForm.date);
    const { error } = await supabase.from('maintenance_collections').insert({
      resident_id: duePaymentEntry.resident_id,
      amount: payAmount,
      due_amount: 0,
      total_maintenance: Number(duePaymentEntry.due_amount),
      paid_date: duePaymentForm.date,
      month: MONTHS[dateObj.getMonth()],
      year: dateObj.getFullYear(),
      status: 'paid',
      payment_mode: duePaymentForm.paymentMode,
      receipt_no: duePaymentForm.receiptNo || null,
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['maintenance_collections'] });
    setDuePaymentDialog(false);
    toast.success(t('due_payment_recorded'));
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

  const handleUpdateDefaultAmount = async () => {
    const newAmt = Number(defaultAmount);
    if (!newAmt || newAmt <= 0) { toast.error(t('please_fill_required')); return; }
    const { error } = await supabase.from('maintenance_collections')
      .update({ total_maintenance: newAmt })
      .gte('id', '00000000-0000-0000-0000-000000000000');
    if (error) { toast.error(error.message); return; }
    for (const c of collections) {
      const due = computeDue(newAmt, Number(c.amount || 0));
      const status = due <= 0 ? 'paid' : Number(c.amount) > 0 ? 'partial' : 'pending';
      await supabase.from('maintenance_collections').update({ due_amount: due, total_maintenance: newAmt, status }).eq('id', c.id);
    }
    queryClient.invalidateQueries({ queryKey: ['maintenance_collections'] });
    setDefaultAmountDialog(false);
    toast.success(t('visibility_updated'));
  };

  const downloadCSV = () => {
    const headers = [t('resident'), t('house'), t('date'), 'Total', t('paid'), t('due'), t('due_date'), t('mode'), t('status')];
    const rows = filtered.map((c: any) => [(c.residents as any)?.name || '', (c.residents as any)?.house_no || '', c.paid_date || '', c.total_maintenance, c.amount, c.due_amount, c.due_date || '', c.payment_mode || '', c.status]);
    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'maintenance_funds.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Check overdue status based on due_date
  const getEffectiveStatus = (c: any) => {
    if (c.status === 'paid') return 'paid';
    if (c.due_date && new Date(c.due_date) < new Date() && Number(c.due_amount) > 0) return 'overdue';
    return c.status;
  };

  const handleDownloadReceipt = async (c: any) => {
    const { data: receipt } = await supabase.from('maintenance_receipts').select('*').eq('maintenance_collection_id', c.id).maybeSingle();
    const r: any = receipt || {};
    downloadReceipt({
      societyName: r.society_name || 'Vidhya Niwas Society',
      receiptNo: r.receipt_no || c.receipt_no || 'N/A',
      receiptDate: r.receipt_date || c.paid_date || new Date().toISOString().split('T')[0],
      residentName: r.resident_name || (c.residents as any)?.name || '',
      houseNo: r.house_no || (c.residents as any)?.house_no || '',
      laneNo: r.lane_no || (c.residents as any)?.lane_no || '',
      month: r.month || c.month,
      year: r.year || c.year,
      totalMaintenance: Number(r.total_maintenance || c.total_maintenance || 0),
      amountPaid: Number(r.amount_paid || c.amount || 0),
      dueAmount: Number(r.due_amount || c.due_amount || 0),
      paymentMode: r.payment_mode || c.payment_mode || '',
      notes: r.notes || 'This is a digitally generated receipt and does not require a manual signature.',
      customFields: r.custom_fields || {},
    });
  };

      

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">{t('maintenance_fund')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('track_maintenance')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          )}
          {!readOnly && (
            <>
              <Button variant="outline" size="sm" onClick={() => { setDefaultAmount(String(DEFAULT_TOTAL_MAINTENANCE)); setDefaultAmountDialog(true); }}>
                <Settings2 className="h-4 w-4 mr-1" /> {t('amount')}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild><Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1 md:mr-2" /> <span className="hidden sm:inline">{t('record_payment')}</span><span className="sm:hidden">Add</span></Button></DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                      <div className="grid gap-2">
                        <Label>Total {t('amount')} (₹)</Label>
                        <Input type="number" value={form.totalMaintenance} onChange={(e) => setForm({ ...form, totalMaintenance: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>{t('paid')} (₹) *</Label>
                        <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                      </div>
                    </div>
                    {form.totalMaintenance && form.amount && (
                      <div className="p-3 rounded-lg bg-muted text-sm">
                        <span className="text-muted-foreground">{t('due')}: </span>
                        <span className={`font-bold ${computeDue(Number(form.totalMaintenance), Number(form.amount)) > 0 ? 'text-destructive' : 'text-success'}`}>
                          ₹{computeDue(Number(form.totalMaintenance), Number(form.amount)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2"><Label>{t('date')} *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                      <div className="grid gap-2"><Label>{t('due_date')}</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
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
            </>
          )}
        </div>
      </div>

      {/* Due Payment Dialog */}
      <Dialog open={duePaymentDialog} onOpenChange={setDuePaymentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">{t('pay_due')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            {duePaymentEntry && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p><span className="text-muted-foreground">{t('resident')}:</span> {(duePaymentEntry.residents as any)?.name}</p>
                <p><span className="text-muted-foreground">{t('due')}:</span> <span className="font-bold text-destructive">₹{Number(duePaymentEntry.due_amount).toLocaleString('en-IN')}</span></p>
              </div>
            )}
            <div className="grid gap-2"><Label>{t('amount')} (₹) *</Label><Input type="number" value={duePaymentForm.amount} onChange={(e) => setDuePaymentForm({ ...duePaymentForm, amount: e.target.value })} /></div>
            <div className="grid gap-2"><Label>{t('date')} *</Label><Input type="date" value={duePaymentForm.date} onChange={(e) => setDuePaymentForm({ ...duePaymentForm, date: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>{t('payment_mode')}</Label>
              <Select value={duePaymentForm.paymentMode} onValueChange={(v) => setDuePaymentForm({ ...duePaymentForm, paymentMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('cash')}</SelectItem>
                  <SelectItem value="upi">{t('upi')}</SelectItem>
                  <SelectItem value="bank_transfer">{t('bank_transfer')}</SelectItem>
                  <SelectItem value="cheque">{t('cheque')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>{t('receipt_no')}</Label><Input value={duePaymentForm.receiptNo} onChange={(e) => setDuePaymentForm({ ...duePaymentForm, receiptNo: e.target.value })} /></div>
            <Button onClick={handleDuePayment} className="w-full gradient-warm text-primary-foreground">{t('pay_due')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={defaultAmountDialog} onOpenChange={setDefaultAmountDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Set Default {t('amount')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Total Maintenance {t('amount')} (₹)</Label>
              <Input type="number" value={defaultAmount} onChange={(e) => setDefaultAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground">This will update the total maintenance for all existing records and recalculate dues.</p>
            </div>
            <Button onClick={handleUpdateDefaultAmount} className="w-full gradient-warm text-primary-foreground">{t('update')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard title={t('total_collected')} value={`₹${totalCollected.toLocaleString('en-IN')}`} icon={IndianRupee} variant="success" />
        <StatCard title={t('pending_dues')} value={`₹${totalPending.toLocaleString('en-IN')}`} icon={AlertTriangle} variant="warning" />
        <StatCard title={t('paid')} value={String(filtered.filter((c: any) => c.status === 'paid').length)} icon={CheckCircle2} variant="primary" />
        <StatCard title={t('overdue')} value={String(filtered.filter((c: any) => getEffectiveStatus(c) === 'overdue' || c.status === 'pending').length)} icon={Clock} variant="destructive" />
      </div>

      <Card className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder={t('search_residents')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-32"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_status')}</SelectItem>
                <SelectItem value="paid">{t('paid')}</SelectItem>
                <SelectItem value="partial">{t('partial')}</SelectItem>
                <SelectItem value="pending">{t('pending')}</SelectItem>
                <SelectItem value="overdue">{t('overdue')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_months')}</SelectItem>
                {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t('loading')}</p>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">{t('no_records_found')}</Card>
        ) : filtered.map((c: any) => {
          const effectiveStatus = getEffectiveStatus(c);
          return (
            <Card key={c.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{(c.residents as any)?.name}</p>
                  <p className="text-xs text-muted-foreground">{(c.residents as any)?.house_no} • {c.paid_date || '-'}</p>
                </div>
                <Badge variant={statusBadge[effectiveStatus] || 'outline'} className="text-xs">{t(effectiveStatus)}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-medium">₹{Number(c.total_maintenance || DEFAULT_TOTAL_MAINTENANCE).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('paid')}</p>
                  <p className="font-medium text-success">₹{Number(c.amount).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('due')}</p>
                  <p className={`font-medium ${Number(c.due_amount) > 0 ? 'text-destructive' : ''}`}>₹{Number(c.due_amount).toLocaleString('en-IN')}</p>
                </div>
              </div>
              {c.due_date && <div className="text-xs text-muted-foreground">{t('due_date')}: {c.due_date}</div>}
              <div className="text-xs text-muted-foreground capitalize">{c.payment_mode?.replace('_', ' ') || '-'}</div>
              {!readOnly && (
                <div className="flex gap-1 pt-1 border-t">
                  {Number(c.due_amount) > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => openDuePayment(c)}>
                            <BanknoteIcon className="h-3.5 w-3.5 text-orange-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('pay_due')}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => setHistoryRecordId(c.id)}>
                      <History className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(c)}>
                    <FileDown className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleVisibility(c.id, c.is_visible)}>
                    {c.is_visible ? <Eye className="h-3.5 w-3.5 text-success" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Desktop table view */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('resident')}</TableHead>
              <TableHead>{t('house')}</TableHead>
              <TableHead>{t('date')}</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>{t('paid')}</TableHead>
              <TableHead>{t('due')}</TableHead>
              <TableHead>{t('due_date')}</TableHead>
              <TableHead>{t('mode')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              {!readOnly && <TableHead className="text-right">{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={readOnly ? 9 : 10} className="text-center py-8 text-muted-foreground">{t('loading')}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={readOnly ? 9 : 10} className="text-center py-8 text-muted-foreground">{t('no_records_found')}</TableCell></TableRow>
            ) : filtered.map((c: any) => {
              const effectiveStatus = getEffectiveStatus(c);
              return (
                <TableRow key={c.id} className="animate-fade-in">
                  <TableCell className="font-medium">{(c.residents as any)?.name}</TableCell>
                  <TableCell>{(c.residents as any)?.house_no}</TableCell>
                  <TableCell>{c.paid_date || '-'}</TableCell>
                  <TableCell className="font-medium">₹{Number(c.total_maintenance || DEFAULT_TOTAL_MAINTENANCE).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-success font-medium">₹{Number(c.amount).toLocaleString('en-IN')}</TableCell>
                  <TableCell className={Number(c.due_amount) > 0 ? 'text-destructive font-medium' : ''}>₹{Number(c.due_amount).toLocaleString('en-IN')}</TableCell>
                  <TableCell>{c.due_date || '-'}</TableCell>
                  <TableCell className="capitalize">{c.payment_mode?.replace('_', ' ') || '-'}</TableCell>
                  <TableCell><Badge variant={statusBadge[effectiveStatus] || 'outline'}>{t(effectiveStatus)}</Badge></TableCell>
                  {!readOnly && (
                    <TableCell className="text-right space-x-1">
                      {Number(c.due_amount) > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => openDuePayment(c)}>
                                <BanknoteIcon className="h-4 w-4 text-orange-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('pay_due')}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => setHistoryRecordId(c.id)}>
                          <History className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadReceipt(c)}>
                        <FileDown className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleVisibility(c.id, c.is_visible)}>
                        {c.is_visible ? <Eye className="h-4 w-4 text-success" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      <AuditHistoryDialog
        open={!!historyRecordId}
        onClose={() => setHistoryRecordId(null)}
        tableName="maintenance_collections"
        recordId={historyRecordId || ''}
      />

    </div>
  );
};

export default Maintenance;
