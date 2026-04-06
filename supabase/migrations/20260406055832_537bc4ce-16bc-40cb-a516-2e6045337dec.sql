
-- Realtime for remaining tables (skip already-added ones)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.family_member_details;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Auto-add approved user to residents table
CREATE OR REPLACE FUNCTION public.on_profile_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_meta jsonb;
  _mobile text;
  _full_name text;
  _house_no text;
  _lane_no text;
  _resident_type text;
  _owner_id uuid;
  _existing_resident_id uuid;
BEGIN
  IF OLD.is_approved = false AND NEW.is_approved = true THEN
    SELECT raw_user_meta_data INTO _user_meta FROM auth.users WHERE id = NEW.user_id;
    _mobile := NEW.mobile;
    _full_name := NEW.full_name;
    _house_no := _user_meta->>'house_no';
    _lane_no := _user_meta->>'lane_no';
    _resident_type := COALESCE(_user_meta->>'resident_type', 'owner');
    
    SELECT id INTO _existing_resident_id FROM public.residents WHERE mobile = _mobile LIMIT 1;
    
    IF _existing_resident_id IS NULL AND _house_no IS NOT NULL AND _lane_no IS NOT NULL THEN
      IF _resident_type IN ('member', 'tenant') THEN
        SELECT id INTO _owner_id FROM public.residents 
        WHERE house_no = _house_no AND lane_no = _lane_no AND resident_type = 'owner' LIMIT 1;
      END IF;
      
      INSERT INTO public.residents (name, house_no, lane_no, mobile, resident_type, owner_id)
      VALUES (_full_name, _house_no, _lane_no, _mobile, _resident_type, _owner_id)
      RETURNING id INTO _existing_resident_id;
    END IF;
    
    IF _existing_resident_id IS NOT NULL AND NEW.resident_id IS NULL THEN
      NEW.resident_id := _existing_resident_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_approved_trigger ON public.profiles;
CREATE TRIGGER on_profile_approved_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.on_profile_approved();
