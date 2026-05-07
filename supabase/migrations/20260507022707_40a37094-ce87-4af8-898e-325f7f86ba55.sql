
-- Add resident_type column to profiles to surface signup intent in pending list
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resident_type text;

-- Update handle_new_user trigger to capture resident_type from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, mobile, house_no, lane_no, resident_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    COALESCE(NEW.raw_user_meta_data->>'house_no', ''),
    COALESCE(NEW.raw_user_meta_data->>'lane_no', ''),
    COALESCE(NEW.raw_user_meta_data->>'resident_type', 'owner')
  );
  RETURN NEW;
END;
$function$;

-- Backfill resident_type for existing pending profiles from auth.users metadata
UPDATE public.profiles p
SET resident_type = COALESCE(u.raw_user_meta_data->>'resident_type', 'owner')
FROM auth.users u
WHERE p.user_id = u.id AND p.resident_type IS NULL;
