import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const sb = supabase as any;

export interface InboxNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const useInboxNotifications = (limit = 30) => {
  const { user, session } = useAuth();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) { setItems([]); return; }
    setLoading(true);
    const { data } = await sb
      .from('inbox_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    setItems(data || []);
    setLoading(false);
  }, [user?.id, limit]);

  useEffect(() => {
    if (!session || !user?.id) return;
    refresh();
    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on('postgres_changes' as any,
        { event: '*', schema: 'public', table: 'inbox_notifications', filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.access_token, user?.id, refresh]);

  const unreadCount = items.filter(i => !i.is_read).length;

  const markRead = useCallback(async (id: string) => {
    await sb.from('inbox_notifications').update({ is_read: true }).eq('id', id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    await sb.from('inbox_notifications').update({ is_read: true })
      .eq('user_id', user.id).eq('is_read', false);
  }, [user?.id]);

  const remove = useCallback(async (id: string) => {
    await sb.from('inbox_notifications').delete().eq('id', id);
  }, []);

  return { items, unreadCount, loading, refresh, markRead, markAllRead, remove };
};
