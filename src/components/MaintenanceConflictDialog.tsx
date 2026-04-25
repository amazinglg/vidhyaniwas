import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export type ConflictReason =
  | { kind: 'duplicate'; fyLabel: string; existingAmount: number }
  | { kind: 'limit'; fyLabel: string; currentDue: number; addingAmount: number }
  | { kind: 'both'; fyLabel: string; existingAmount: number; currentDue: number; addingAmount: number };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason: ConflictReason | null;
  onIgnore: () => void;
  onContinue: () => void;
  continueLabel?: string;
}

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const MaintenanceConflictDialog = ({ open, onOpenChange, reason, onIgnore, onContinue, continueLabel = 'Continue & Override' }: Props) => {
  if (!reason) return null;
  const fy = reason.fyLabel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Maintenance Entry Conflict
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {(reason.kind === 'duplicate' || reason.kind === 'both') && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="font-medium">A maintenance entry already exists for {fy}.</p>
              <p className="text-muted-foreground mt-1">
                Existing total amount: <strong>{inr((reason as any).existingAmount)}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Continuing will <strong>update the existing entry</strong> instead of creating a new one.
              </p>
            </div>
          )}
          {(reason.kind === 'limit' || reason.kind === 'both') && (
            <div className="rounded-lg border bg-destructive/5 p-3">
              <p className="font-medium text-destructive">Annual due limit breached.</p>
              <p className="text-muted-foreground mt-1">
                Current due in {fy}: <strong>{inr((reason as any).currentDue)}</strong><br />
                You're trying to add: <strong>{inr((reason as any).addingAmount)}</strong><br />
                New total would be: <strong>{inr(((reason as any).currentDue) + ((reason as any).addingAmount))}</strong>
                {' '}(limit ₹10,000)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Continuing will <strong>override the ₹10,000 cap</strong>.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onIgnore}>Ignore</Button>
          <Button onClick={onContinue} className="gradient-warm text-primary-foreground">{continueLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceConflictDialog;
