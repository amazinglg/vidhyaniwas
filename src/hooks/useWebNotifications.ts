import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
};

const showBrowserNotification = (title: string, body: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'society-notice',
      renotify: true,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Fallback for mobile browsers that don't support Notification constructor
  }
};

export const useWebNotifications = () => {
  const { session, user } = useAuth();
  const hasRequested = useRef(false);

  // Request permission on first load after login
  useEffect(() => {
    if (!session || hasRequested.current) return;
    hasRequested.current = true;
    // Small delay so it doesn't block the UI
    const timer = setTimeout(() => {
      requestNotificationPermission();
    }, 2000);
    return () => clearTimeout(timer);
  }, [session]);

  // Listen for new notices via Realtime
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('notices-realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notices' },
        (payload) => {
          const notice = payload.new as { title: string; content: string; created_by: string | null };
          // Don't notify the person who created the notice
          if (notice.created_by === user?.id) return;
          
          // Show in-app toast
          toast.info(`📢 ${notice.title}`, { description: notice.content?.substring(0, 100) });
          
          // Show browser notification
          showBrowserNotification(
            `📢 New Notice: ${notice.title}`,
            notice.content?.substring(0, 150) || 'A new notice has been published.'
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, user?.id]);
};
