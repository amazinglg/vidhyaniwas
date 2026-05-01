import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, MessageSquare, IndianRupee, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { requestNotificationPermission } from '@/hooks/useWebNotifications';
import { getStoredPushPreference, subscribeToWebPush } from '@/lib/webPush';
import { toast } from 'sonner';

const SHOWN_KEY = 'notif_welcome_modal_shown_v1';

/**
 * Friendly first-login modal that explains the value of notifications BEFORE
 * triggering the native browser permission prompt. Shows once per user (per
 * device) until they either Enable, "Maybe later", or already have permission.
 */
const NotificationWelcomeModal = () => {
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!session || !user) return;
    if (getStoredPushPreference(user.id)) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
    const shownFor = localStorage.getItem(SHOWN_KEY);
    if (shownFor === user.id) return;
    // Slight delay so it doesn't fight with login redirect / layout
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [session, user]);

  const markShown = () => {
    if (user?.id) localStorage.setItem(SHOWN_KEY, user.id);
  };

  const handleEnable = async () => {
    setWorking(true);
    try {
      const result = await requestNotificationPermission();
      if (result === 'granted' && user?.id) {
        const ok = await subscribeToWebPush(user.id);
        if (ok) {
          toast.success('Notifications enabled', {
            description: 'You\'ll now get instant alerts for notices, maintenance and complaints.',
          });
        } else {
          toast.warning('Permission granted but subscription failed. Try again from your profile.');
        }
      } else if (result === 'denied') {
        toast.error('Notifications blocked', {
          description: 'You can enable them later from your browser settings or profile page.',
        });
      }
    } finally {
      setWorking(false);
      markShown();
      setOpen(false);
    }
  };

  const handleLater = () => {
    markShown();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleLater(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/15 via-accent/10 to-background p-6 pb-4">
          <div className="flex items-center justify-center mb-3">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-warm shadow-lg">
                <Bell className="h-8 w-8 text-primary-foreground" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow ring-2 ring-background">
                3
              </span>
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold font-display">
            Stay in the loop
          </DialogTitle>
          <DialogDescription className="text-center text-sm mt-1">
            Get instant alerts on this device — even when the app is closed.
          </DialogDescription>
        </div>

        {/* Benefits list */}
        <div className="px-6 pb-2 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Society notices</p>
              <p className="text-xs text-muted-foreground">Be first to know about important announcements.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <IndianRupee className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium">Maintenance updates</p>
              <p className="text-xs text-muted-foreground">Receipts, due dates and payment confirmations.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/30">
              <MessageSquare className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Complaint responses</p>
              <p className="text-xs text-muted-foreground">Get notified when your complaint is updated or resolved.</p>
            </div>
          </div>
        </div>

        {/* Reassurance */}
        <div className="mx-6 my-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-snug">
            We only send you alerts that matter. No marketing, no spam.
            You can turn this off any time from <span className="font-medium text-foreground">My Profile</span>.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <Button
            onClick={handleEnable}
            disabled={working}
            className="w-full h-11 gradient-warm text-primary-foreground font-medium"
          >
            <Bell className="h-4 w-4 mr-2" />
            {working ? 'Enabling…' : 'Enable Notifications'}
          </Button>
          <Button
            onClick={handleLater}
            disabled={working}
            variant="ghost"
            className="w-full h-10 text-muted-foreground"
          >
            <BellOff className="h-4 w-4 mr-2" />
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationWelcomeModal;
