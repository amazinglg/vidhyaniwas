
-- Add is_visible column to expenses (may already exist from failed migration)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

-- Add is_visible column to maintenance_collections
ALTER TABLE public.maintenance_collections ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

-- Update is_admin function using text cast to avoid enum commit issue
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text IN ('master_admin', 'president', 'vice_president', 'supervisor', 'treasury_head', 'secretary')
  )
$$;

-- Allow residents to view visible expenses
CREATE POLICY "Residents can view visible expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (is_visible = true AND NOT is_admin(auth.uid()) AND NOT is_coordinator(auth.uid()));

-- Allow coordinators to view visible expenses  
CREATE POLICY "Coordinators can view visible expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (is_visible = true AND is_coordinator(auth.uid()));

-- Allow authenticated to view visible maintenance records
CREATE POLICY "Authenticated can view visible maintenance"
ON public.maintenance_collections
FOR SELECT
TO authenticated
USING (is_visible = true);
