
-- 1. Update data first
UPDATE public.user_roles SET role = 'resident' WHERE role = 'supervisor';
UPDATE public.residents SET pending_role = 'resident' WHERE pending_role = 'supervisor';

-- 2. Drop dependent objects
DROP POLICY IF EXISTS "Master admin can manage roles" ON public.user_roles;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 3. Recreate enum without supervisor
ALTER TYPE public.app_role RENAME TO app_role_old;

CREATE TYPE public.app_role AS ENUM (
  'master_admin', 'president', 'vice_president', 'treasury_head', 'secretary', 'coordinator', 'resident'
);

ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;

DROP TYPE public.app_role_old;

-- 4. Recreate has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Recreate master admin policy
CREATE POLICY "Master admin can manage roles" ON public.user_roles
FOR ALL USING (has_role(auth.uid(), 'master_admin'::app_role));

-- 6. Update is_admin (remove supervisor)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text IN ('master_admin', 'president', 'vice_president', 'treasury_head', 'secretary')
  )
$$;

-- 7. Add is_approved to profiles (existing = true, new signups = false)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;

-- 8. Add tenant support columns
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS resident_type text NOT NULL DEFAULT 'owner';
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.residents(id) ON DELETE SET NULL;

-- 9. Update assign_default_role
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _resident_id uuid;
  _pending_role text;
BEGIN
  SELECT id, COALESCE(pending_role, 'resident') INTO _resident_id, _pending_role
  FROM public.residents
  WHERE mobile = NEW.mobile AND resident_type = 'owner'
  LIMIT 1;

  UPDATE public.profiles SET is_approved = false WHERE user_id = NEW.user_id;

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

-- 10. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.residents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_collections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
