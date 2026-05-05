-- Remove Polls module and all related permission rows
DROP TABLE IF EXISTS public.poll_votes CASCADE;
DROP TABLE IF EXISTS public.polls CASCADE;
DELETE FROM public.role_page_permissions WHERE page_key = 'polls';

-- Ensure the matrix has read/write columns and current defaults
ALTER TABLE public.role_page_permissions
  ADD COLUMN IF NOT EXISTS can_read boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_write boolean NOT NULL DEFAULT false;

UPDATE public.role_page_permissions
SET can_read = COALESCE(can_read, allowed, true),
    can_write = COALESCE(can_write, false)
WHERE page_key <> 'polls';

-- Master Admin is always unrestricted through functions, so no matrix rows are needed for that role.
DELETE FROM public.role_page_permissions WHERE role = 'master_admin';

-- Seed/repair current page permissions for non-master roles.
INSERT INTO public.role_page_permissions (role, page_key, allowed, can_read, can_write)
VALUES
  ('president','dashboard',true,true,true),('president','residents',true,true,true),('president','maintenance',true,true,true),('president','expenses',true,true,true),('president','notices',true,true,true),('president','complaints',true,true,true),('president','society_management',true,true,true),
  ('vice_president','dashboard',true,true,true),('vice_president','residents',true,true,true),('vice_president','maintenance',true,true,true),('vice_president','expenses',true,true,true),('vice_president','notices',true,true,true),('vice_president','complaints',true,true,true),('vice_president','society_management',true,true,true),
  ('treasury_head','dashboard',true,true,true),('treasury_head','residents',true,true,true),('treasury_head','maintenance',true,true,true),('treasury_head','expenses',true,true,true),('treasury_head','notices',true,true,true),('treasury_head','complaints',true,true,true),('treasury_head','society_management',true,true,true),
  ('secretary','dashboard',true,true,true),('secretary','residents',true,true,true),('secretary','maintenance',true,true,true),('secretary','expenses',true,true,true),('secretary','notices',true,true,true),('secretary','complaints',true,true,true),('secretary','society_management',true,true,true),
  ('supervisor','complaints',true,true,true),('supervisor','notices',true,true,false),('supervisor','society_management',true,true,false),
  ('coordinator','residents',true,true,false),('coordinator','notices',true,true,false),('coordinator','society_management',true,true,false),
  ('resident','residents',true,true,false),('resident','maintenance',true,true,false),('resident','expenses',true,true,false),('resident','notices',true,true,false),('resident','society_management',true,true,false)
ON CONFLICT (role, page_key) DO UPDATE SET
  allowed = EXCLUDED.allowed,
  can_read = EXCLUDED.can_read,
  can_write = EXCLUDED.can_write,
  updated_at = now();

-- Keep the permission function authoritative for non-master users.
CREATE OR REPLACE FUNCTION public.has_page_permission(_user_id uuid, _page text, _action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allowed boolean := false;
BEGIN
  IF public.has_role(_user_id, 'master_admin'::app_role) THEN
    RETURN true;
  END IF;

  SELECT bool_or(
    CASE WHEN _action = 'write' THEN rpp.can_write ELSE rpp.can_read END
  )
  INTO _allowed
  FROM public.role_page_permissions rpp
  JOIN public.user_roles ur ON ur.role = rpp.role
  WHERE ur.user_id = _user_id
    AND rpp.page_key = _page;

  RETURN COALESCE(_allowed, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_page_permission(uuid, text, text) TO authenticated;

-- Matrix-aware read policies. Existing owner/self policies remain so profile pages still work.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Matrix read residents" ON public.residents;
  CREATE POLICY "Matrix read residents" ON public.residents
    FOR SELECT TO authenticated
    USING (public.has_page_permission(auth.uid(), 'residents', 'read'));

  DROP POLICY IF EXISTS "Matrix read maintenance" ON public.maintenance_collections;
  CREATE POLICY "Matrix read maintenance" ON public.maintenance_collections
    FOR SELECT TO authenticated
    USING (public.has_page_permission(auth.uid(), 'maintenance', 'read'));

  DROP POLICY IF EXISTS "Matrix read expenses" ON public.expenses;
  CREATE POLICY "Matrix read expenses" ON public.expenses
    FOR SELECT TO authenticated
    USING (public.has_page_permission(auth.uid(), 'expenses', 'read') AND is_visible = true);

  DROP POLICY IF EXISTS "Matrix read notices" ON public.notices;
  CREATE POLICY "Matrix read notices" ON public.notices
    FOR SELECT TO authenticated
    USING (public.has_page_permission(auth.uid(), 'notices', 'read') AND is_active = true AND is_draft = false);

  DROP POLICY IF EXISTS "Matrix read complaints" ON public.complaints;
  CREATE POLICY "Matrix read complaints" ON public.complaints
    FOR SELECT TO authenticated
    USING (public.has_page_permission(auth.uid(), 'complaints', 'read'));

  DROP POLICY IF EXISTS "Matrix read society_management" ON public.society_management;
  CREATE POLICY "Matrix read society_management" ON public.society_management
    FOR SELECT TO authenticated
    USING (public.has_page_permission(auth.uid(), 'society_management', 'read'));
END $$;

-- Master-admin-only complete cleanup for an app user and their linked resident records.
CREATE OR REPLACE FUNCTION public.cleanup_deleted_app_user(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _resident_id uuid;
  _mobile text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'master_admin'::app_role) THEN
    RAISE EXCEPTION 'Only master admin can delete users completely';
  END IF;

  SELECT resident_id, mobile INTO _resident_id, _mobile
  FROM public.profiles
  WHERE user_id = _target_user_id
  LIMIT 1;

  DELETE FROM public.inbox_notifications WHERE user_id = _target_user_id;
  DELETE FROM public.notification_reads WHERE user_id = _target_user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = _target_user_id;
  DELETE FROM public.login_attempts WHERE mobile = _mobile;
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;

  IF _resident_id IS NOT NULL THEN
    DELETE FROM public.family_member_details WHERE resident_id = _resident_id;
    DELETE FROM public.vehicles WHERE resident_id = _resident_id;
    DELETE FROM public.complaints WHERE resident_id = _resident_id OR created_by = _target_user_id;
    DELETE FROM public.maintenance_receipts WHERE resident_id = _resident_id;
    DELETE FROM public.maintenance_collections WHERE resident_id = _resident_id;
    DELETE FROM public.residents WHERE id = _resident_id OR owner_id = _resident_id;
  END IF;

  DELETE FROM public.profiles WHERE user_id = _target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_deleted_app_user(uuid) TO authenticated;

-- Correct old receipt society name defaults going forward.
ALTER TABLE public.maintenance_receipts
  ALTER COLUMN society_name SET DEFAULT 'Shri Vidhya Niwas Society';