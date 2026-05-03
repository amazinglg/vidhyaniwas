import { useState, useEffect } from 'react';
import { Plus, Search, Phone, Home, Edit2, Trash2, Users as UsersIcon, Download, FileDown, IndianRupee, Pencil, Layers, LogOut } from 'lucide-react';
import MoveOutDialog from '@/components/MoveOutDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAllResidents } from '@/hooks/useSocietyData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ResidentDetailModal from '@/components/ResidentDetailModal';
import TenantModal from '@/components/TenantModal';
import { downloadReceipt } from '@/utils/lazyReceipt';
import BulkUpdateAmountDialog from '@/components/BulkUpdateAmountDialog';
import { PageHeader, SectionCard } from '@/components/layout/PagePrimitives';

const Residents = () => {
  const { data: allResidents = [], isLoading } = useAllResidents();
  const { isAdmin, isResident, isCoordinator } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [laneFilter, setLaneFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', house_no: '', lane_no: '', mobile: '', family_members: '1', resident_type: 'owner' });
  const readOnly = !isAdmin;

  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [tenantResident, setTenantResident] = useState<any>(null);
  const [moveOutResident, setMoveOutResident] = useState<any>(null);
  const [maintAmountDialog, setMaintAmountDialog] = useState<{ open: boolean; resident: any | null; value: string }>({ open: false, resident: null, value: '' });
  const canViewDetails = isAdmin || isCoordinator;
  const [bulkAmountOpen, setBulkAmountOpen] = useState(false);

  // Filter to show owners only in main list
  const owners = allResidents.filter((r: any) => r.resident_type === 'owner');
  // Build tenant map
  const tenants: Record<string, any[]> = {};
  allResidents.filter((r: any) => r.resident_type === 'tenant').forEach((t: any) => {
    if (t.owner_id) {
      if (!tenants[t.owner_id]) tenants[t.owner_id] = [];
      tenants[t.owner_id].push(t);
    }
  });

  // Realtime sync
  useEffect(() => {
    const channel = supabase.channel('residents-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'residents' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all_residents'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const uniqueLanes = Array.from(new Set(owners.map((r: any) => r.lane_no).filter(Boolean))).sort((a: any, b: any) => String(a).localeCompare(String(b), undefined, { numeric: true }));

  const filtered = owners.filter((r: any) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.house_no.toLowerCase().includes(search.toLowerCase()) ||
      r.mobile.includes(search);
    const matchesLane = laneFilter === 'all' || r.lane_no === laneFilter;
    return matchesSearch && matchesLane;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', house_no: '', lane_no: '', mobile: '', family_members: '1', resident_type: 'owner' });
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name, house_no: r.house_no, lane_no: r.lane_no, mobile: r.mobile, family_members: String(r.family_members || 1), resident_type: r.resident_type || 'owner' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.house_no || !form.mobile) { toast.error(t('please_fill_required')); return; }

    let ownerId: string | null = null;
    if (form.resident_type === 'member' || form.resident_type === 'tenant') {
      const { data: ownersList } = await supabase.from('residents').select('id')
        .eq('house_no', form.house_no).eq('lane_no', form.lane_no).eq('resident_type', 'owner').limit(1);
      if (!ownersList || ownersList.length === 0) {
        toast.error('No house owner found for this house. Register an owner first.');
        return;
      }
      ownerId = ownersList[0].id;
    }

    // Block duplicate house owner (for all users including admins)
    if (form.resident_type === 'owner') {
      const { data: existingOwners } = await supabase.from('residents').select('id')
        .eq('house_no', form.house_no).eq('lane_no', form.lane_no).eq('resident_type', 'owner');
      const isDuplicate = editingId
        ? existingOwners && existingOwners.filter(o => o.id !== editingId).length > 0
        : existingOwners && existingOwners.length > 0;
      if (isDuplicate) {
        toast.error('A house owner already exists for this house number. Use member or tenant instead.');
        return;
      }
    }

    const payload = {
      name: form.name, house_no: form.house_no, lane_no: form.lane_no,
      mobile: form.mobile,
      family_members: Number(form.family_members),
      resident_type: form.resident_type,
      owner_id: ownerId,
    };

    if (editingId) {
      const { error } = await supabase.from('residents').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); return; }
      toast.success(t('resident_updated'));
    } else {
      const { error } = await supabase.from('residents').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Resident added');
    }
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    queryClient.invalidateQueries({ queryKey: ['all_residents'] });
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    const { error } = await supabase.from('residents').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('resident_removed'));
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    queryClient.invalidateQueries({ queryKey: ['all_residents'] });
  };

  const downloadCSV = () => {
    const headers = [t('name'), t('house'), t('lane'), t('mobile'), t('family_members'), t('status')];
    const rows = filtered.map((r: any) => [r.name, r.house_no, r.lane_no, r.mobile, r.family_members || 1, r.is_active ? 'Active' : 'Inactive']);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'residents.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const openMaintAmount = (r: any) => {
    setMaintAmountDialog({ open: true, resident: r, value: String(r.maintenance_amount || 0) });
  };

  const [capDialog, setCapDialog] = useState<{ open: boolean; amount: number; projectedDue: number }>({ open: false, amount: 0, projectedDue: 0 });

  const doSaveMaintAmount = async (amount: number) => {
    const r = maintAmountDialog.resident;
    if (!r) return;

    // 1. Update resident's maintenance_amount
    const { error: updErr } = await supabase.from('residents').update({ maintenance_amount: amount }).eq('id', r.id);
    if (updErr) { toast.error(updErr.message); return; }

    // 2. Upsert a yearly maintenance_collections entry for current year (Annual)
    const year = new Date().getFullYear();
    const { data: existing } = await supabase.from('maintenance_collections')
      .select('*').eq('resident_id', r.id).eq('year', year).eq('month', 'Annual').maybeSingle();

    if (existing) {
      // Don't overwrite if already paid/cleared
      if (existing.status !== 'paid' && Number(existing.due_amount || 0) > 0) {
        const paid = Number(existing.amount || 0);
        const newDue = Math.max(amount - paid, 0);
        await supabase.from('maintenance_collections').update({
          total_maintenance: amount,
          due_amount: newDue,
          status: paid >= amount ? 'paid' : (paid > 0 ? 'partial' : 'pending'),
        }).eq('id', existing.id);
      }
    } else if (amount > 0) {
      await supabase.from('maintenance_collections').insert({
        resident_id: r.id, year, month: 'Annual',
        total_maintenance: amount, amount: 0, due_amount: amount, status: 'pending',
      });
    }

    toast.success('Maintenance amount saved');
    queryClient.invalidateQueries({ queryKey: ['all_residents'] });
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    queryClient.invalidateQueries({ queryKey: ['maintenance_collections'] });
    setMaintAmountDialog({ open: false, resident: null, value: '' });
    setCapDialog({ open: false, amount: 0, projectedDue: 0 });
  };

  const saveMaintAmount = async () => {
    const r = maintAmountDialog.resident;
    if (!r) return;
    const amount = Number(maintAmountDialog.value || 0);
    if (isNaN(amount) || amount < 0) { toast.error('Enter a valid amount'); return; }

    // Compute projected due across the FY (existing carry-over + new amount)
    const year = new Date().getFullYear();
    const { data: priorUnpaid } = await supabase.from('maintenance_collections')
      .select('due_amount').eq('resident_id', r.id).lt('year', year).neq('status', 'paid');
    const carry = (priorUnpaid || []).reduce((s: number, x: any) => s + Number(x.due_amount || 0), 0);
    const projectedDue = amount + carry;

    if (projectedDue > 10000) {
      setCapDialog({ open: true, amount, projectedDue });
      return;
    }
    await doSaveMaintAmount(amount);
  };


  const handleDownloadResidentReceipts = async (r: any) => {
    const { data: receipts } = await supabase.from('maintenance_receipts').select('*').eq('resident_id', r.id).order('created_at', { ascending: false });
    if (!receipts || receipts.length === 0) { toast.info(t('no_receipts')); return; }
    const rec: any = receipts[0];
    downloadReceipt({
      societyName: rec.society_name || 'Vidhya Niwas Society',
      receiptNo: rec.receipt_no || 'N/A',
      receiptDate: rec.receipt_date || '',
      residentName: rec.resident_name || r.name,
      houseNo: rec.house_no || r.house_no,
      laneNo: rec.lane_no || r.lane_no,
      month: rec.month,
      year: rec.year,
      totalMaintenance: Number(rec.total_maintenance || 0),
      amountPaid: Number(rec.amount_paid || 0),
      dueAmount: Number(rec.due_amount || 0),
      paymentMode: rec.payment_mode || '',
      notes: rec.notes || 'This is a digitally generated receipt and does not require a manual signature.',
      customFields: rec.custom_fields || {},
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        icon={UsersIcon}
        title={t('residents')}
        subtitle={`${owners.length} ${t('total_residents_count')}`}
        action={<div className="flex gap-1.5 flex-nowrap items-center justify-start sm:justify-end w-full overflow-x-auto">
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={downloadCSV} className="h-8 px-2.5 text-xs shrink-0">
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkAmountOpen(true)} className="h-8 px-2.5 text-xs shrink-0">
                <Layers className="h-3.5 w-3.5 mr-1" /> Bulk ₹
              </Button>
            </>
          )}
          {!readOnly && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button onClick={openAdd} size="sm" className="h-8 px-2.5 text-xs shrink-0"><Plus className="h-3.5 w-3.5 mr-1" /> {t('add_resident')}</Button></DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">{editingId ? t('edit_resident') : t('add_resident')}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>{t('resident_type')}</Label>
                    <Select value={form.resident_type} onValueChange={(v) => setForm({ ...form, resident_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">{t('house_owner')}</SelectItem>
                        <SelectItem value="member">{t('family_member')}</SelectItem>
                        <SelectItem value="tenant">{t('tenant')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label>{t('full_name')} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>{t('house_no')} *</Label><Input value={form.house_no} onChange={(e) => setForm({ ...form, house_no: e.target.value })} placeholder="e.g. A-101" /></div>
                    <div className="grid gap-2"><Label>{t('lane_no')}</Label><Input value={form.lane_no} onChange={(e) => setForm({ ...form, lane_no: e.target.value })} /></div>
                  </div>
                  <div className="grid gap-2"><Label>{t('mobile')} *</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>{t('family_members')}</Label><Input type="number" value={form.family_members} onChange={(e) => setForm({ ...form, family_members: e.target.value })} min="1" /></div>
                  <Button onClick={handleSave} className="w-full mt-2">{editingId ? t('update') : t('add_resident')}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>}
      />

      <SectionCard className="py-3 md:py-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder={t('search_residents')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={laneFilter} onValueChange={setLaneFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder={t('lane') + ': ' + t('all') } />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')} {t('lane').toLowerCase()}s</SelectItem>
              {uniqueLanes.map((ln: any) => (
                <SelectItem key={String(ln)} value={String(ln)}>{t('lane')} {ln}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t('loading')}</p>
        ) : filtered.length === 0 ? (
          <SectionCard className="p-8 text-center text-muted-foreground">{t('no_residents_found')}</SectionCard>
        ) : filtered.map((r: any) => (
          <SectionCard key={r.id} className="py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                {canViewDetails ? (
                  <button className="text-primary hover:underline cursor-pointer font-semibold text-sm text-left" onClick={() => setSelectedResident(r)}>
                    {r.name}
                  </button>
                ) : (
                  <p className="font-semibold text-sm">{r.name}</p>
                )}
                <p className="text-xs text-muted-foreground">{r.house_no} • {t('lane')} {r.lane_no}</p>
              </div>
              <Badge variant={r.is_active ? 'default' : 'secondary'} className="text-xs">{r.is_active ? t('active') : t('inactive')}</Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.mobile}</span>
              {isAdmin && (
                <span className="flex items-center gap-1 text-foreground font-medium">
                  <IndianRupee className="h-3 w-3" />{Number(r.maintenance_amount || 0).toLocaleString('en-IN')} / yr
                  <button onClick={() => openMaintAmount(r)} className="ml-1 text-primary"><Pencil className="h-3 w-3" /></button>
                </span>
              )}
            </div>
            {!readOnly && (
              <div className="flex gap-1 pt-1 border-t flex-wrap">
                {tenants[r.id] && tenants[r.id].length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setTenantResident(r)}>
                    <UsersIcon className="h-3.5 w-3.5 text-primary" />
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => handleDownloadResidentReceipts(r)}>
                    <FileDown className="h-3.5 w-3.5 text-primary" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit2 className="h-3.5 w-3.5" /></Button>
                {isAdmin && <Button variant="ghost" size="sm" title="Move out" onClick={() => setMoveOutResident(r)}><LogOut className="h-3.5 w-3.5 text-warning" /></Button>}
                <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            )}
          </SectionCard>
        ))}
      </div>

      {/* Desktop table */}
      <SectionCard className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('house')}</TableHead>
              <TableHead>{t('lane')}</TableHead>
              <TableHead>{t('contact')}</TableHead>
              <TableHead>{t('family')}</TableHead>
              {isAdmin && <TableHead>Maintenance (₹/yr)</TableHead>}
              <TableHead>{t('status')}</TableHead>
              {!readOnly && <TableHead className="text-right">{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={isAdmin ? (readOnly ? 7 : 8) : (readOnly ? 6 : 7)} className="text-center py-8 text-muted-foreground">{t('loading')}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? (readOnly ? 7 : 8) : (readOnly ? 6 : 7)} className="text-center py-8 text-muted-foreground">{t('no_residents_found')}</TableCell></TableRow>
            ) : filtered.map((r: any) => (
              <TableRow key={r.id} className="animate-fade-in">
                <TableCell className="font-medium">
                  {canViewDetails ? (
                    <button
                      className="text-primary hover:underline cursor-pointer font-medium text-left"
                      onClick={() => setSelectedResident(r)}
                    >
                      {r.name}
                    </button>
                  ) : r.name}
                </TableCell>
                <TableCell><span className="flex items-center gap-1"><Home className="h-3.5 w-3.5 text-muted-foreground" />{r.house_no}</span></TableCell>
                <TableCell>{r.lane_no}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <span className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{r.mobile}</span>
                  </div>
                </TableCell>
                <TableCell>{r.family_members}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <span className="inline-flex items-center gap-1 font-medium">
                      <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                      {Number(r.maintenance_amount || 0).toLocaleString('en-IN')}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => openMaintAmount(r)}>
                            <Pencil className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit maintenance amount</TooltipContent>
                      </Tooltip>
                    </span>
                  </TableCell>
                )}
                <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? t('active') : t('inactive')}</Badge></TableCell>
                {!readOnly && (
                  <TableCell className="text-right space-x-1">
                    {tenants[r.id] && tenants[r.id].length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setTenantResident(r)}>
                            <UsersIcon className="h-4 w-4 text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('view_tenant')}</TooltipContent>
                      </Tooltip>
                    )}
                    {isAdmin && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadResidentReceipts(r)}>
                            <FileDown className="h-4 w-4 text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('download_receipt')}</TooltipContent>
                      </Tooltip>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit2 className="h-4 w-4" /></Button>
                    {isAdmin && <Button variant="ghost" size="icon" title="Move out" onClick={() => setMoveOutResident(r)}><LogOut className="h-4 w-4 text-warning" /></Button>}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <ResidentDetailModal
        resident={selectedResident}
        open={!!selectedResident}
        onClose={() => setSelectedResident(null)}
      />

      <BulkUpdateAmountDialog
        open={bulkAmountOpen}
        onOpenChange={setBulkAmountOpen}
        residents={owners}
      />

      <TenantModal
        owner={tenantResident}
        open={!!tenantResident}
        onClose={() => setTenantResident(null)}
      />

      <MoveOutDialog
        resident={moveOutResident}
        open={!!moveOutResident}
        onOpenChange={(o) => !o && setMoveOutResident(null)}
      />

      <Dialog open={maintAmountDialog.open} onOpenChange={(o) => !o && setMaintAmountDialog({ open: false, resident: null, value: '' })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Set Maintenance Amount</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {maintAmountDialog.resident?.name} • {maintAmountDialog.resident?.house_no}
            </p>
            <div className="grid gap-2">
              <Label>Annual amount (₹)</Label>
              <Input
                type="number"
                min="0"
                value={maintAmountDialog.value}
                onChange={(e) => setMaintAmountDialog({ ...maintAmountDialog, value: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                This will create or update the pending due for {new Date().getFullYear()}. Already-paid entries will not be changed.
              </p>
            </div>
            <Button onClick={saveMaintAmount} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 10K cap breach confirmation */}
      <Dialog open={capDialog.open} onOpenChange={(o) => !o && setCapDialog({ open: false, amount: 0, projectedDue: 0 })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Exceeds ₹10,000 / FY cap</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>This change will make the resident's projected total due <strong>₹{capDialog.projectedDue.toLocaleString('en-IN')}</strong> for this financial year, breaching the ₹10,000 cap.</p>
            <p className="text-xs text-muted-foreground">Choose <strong>Cancel</strong> to abort, or <strong>Override & Save</strong> to apply anyway.</p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCapDialog({ open: false, amount: 0, projectedDue: 0 })}>Cancel</Button>
            <Button onClick={() => doSaveMaintAmount(capDialog.amount)} className="gradient-warm text-primary-foreground">Override & Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Residents;
