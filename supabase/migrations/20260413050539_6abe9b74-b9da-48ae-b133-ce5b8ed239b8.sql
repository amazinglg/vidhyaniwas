
-- 1. Remove overly permissive residents SELECT policy
DROP POLICY IF EXISTS "All authenticated can view residents" ON public.residents;

CREATE POLICY "Authenticated can view active residents"
ON public.residents
FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. Remove overly permissive maintenance_collections SELECT policy
DROP POLICY IF EXISTS "Authenticated can view visible maintenance" ON public.maintenance_collections;

-- 3. Fix audit_log INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;

-- 4. Remove tables from realtime publication safely
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['residents','profiles','maintenance_collections','complaints','family_member_details','vehicles','expenses','notices','audit_log','maintenance_receipts'])
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- 5. Fix storage policies for photos bucket
DROP POLICY IF EXISTS "Anyone can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own photos" ON storage.objects;

CREATE POLICY "Authenticated users can update own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);
