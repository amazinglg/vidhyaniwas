import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share, Plus, Check, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const isIOS = /iphone|ipad|ipod/i.test(ua);
// Real Safari has "Safari/" but no "CriOS", "FxiOS", "EdgiOS", "OPiOS", "FBAN", "FBAV", "Instagram", "Line", "WhatsApp"
const isInAppOrNonSafari =
  isIOS &&
  (/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line|WhatsApp/i.test(ua) ||
    !/Safari/i.test(ua));

const IosInstallGuideDialog = ({ open, onOpenChange }: Props) => {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      toast.success('Link copied — paste it in Safari');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Long-press the URL bar to copy.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Install on iPhone / iPad</DialogTitle>
        </DialogHeader>

        {isInAppOrNonSafari && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 flex gap-2 items-start">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold mb-1">Open in Safari first</p>
              <p className="text-muted-foreground mb-2">
                Apple only allows installing from <strong>Safari</strong>. You're currently in another browser or in-app view.
              </p>
              <Button size="sm" variant="outline" onClick={copyLink} className="gap-1.5 h-8">
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied!' : 'Copy link'}
              </Button>
            </div>
          </div>
        )}

        <ol className="space-y-3 mt-2">
          <li className="flex gap-3 items-start">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-warm text-primary-foreground text-xs font-bold">1</span>
            <div className="flex-1">
              <p className="text-sm font-medium">Tap the Share button</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Share className="h-3.5 w-3.5" /> at the bottom of Safari
              </p>
            </div>
          </li>
          <li className="flex gap-3 items-start">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-warm text-primary-foreground text-xs font-bold">2</span>
            <div className="flex-1">
              <p className="text-sm font-medium">Scroll & tap "Add to Home Screen"</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Plus className="h-3.5 w-3.5" /> in the share sheet
              </p>
            </div>
          </li>
          <li className="flex gap-3 items-start">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-warm text-primary-foreground text-xs font-bold">3</span>
            <div className="flex-1">
              <p className="text-sm font-medium">Tap "Add" in the top-right</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Check className="h-3.5 w-3.5" /> The app appears on your home screen
              </p>
            </div>
          </li>
        </ol>

        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          Once installed, open the app from your home screen — you'll get push notifications, full-screen view and faster loading.
        </p>

        <Button onClick={() => onOpenChange(false)} className="w-full mt-2">Got it</Button>
      </DialogContent>
    </Dialog>
  );
};

export default IosInstallGuideDialog;
