CREATE TABLE IF NOT EXISTS public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notice_id uuid NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, notice_id)
);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_reads" ON public.notification_reads
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_reads" ON public.notification_reads
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_delete_own_reads" ON public.notification_reads
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON public.notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_notice ON public.notification_reads(notice_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_reads;