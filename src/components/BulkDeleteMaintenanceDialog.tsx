import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collections: any[];
}

const BulkDeleteMaintenanceDialog = ({ open, onOpenChange, collections }: Props) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!open) { setSelected({}); setSearch(''); setStatusFilter('all'); } }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return collections.filter((c: any) => {
      const name = (c.residents as any)?.name?.toLowerCase() || '';
      const house = (c.residents as any)?.house_no?.toLowerCase() || '';
      const monthYear = `${c.month} ${c.year}`.toLowerCase();
      const matchSearch = !q || name.includes(q) || house.includes(q) || monthYear.includes(q);
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [collections, search, statusFilter]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((c) => selected[c.id]);
  const toggleAllVisible = () => {
    const next = { ...selected };
    if (allVisibleSelected) filtered.forEach((c) => { delete next[c.id]; });
    else filtered.forEach((c) => { next[c.id] = true; });
    setSelected(next);
  };

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} maintenance entry(ies)? This cannot be undone from this screen.`)) return;
    setSubmitting(true);
    const { error } = await supabase.from('maintenance_collections').delete().in('id', selectedIds);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Deleted ${selectedIds.length} entries`);
    queryClient.invalidateQueries({ queryKey: ['maintenance_collections'] });
    setSelected({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Bulk Delete Maintenance Entries
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Search</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, house, month…" />
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} />
              <span>Select all visible ({filtered.length})</span>
            </label>
            <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
          </div>
          <ScrollArea className="h-72 rounded-lg border">
            <div className="divide-y">
              {filtered.map((c: any) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                  <Checkbox
                    checked={!!selected[c.id]}
                    onCheckedChange={(v) => setSelected((s) => ({ ...s, [c.id]: !!v }))}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{(c.residents as any)?.name} • {(c.residents as any)?.house_no}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.month} {c.year} • Paid ₹{Number(c.amount || 0).toLocaleString('en-IN')} • Due ₹{Number(c.due_amount || 0).toLocaleString('en-IN')} • {c.status}
                    </p>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-center text-muted-foreground py-6">No entries found</p>
              )}
            </div>
          </ScrollArea>
        </div>
        <Button onClick={handleDelete} disabled={submitting || selectedIds.length === 0} variant="destructive">
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Trash2 className="h-4 w-4 mr-2" />
          Delete {selectedIds.length} Entr{selectedIds.length === 1 ? 'y' : 'ies'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDeleteMaintenanceDialog;
