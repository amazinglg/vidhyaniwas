
-- Create society_management table
CREATE TABLE public.society_management (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  photo_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.society_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view society management"
  ON public.society_management FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage society management"
  ON public.society_management FOR ALL
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_society_management_updated_at
  BEFORE UPDATE ON public.society_management
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update assign_default_role to auto-approve if mobile matches existing resident
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _resident_id uuid;
  _pending_role text;
  _mobile_exists boolean;
BEGIN
  SELECT id, COALESCE(pending_role, 'resident') INTO _resident_id, _pending_role
  FROM public.residents
  WHERE mobile = NEW.mobile AND resident_type = 'owner'
  LIMIT 1;

  -- Check if mobile exists in residents table at all
  SELECT EXISTS (SELECT 1 FROM public.residents WHERE mobile = NEW.mobile) INTO _mobile_exists;

  -- Auto-approve if mobile exists in residents, otherwise pending
  IF _mobile_exists THEN
    UPDATE public.profiles SET is_approved = true WHERE user_id = NEW.user_id;
  ELSE
    UPDATE public.profiles SET is_approved = false WHERE user_id = NEW.user_id;
  END IF;

  IF _resident_id IS NOT NULL THEN
    UPDATE public.profiles SET resident_id = _resident_id WHERE user_id = NEW.user_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, _pending_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'resident'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Allow residents to update their own complaints (for withdraw)
CREATE POLICY "Residents can update own complaints"
  ON public.complaints FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.resident_id = complaints.resident_id
  ));

-- Enable realtime on profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.society_management;
