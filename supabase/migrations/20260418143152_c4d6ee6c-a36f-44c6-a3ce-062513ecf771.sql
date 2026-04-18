
CREATE TABLE IF NOT EXISTS public.app_releases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  released_at timestamptz NOT NULL DEFAULT now(),
  released_by uuid,
  note text
);

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view releases"
ON public.app_releases FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Master admin can insert releases"
ON public.app_releases FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_releases;
ALTER TABLE public.app_releases REPLICA IDENTITY FULL;
