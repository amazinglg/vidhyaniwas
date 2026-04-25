import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertTriangle } from 'lucide-react';
import { findExistingMainEntryForFY, MAX_DUE_PER_FY } from '@/utils/maintenanceFY';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  residents: any[];
  defaultAmount: number;
}

type PerResidentPlan = {
  residentId: string;
  name: string;
  house: string;
  existingId: string | null;
  existingTotal: number;
  totalDue: number;
  fyLabel: string;
  duplicate: boolean;
  breaches: boolean;
  payload: any;
};

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const BulkMaintenanceDialog = ({ open, onOpenChange, residents, defaultAmount }: Props) => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const today = new Date();
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [year, setYear] = useState(String(today.getFullYear()));
  const [totalMaintenance, setTotalMaintenance] = useState(String(defaultAmount));
  const [date, setDate] = useState(today.toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState<PerResidentPlan[] | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return residents.filter((r: any) =>
      !q || r.name?.toLowerCase().includes(q) || r.house_no?.toLowerCase().includes(q)
    );
  }, [residents, search]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected[r.id]);
  const toggleAllVisible = () => {
    const next = { ...selected };
    if (allVisibleSelected) filtered.forEach((r) => { delete next[r.id]; });
    else filtered.forEach((r) => { next[r.id] = true; });
    setSelected(next);
  };

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const buildPayload = (residentId: string) => {
    const totalMaint = Number(totalMaintenance) || defaultAmount;
    return {
      resident_id: residentId,
      amount: 0,
      due_amount: totalMaint,
      total_maintenance: totalMaint,
      paid_date: null,
      month,
      year: Number(year),
      status: 'pending',
      payment_mode: null,
      receipt_no: null,
    };
  };

  const handlePreflight = async () => {
    if (selectedIds.length === 0) { toast.error(t('please_fill_required')); return; }
    setSubmitting(true);
    const totalMaint = Number(totalMaintenance) || defaultAmount;
    const result: PerResidentPlan[] = [];
    for (const rid of selectedIds) {
      const r = residents.find((x) => x.id === rid);
      const { fy, existing, totalDue } = await findExistingMainEntryForFY(rid, date);
      const projectedDue = totalDue - Number(existing?.due_amount || 0) + totalMaint;
      result.push({
        residentId: rid,
        name: r?.name || '—',
        house: `${r?.house_no || ''} / Lane ${r?.lane_no || ''}`,
        existingId: existing?.id || null,
        existingTotal: Number(existing?.total_maintenance || 0),
        totalDue,
        fyLabel: fy.label,
        duplicate: !!existing,
        breaches: projectedDue > MAX_DUE_PER_FY,
        payload: buildPayload(rid),
      });
    }
    setSubmitting(false);

    const conflicting = result.filter((p) => p.duplicate || p.breaches);
    if (conflicting.length > 0) {
      // Show review/confirm screen — user picks Ignore (cancel all) or Continue (apply with override).
      setPlans(result);
      return;
    }
    // No conflicts — just bulk insert all directly.
    await applyPlans(result, 'all-insert');
  };

  const applyPlans = async (all: PerResidentPlan[], mode: 'all-insert' | 'override') => {
    setSubmitting(true);
    let inserted = 0;
    let updated = 0;
    for (const p of all) {
      if (mode === 'override' && p.duplicate && p.existingId) {
        const totalMaint = Number(p.payload.total_maintenance);
        // Update the existing main entry — keep already-paid amount, recompute due.
        const { data: existingRow } = await supabase
          .from('maintenance_collections').select('amount').eq('id', p.existingId).maybeSingle();
        const paid = Number(existingRow?.amount || 0);
        const newDue = Math.max(totalMaint - paid, 0);
        const { error } = await supabase.from('maintenance_collections').update({
          total_maintenance: totalMaint,
          due_amount: newDue,
          status: paid >= totalMaint ? 'paid' : (paid > 0 ? 'partial' : 'pending'),
        }).eq('id', p.existingId);
        if (!error) updated++;
      } else {
        const { error } = await supabase.from('maintenance_collections').insert(p.payload);
        if (!error) inserted++;
      }
    }
    setSubmitting(false);
    toast.success(`${inserted} created, ${updated} updated`);
    queryClient.invalidateQueries({ queryKey: ['maintenance_collections'] });
    setSelected({});
    setPlans(null);
    onOpenChange(false);
  };

  const conflictsList = (plans || []).filter((p) => p.duplicate || p.breaches);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPlans(null); } onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">
            {plans ? 'Review Conflicts' : 'Bulk Maintenance Entry'}
          </DialogTitle>
        </DialogHeader>

        {!plans && (
          <div className="grid gap-4 py-2 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t('month')}</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Year</Label>
                <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t('total_maintenance')} (₹)</Label>
                <Input type="number" value={totalMaintenance} onChange={(e) => setTotalMaintenance(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t('date')}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>{t('search_residents')}</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search_residents')} />
            </div>
            <div className="flex items-center justify-between border rounded-lg px-3 py-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} />
                <span>Select all visible ({filtered.length})</span>
              </label>
              <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
            </div>
            <ScrollArea className="h-64 rounded-lg border">
              <div className="divide-y">
                {filtered.map((r: any) => (
                  <label key={r.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                    <Checkbox
                      checked={!!selected[r.id]}
                      onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: !!v }))}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">House {r.house_no} • Lane {r.lane_no}</p>
                    </div>
                  </label>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-6">{t('no_records_found')}</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {plans && (
          <div className="space-y-3 overflow-y-auto py-2">
            <div className="rounded-lg border bg-amber-500/10 p-3 flex gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p>
                {conflictsList.length} of {plans.length} selected resident(s) have conflicts.
                <strong> Ignore</strong> cancels the bulk action.
                <strong> Continue</strong> will <em>update</em> existing entries (no duplicates) and override the ₹10,000 cap where needed.
              </p>
            </div>
            <ScrollArea className="h-72 rounded-lg border">
              <div className="divide-y">
                {conflictsList.map((p) => (
                  <div key={p.residentId} className="px-3 py-2 text-sm">
                    <p className="font-medium">{p.name} <span className="text-xs text-muted-foreground">• {p.house}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.fyLabel}
                      {p.duplicate && <> • existing entry {inr(p.existingTotal)}</>}
                      {p.breaches && <> • would push due to {inr(p.totalDue - (p.duplicate ? Number(p.existingId ? 0 : 0) : 0) + Number(p.payload.total_maintenance))}</>}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {plans ? (
            <>
              <Button variant="outline" onClick={() => setPlans(null)} disabled={submitting}>Ignore</Button>
              <Button onClick={() => applyPlans(plans, 'override')} disabled={submitting} className="gradient-warm text-primary-foreground">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Continue & Override
              </Button>
            </>
          ) : (
            <Button onClick={handlePreflight} disabled={submitting || selectedIds.length === 0} className="gradient-warm text-primary-foreground">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Review & Apply ({selectedIds.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkMaintenanceDialog;
