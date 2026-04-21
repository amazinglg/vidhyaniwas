import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const sb = supabase as any;

export const useUnreadNotices = () => {
  const { user, session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const userIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) { setUnreadCount(0); return; }
    const [{ data: notices }, { data: reads }] = await Promise.all([
      supabase.from('notices').select('id').eq('is_active', true),
      sb.from('notification_reads').select('notice_id').eq('user_id', uid),
    ]);
    const readIds = new Set((reads || []).map((r: any) => r.notice_id));
    const unread = (notices || []).filter((n: any) => !readIds.has(n.id)).length;
    setUnreadCount(unread);
  }, []);

  useEffect(() => {
    if (!session || !user) { userIdRef.current = null; return; }
    userIdRef.current = user.id;
    refresh();

    const channel = supabase.channel(`unread-notices-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    channel
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'notices' }, () => refresh())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'notification_reads', filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.access_token, user?.id, refresh]);

  const markAllRead = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    const { data: notices } = await supabase.from('notices').select('id').eq('is_active', true);
    if (!notices || notices.length === 0) { setUnreadCount(0); return; }
    const rows = notices.map((n: any) => ({ user_id: uid, notice_id: n.id }));
    await sb.from('notification_reads').upsert(rows, { onConflict: 'user_id,notice_id', ignoreDuplicates: true });
    setUnreadCount(0);
  }, []);

  return { unreadCount, markAllRead, refresh };
};
