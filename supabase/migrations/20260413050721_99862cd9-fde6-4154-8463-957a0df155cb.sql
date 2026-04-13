
-- 1. Remove the broad storage policies (non-ownership-scoped)
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;

-- 2. Fix complaints UPDATE policy for residents - add WITH CHECK
DROP POLICY IF EXISTS "Residents can update own complaints" ON public.complaints;
CREATE POLICY "Residents can update own complaints"
ON public.complaints
FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = complaints.resident_id))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = complaints.resident_id));

-- 3. Remove user_roles from realtime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.user_roles;
  END IF;
END $$;

-- 4. Restrict residents view - replace with a function-based view that hides sensitive data for non-admin users
-- Actually the directory needs name/house/lane visible. This is intentional for the app's resident directory feature.
-- The policy is correct - residents need to see each other's basic info for society directory.
