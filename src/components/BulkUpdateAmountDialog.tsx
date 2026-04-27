import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { triggerPush } from '@/lib/triggerPush';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  residents: any[];
}

const BulkUpdateAmountDialog = ({ open, onOpenChange, residents }: Props) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

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

  const [conflicts, setConflicts] = useState<Array<{ id: string; name: string; reason: string }> | null>(null);
  const [pendingAmount, setPendingAmount] = useState(0);

  const performUpdates = async (amt: number) => {
    setSubmitting(true);
    const { error } = await supabase.from('residents').update({ maintenance_amount: amt }).in('id', selectedIds);
    if (error) { setSubmitting(false); toast.error(error.message); return; }

    const year = new Date().getFullYear();
    let updated = 0, created = 0;
    for (const rid of selectedIds) {
      const { data: existing } = await supabase
        .from('maintenance_collections')
        .select('*').eq('resident_id', rid).eq('year', year).eq('month', 'Annual').maybeSingle();
      if (existing) {
        // Always update — never create a duplicate
        const paid = Number(existing.amount || 0);
        const newDue = Math.max(amt - paid, 0);
        await supabase.from('maintenance_collections').update({
          total_maintenance: amt,
          due_amount: newDue,
          status: paid >= amt ? 'paid' : (paid > 0 ? 'partial' : 'pending'),
        }).eq('id', existing.id);
        updated++;
      } else if (amt > 0) {
        await supabase.from('maintenance_collections').insert({
          resident_id: rid, year, month: 'Annual',
          total_maintenance: amt, amount: 0, due_amount: amt, status: 'pending',
        });
        created++;
      }
    }

    setSubmitting(false);
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    queryClient.invalidateQueries({ queryKey: ['all_residents'] });
    queryClient.invalidateQueries({ queryKey: ['maintenance_collections'] });
    toast.success(`${updated} updated, ${created} created`);
    if (selectedIds.length) {
      void triggerPush({
        title: '💰 Maintenance amount updated',
        body: `Your annual maintenance has been set to ₹${amt.toLocaleString('en-IN')}.`,
        url: '/maintenance',
        tag: 'bulk-amount',
        audience: { kind: 'residents', residentIds: selectedIds },
      });
    }
    setSelected({});
    setAmount('');
    setConflicts(null);
    onOpenChange(false);
  };

  const handleApply = async () => {
    const amt = Number(amount);
    if (!amt || amt < 0) { toast.error('Enter a valid amount'); return; }
    if (selectedIds.length === 0) { toast.error('Select at least one resident'); return; }

    // Pre-flight: detect ≤10,000 cap breaches (new amount + prior unpaid carry-over).
    const year = new Date().getFullYear();
    const { data: priorUnpaid } = await supabase
      .from('maintenance_collections')
      .select('resident_id, due_amount')
      .in('resident_id', selectedIds)
      .lt('year', year)
      .neq('status', 'paid');
    const carryMap: Record<string, number> = {};
    (priorUnpaid || []).forEach((row: any) => {
      carryMap[row.resident_id] = (carryMap[row.resident_id] || 0) + Number(row.due_amount || 0);
    });

    const breaches = selectedIds
      .map((rid) => {
        const carry = carryMap[rid] || 0;
        const projected = amt + carry;
        if (projected <= 10000) return null;
        const r = residents.find((x) => x.id === rid);
        return { id: rid, name: r?.name || '—', reason: `Projected total ₹${projected.toLocaleString('en-IN')} (₹${amt.toLocaleString('en-IN')} new + ₹${carry.toLocaleString('en-IN')} carry-over) exceeds ₹10,000 cap` };
      })
      .filter(Boolean) as Array<{ id: string; name: string; reason: string }>;

    if (breaches.length > 0) {
      setPendingAmount(amt);
      setConflicts(breaches);
      return;
    }
    await performUpdates(amt);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Bulk Update Yearly Maintenance Amount</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 overflow-y-auto">
          <div className="grid gap-1.5">
            <Label>New Annual Amount (₹) *</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 9000" />
            <p className="text-xs text-muted-foreground">Existing entries are <strong>updated</strong> (no duplicates). Amounts &gt; ₹10,000 require confirmation.</p>
          </div>
          <div className="grid gap-1.5">
            <Label>Search residents</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or house" />
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
                    <p className="text-xs text-muted-foreground">House {r.house_no} • Lane {r.lane_no} • Current ₹{Number(r.maintenance_amount || 0).toLocaleString('en-IN')}</p>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-center text-muted-foreground py-6">No residents found</p>
              )}
            </div>
          </ScrollArea>
        </div>
        <Button onClick={handleApply} disabled={submitting || selectedIds.length === 0 || !amount} className="gradient-warm text-primary-foreground">
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Apply to {selectedIds.length} Resident(s)
        </Button>

        {conflicts && (
          <Dialog open={!!conflicts} onOpenChange={(v) => { if (!v) setConflicts(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Amount exceeds ₹10,000 cap</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p>The amount <strong>₹{pendingAmount.toLocaleString('en-IN')}</strong> exceeds the ₹10,000 annual cap for {conflicts.length} resident(s).</p>
                <p className="text-xs text-muted-foreground">Choose <strong>Ignore</strong> to cancel, or <strong>Continue</strong> to override the cap and apply.</p>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setConflicts(null)} disabled={submitting}>Ignore</Button>
                <Button onClick={() => performUpdates(pendingAmount)} disabled={submitting} className="gradient-warm text-primary-foreground">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Continue & Override
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkUpdateAmountDialog;
