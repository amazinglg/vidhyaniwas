CREATE TABLE IF NOT EXISTS public.app_user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_key text NOT NULL,
  platform text NOT NULL DEFAULT 'web',
  display_mode text NOT NULL DEFAULT 'browser',
  user_agent text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_key)
);

ALTER TABLE public.app_user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can upsert own app devices" ON public.app_user_devices;
CREATE POLICY "Users can upsert own app devices"
ON public.app_user_devices FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own app devices" ON public.app_user_devices;
CREATE POLICY "Users can update own app devices"
ON public.app_user_devices FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own app devices" ON public.app_user_devices;
CREATE POLICY "Users can view own app devices"
ON public.app_user_devices FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view app devices" ON public.app_user_devices;
CREATE POLICY "Admins can view app devices"
ON public.app_user_devices FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_app_user_devices_user_last_seen
ON public.app_user_devices(user_id, last_seen_at DESC);