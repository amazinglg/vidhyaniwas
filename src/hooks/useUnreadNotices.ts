import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadNotices = () => {
  const { user, session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) { setUnreadCount(0); return; }
    const [{ data: notices }, { data: reads }] = await Promise.all([
      supabase.from('notices').select('id').eq('is_active', true),
      supabase.from('notification_reads').select('notice_id').eq('user_id', user.id),
    ]);
    const readIds = new Set((reads || []).map((r: any) => r.notice_id));
    const unread = (notices || []).filter((n: any) => !readIds.has(n.id)).length;
    setUnreadCount(unread);
  }, [user]);

  useEffect(() => {
    if (!session || !user) return;
    refresh();

    const channel = supabase
      .channel('unread-notices-tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads', filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, user, refresh]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const { data: notices } = await supabase.from('notices').select('id').eq('is_active', true);
    if (!notices || notices.length === 0) return;
    const rows = notices.map((n: any) => ({ user_id: user.id, notice_id: n.id }));
    await supabase.from('notification_reads').upsert(rows, { onConflict: 'user_id,notice_id', ignoreDuplicates: true });
    setUnreadCount(0);
  }, [user]);

  return { unreadCount, markAllRead, refresh };
};
