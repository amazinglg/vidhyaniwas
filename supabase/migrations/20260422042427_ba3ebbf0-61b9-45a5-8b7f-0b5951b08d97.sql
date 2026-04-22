-- Enable realtime for notification source tables (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_collections;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Ensure full row data is delivered on UPDATE for complaint resolution detection
ALTER TABLE public.complaints REPLICA IDENTITY FULL;