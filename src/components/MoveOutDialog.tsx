import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, IndianRupee, Car, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  resident: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone?: () => void;
}

const MoveOutDialog = ({ resident, open, onOpenChange, onDone }: Props) => {
  const [outstanding, setOutstanding] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [tenantCount, setTenantCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !resident) return;
    void (async () => {
      const [{ data: dues }, { count: vc }, { count: tc }] = await Promise.all([
        supabase.from('maintenance_collections').select('due_amount').eq('resident_id', resident.id).neq('status', 'paid'),
        supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('resident_id', resident.id),
        supabase.from('residents').select('*', { count: 'exact', head: true }).eq('owner_id', resident.id).eq('resident_type', 'tenant'),
      ]);
      setOutstanding((dues || []).reduce((s, d: any) => s + Number(d.due_amount || 0), 0));
      setVehicleCount(vc || 0);
      setTenantCount(tc || 0);
    })();
  }, [open, resident]);

  const confirm = async () => {
    if (outstanding > 0 && !confirm(`Outstanding dues of ₹${outstanding}. Continue anyway?`)) return;
    setLoading(true);
    try {
      // Delete vehicles
      await supabase.from('vehicles').delete().eq('resident_id', resident.id);
      // Deactivate this resident + any tenants under them
      await supabase.from('residents').update({ is_active: false }).eq('id', resident.id);
      if (tenantCount > 0) {
        await supabase.from('residents').update({ is_active: false }).eq('owner_id', resident.id);
      }
      toast.success('Move-out completed');
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Move-out: {resident?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>This will deactivate the resident, delete their vehicles, and (if owner) deactivate their tenants too.</AlertDescription>
          </Alert>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="p-3 rounded-lg border text-center"><IndianRupee className="h-4 w-4 mx-auto mb-1 text-warning" /><div className="font-bold">₹{outstanding.toLocaleString('en-IN')}</div><div className="text-xs text-muted-foreground">Dues</div></div>
            <div className="p-3 rounded-lg border text-center"><Car className="h-4 w-4 mx-auto mb-1 text-primary" /><div className="font-bold">{vehicleCount}</div><div className="text-xs text-muted-foreground">Vehicles</div></div>
            <div className="p-3 rounded-lg border text-center"><UserMinus className="h-4 w-4 mx-auto mb-1 text-secondary" /><div className="font-bold">{tenantCount}</div><div className="text-xs text-muted-foreground">Tenants</div></div>
          </div>
          {outstanding > 0 && <Alert variant="destructive"><AlertDescription>⚠ Outstanding dues of ₹{outstanding} are unpaid.</AlertDescription></Alert>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={confirm} disabled={loading} className="flex-1">{loading ? 'Processing…' : 'Confirm Move-out'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MoveOutDialog;
