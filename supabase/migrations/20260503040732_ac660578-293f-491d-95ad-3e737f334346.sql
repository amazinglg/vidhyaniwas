
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS audience_type text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS audience_user_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS outcome_released boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS outcome_released_at timestamptz;

-- Replace SELECT policy: admins see all; others see only their audience
DROP POLICY IF EXISTS "Authenticated can view active polls" ON public.polls;
CREATE POLICY "Users can view targeted polls"
ON public.polls FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR audience_type = 'all'
  OR (audience_type = 'admins' AND is_admin(auth.uid()))
  OR (audience_type = 'specific' AND auth.uid() = ANY (audience_user_ids))
);

-- Tighten vote insert: must be in audience and poll active
DROP POLICY IF EXISTS "Users can insert own vote" ON public.poll_votes;
CREATE POLICY "Users can insert own vote"
ON public.poll_votes FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_id
      AND p.is_active = true
      AND (
        is_admin(auth.uid())
        OR p.audience_type = 'all'
        OR (p.audience_type = 'admins' AND is_admin(auth.uid()))
        OR (p.audience_type = 'specific' AND auth.uid() = ANY (p.audience_user_ids))
      )
  )
);

DROP POLICY IF EXISTS "Users can update own vote" ON public.poll_votes;
CREATE POLICY "Users can update own vote"
ON public.poll_votes FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_id AND p.is_active = true
      AND (
        is_admin(auth.uid())
        OR p.audience_type = 'all'
        OR (p.audience_type = 'admins' AND is_admin(auth.uid()))
        OR (p.audience_type = 'specific' AND auth.uid() = ANY (p.audience_user_ids))
      )
  )
);
