
-- 1. Fix residents visibility: all authenticated users can view all residents
CREATE POLICY "All authenticated can view residents"
ON public.residents
FOR SELECT
TO authenticated
USING (true);

-- Owners can insert their own tenants
CREATE POLICY "Owners can insert tenants"
ON public.residents
FOR INSERT
TO authenticated
WITH CHECK (
  resident_type = 'tenant' AND owner_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND resident_id = residents.owner_id)
);

-- Owners can update their own tenants
CREATE POLICY "Owners can update tenants"
ON public.residents
FOR UPDATE
TO authenticated
USING (
  resident_type = 'tenant' AND owner_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND resident_id = residents.owner_id)
);

-- Owners can delete their own tenants
CREATE POLICY "Owners can delete tenants"
ON public.residents
FOR DELETE
TO authenticated
USING (
  resident_type = 'tenant' AND owner_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND resident_id = residents.owner_id)
);

-- 2. Create audit_log table
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_data jsonb,
  new_data jsonb,
  performed_by uuid,
  performed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Create audit trigger function
CREATE OR REPLACE FUNCTION public.log_audit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, performed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, performed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, performed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 4. Attach triggers
CREATE TRIGGER maintenance_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_collections
FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

CREATE TRIGGER expenses_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
