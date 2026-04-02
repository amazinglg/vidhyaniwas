
-- Add pending_role column to residents
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS pending_role text DEFAULT 'resident';

-- Update the assign_default_role function to check for pre-assigned role from residents table
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _resident_id uuid;
  _pending_role text;
BEGIN
  -- Try to find a matching resident by mobile number
  SELECT id, COALESCE(pending_role, 'resident') INTO _resident_id, _pending_role
  FROM public.residents
  WHERE mobile = NEW.mobile
  LIMIT 1;

  -- If matched, link profile to resident and use their pre-assigned role
  IF _resident_id IS NOT NULL THEN
    UPDATE public.profiles SET resident_id = _resident_id WHERE user_id = NEW.user_id;
    
    -- Cast the pending_role to app_role enum
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, _pending_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Default to resident role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'resident'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
