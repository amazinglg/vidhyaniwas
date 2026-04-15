
-- Fix Issue 1: Add storage policies for admin uploads to any folder
CREATE POLICY "Admins can upload any photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update any photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'photos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete any photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'photos' AND public.is_admin(auth.uid()));

-- Fix Issue 5: Add house_no and lane_no to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS house_no text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lane_no text;

-- Update handle_new_user to save house_no and lane_no
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, mobile, house_no, lane_no)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    COALESCE(NEW.raw_user_meta_data->>'house_no', ''),
    COALESCE(NEW.raw_user_meta_data->>'lane_no', '')
  );
  RETURN NEW;
END;
$$;

-- Backfill existing profiles with house_no/lane_no from auth.users metadata
UPDATE public.profiles p
SET 
  house_no = COALESCE(u.raw_user_meta_data->>'house_no', ''),
  lane_no = COALESCE(u.raw_user_meta_data->>'lane_no', '')
FROM auth.users u
WHERE p.user_id = u.id AND (p.house_no IS NULL OR p.house_no = '');
