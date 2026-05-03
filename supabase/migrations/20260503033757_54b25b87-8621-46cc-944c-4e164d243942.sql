
-- 1. Add read/write columns
ALTER TABLE public.role_page_permissions
  ADD COLUMN IF NOT EXISTS can_read boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_write boolean NOT NULL DEFAULT false;

-- Backfill: existing 'allowed' implies read access; write defaults off
UPDATE public.role_page_permissions
SET can_read = allowed
WHERE can_read IS DISTINCT FROM allowed;

-- 2. Helper: check page permission
CREATE OR REPLACE FUNCTION public.has_page_permission(_user_id uuid, _page text, _action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allowed boolean := false;
BEGIN
  IF has_role(_user_id, 'master_admin'::app_role) THEN
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

-- 3. Master-admin-only: register a new role name (extends app_role enum)
CREATE OR REPLACE FUNCTION public.add_custom_role(_role_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'master_admin'::app_role) THEN
    RAISE EXCEPTION 'Only master admin can add roles';
  END IF;
  IF _role_name IS NULL OR _role_name !~ '^[a-z][a-z0-9_]{1,30}$' THEN
    RAISE EXCEPTION 'Invalid role name. Use lowercase letters, digits, and underscores (2-31 chars).';
  END IF;
  EXECUTE format('ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS %L', _role_name);
END;
$$;

-- 4. Page-level write policies for matrix-granted access (non-admins).
-- Existing admin/role policies remain. These ADD permission, never remove it.

-- Residents
DROP POLICY IF EXISTS "Matrix write residents" ON public.residents;
CREATE POLICY "Matrix write residents" ON public.residents
  FOR ALL TO authenticated
  USING (has_page_permission(auth.uid(), 'residents', 'write'))
  WITH CHECK (has_page_permission(auth.uid(), 'residents', 'write'));

-- Maintenance
DROP POLICY IF EXISTS "Matrix write maintenance" ON public.maintenance_collections;
CREATE POLICY "Matrix write maintenance" ON public.maintenance_collections
  FOR ALL TO authenticated
  USING (has_page_permission(auth.uid(), 'maintenance', 'write'))
  WITH CHECK (has_page_permission(auth.uid(), 'maintenance', 'write'));

-- Expenses
DROP POLICY IF EXISTS "Matrix write expenses" ON public.expenses;
CREATE POLICY "Matrix write expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (has_page_permission(auth.uid(), 'expenses', 'write'))
  WITH CHECK (has_page_permission(auth.uid(), 'expenses', 'write'));

-- Notices
DROP POLICY IF EXISTS "Matrix write notices" ON public.notices;
CREATE POLICY "Matrix write notices" ON public.notices
  FOR ALL TO authenticated
  USING (has_page_permission(auth.uid(), 'notices', 'write'))
  WITH CHECK (has_page_permission(auth.uid(), 'notices', 'write'));

-- Complaints
DROP POLICY IF EXISTS "Matrix write complaints" ON public.complaints;
CREATE POLICY "Matrix write complaints" ON public.complaints
  FOR ALL TO authenticated
  USING (has_page_permission(auth.uid(), 'complaints', 'write'))
  WITH CHECK (has_page_permission(auth.uid(), 'complaints', 'write'));

-- Polls
DROP POLICY IF EXISTS "Matrix write polls" ON public.polls;
CREATE POLICY "Matrix write polls" ON public.polls
  FOR ALL TO authenticated
  USING (has_page_permission(auth.uid(), 'polls', 'write'))
  WITH CHECK (has_page_permission(auth.uid(), 'polls', 'write'));

-- Society Management
DROP POLICY IF EXISTS "Matrix write society_management" ON public.society_management;
CREATE POLICY "Matrix write society_management" ON public.society_management
  FOR ALL TO authenticated
  USING (has_page_permission(auth.uid(), 'society_management', 'write'))
  WITH CHECK (has_page_permission(auth.uid(), 'society_management', 'write'));
