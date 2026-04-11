import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestNotificationPermission } from '@/hooks/useWebNotifications';

const DISMISSED_KEY = 'notification_prompt_dismissed';

const NotificationPermissionBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    // If already granted or the user explicitly dismissed, hide
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') return;
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;
    // Show after a short delay so it doesn't flash on fast loads
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const handleEnable = async () => {
    const result = await requestNotificationPermission();
    if (result === 'granted' || result === 'denied') {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Enable Notifications</p>
          <p className="text-xs text-muted-foreground">Get instant alerts for notices &amp; updates.</p>
        </div>
        <Button size="sm" onClick={handleEnable} className="shrink-0">
          Allow
        </Button>
        <button onClick={handleDismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationPermissionBanner;
