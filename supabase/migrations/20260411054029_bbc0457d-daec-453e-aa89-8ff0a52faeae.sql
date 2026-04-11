
-- Create function to auto-assign complaints to supervisor
CREATE OR REPLACE FUNCTION public.auto_assign_complaint_to_supervisor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _supervisor_name text;
BEGIN
  SELECT p.full_name INTO _supervisor_name
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'supervisor'
  LIMIT 1;

  IF _supervisor_name IS NOT NULL THEN
    NEW.assigned_to := _supervisor_name;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for auto-assignment
DROP TRIGGER IF EXISTS trg_auto_assign_complaint ON public.complaints;
CREATE TRIGGER trg_auto_assign_complaint
  BEFORE INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_complaint_to_supervisor();

-- Add is_supervisor function
CREATE OR REPLACE FUNCTION public.is_supervisor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'supervisor'
  )
$$;

-- RLS: Supervisors can view all complaints
CREATE POLICY "Supervisors can view complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (public.is_supervisor(auth.uid()));

-- RLS: Supervisors can update complaints (status + comments)
CREATE POLICY "Supervisors can update complaints"
ON public.complaints
FOR UPDATE
TO authenticated
USING (public.is_supervisor(auth.uid()));
