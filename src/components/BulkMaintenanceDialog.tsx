import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Loader2 } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  residents: any[];
  defaultAmount: number;
}

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

  const handleSubmit = async () => {
    if (selectedIds.length === 0) { toast.error(t('please_fill_required')); return; }
    const totalMaint = Number(totalMaintenance) || defaultAmount;
    setSubmitting(true);

    const rows = selectedIds.map((residentId) => ({
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
    }));

    const { error } = await supabase.from('maintenance_collections').insert(rows);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} ${t('record_payment')}`);
    queryClient.invalidateQueries({ queryKey: ['maintenance_collections'] });
    setSelected({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Bulk Maintenance Entry</DialogTitle>
        </DialogHeader>
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
        <Button onClick={handleSubmit} disabled={submitting || selectedIds.length === 0} className="gradient-warm text-primary-foreground">
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create {selectedIds.length} Entries
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default BulkMaintenanceDialog;
