-- Add attachments column to complaints
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}'::text[];

-- Trigger to enforce 5 active complaint limit per resident (admins bypass)
CREATE OR REPLACE FUNCTION public.enforce_complaint_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _active_count int;
BEGIN
  -- Admins can override
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO _active_count
  FROM public.complaints
  WHERE resident_id = NEW.resident_id
    AND status IN ('open', 'in_progress');

  IF _active_count >= 5 THEN
    RAISE EXCEPTION 'You already have 5 active complaints. Please wait for some to be resolved before raising a new one.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_complaint_limit ON public.complaints;
CREATE TRIGGER check_complaint_limit
BEFORE INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.enforce_complaint_limit();

-- Create private storage bucket for complaint attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-attachments', 'complaint-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for complaint-attachments
-- Path convention: {user_id}/{complaint_id}/{filename}

CREATE POLICY "Users can upload own complaint attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'complaint-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own complaint attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins and supervisors can view all complaint attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-attachments'
  AND (public.is_admin(auth.uid()) OR public.is_supervisor(auth.uid()))
);

CREATE POLICY "Users can delete own complaint attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'complaint-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can delete any complaint attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'complaint-attachments'
  AND public.is_admin(auth.uid())
);