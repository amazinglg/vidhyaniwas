import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { requestNotificationPermission } from '@/hooks/useWebNotifications';
import { subscribeToWebPush } from '@/lib/webPush';
import { toast } from 'sonner';

type Status = 'unsupported' | 'denied' | 'default' | 'granted-not-subscribed' | 'subscribed' | 'loading';

/**
 * Profile card that lets a user enable / disable push notifications for THIS
 * device. Shows clear status, instructions for blocked permissions, and a
 * disable option that removes the subscription from the DB so the user no
 * longer receives push on this device.
 */
const NotificationSettingsCard = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [working, setWorking] = useState(false);

  const refresh = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    if (Notification.permission === 'default') { setStatus('default'); return; }
    // granted — check if a subscription exists for this device
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setStatus('granted-not-subscribed'); return; }
      // Check DB row for this endpoint
      if (user?.id) {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint)
          .maybeSingle();
        setStatus(data ? 'subscribed' : 'granted-not-subscribed');
      } else {
        setStatus('granted-not-subscribed');
      }
    } catch {
      setStatus('granted-not-subscribed');
    }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const handleEnable = async () => {
    if (!user?.id) return;
    setWorking(true);
    try {
      const result = await requestNotificationPermission();
      if (result !== 'granted') {
        toast.error(result === 'denied' ? 'Permission blocked' : 'Permission not granted');
        await refresh();
        return;
      }
      const ok = await subscribeToWebPush(user.id);
      if (ok) {
        toast.success('Notifications enabled on this device');
      } else {
        toast.error('Could not subscribe. Please try again.');
      }
      await refresh();
    } finally {
      setWorking(false);
    }
  };

  const handleDisable = async () => {
    if (!user?.id) return;
    setWorking(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      toast.success('Notifications disabled on this device');
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not disable notifications');
    } finally {
      setWorking(false);
    }
  };

  const renderBody = () => {
    switch (status) {
      case 'loading':
        return <p className="text-xs text-muted-foreground">Checking…</p>;
      case 'unsupported':
        return (
          <p className="text-xs text-muted-foreground">
            Your browser doesn't support push notifications. On iPhone, install the app to your Home Screen first (Share → Add to Home Screen).
          </p>
        );
      case 'denied':
        return (
          <>
            <p className="text-xs text-muted-foreground">
              Notifications are <span className="font-medium text-destructive">blocked</span> in your browser settings.
              To enable: tap the lock/info icon next to the address bar → Site settings → Notifications → Allow, then refresh.
            </p>
          </>
        );
      case 'default':
      case 'granted-not-subscribed':
        return (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Get instant alerts for notices, maintenance and complaints — even when the app is closed.
            </p>
            <Button size="sm" onClick={handleEnable} disabled={working} className="gradient-warm text-primary-foreground">
              <Bell className="h-4 w-4 mr-2" />
              {working ? 'Enabling…' : 'Enable Notifications'}
            </Button>
          </>
        );
      case 'subscribed':
        return (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              You're receiving push notifications on this device.
            </p>
            <Button size="sm" variant="outline" onClick={handleDisable} disabled={working}>
              <BellOff className="h-4 w-4 mr-2" />
              {working ? 'Disabling…' : 'Turn Off on This Device'}
            </Button>
          </>
        );
    }
  };

  const statusBadge = () => {
    switch (status) {
      case 'subscribed':
        return <Badge className="bg-success/15 text-success hover:bg-success/15 border-success/30 gap-1"><CheckCircle2 className="h-3 w-3" />On</Badge>;
      case 'denied':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Blocked</Badge>;
      case 'unsupported':
        return <Badge variant="outline">Unsupported</Badge>;
      case 'loading':
        return null;
      default:
        return <Badge variant="outline" className="gap-1"><BellOff className="h-3 w-3" />Off</Badge>;
    }
  };

  return (
    <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-warm shrink-0">
          <Bell className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-base font-bold font-display">Notifications</h3>
            {statusBadge()}
          </div>
          {renderBody()}
        </div>
      </div>
    </Card>
  );
};

export default NotificationSettingsCard;
