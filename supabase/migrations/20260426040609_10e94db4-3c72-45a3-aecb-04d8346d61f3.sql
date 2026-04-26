ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audience_type text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS audience_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Replace the resident-visibility policy so drafts don't show to everyone
DROP POLICY IF EXISTS "All authenticated can view active notices" ON public.notices;

CREATE POLICY "Authenticated can view published active notices"
  ON public.notices FOR SELECT
  TO authenticated
  USING (is_active = true AND is_draft = false);

CREATE POLICY "Admins can view their own drafts"
  ON public.notices FOR SELECT
  TO authenticated
  USING (is_draft = true AND is_admin(auth.uid()));
