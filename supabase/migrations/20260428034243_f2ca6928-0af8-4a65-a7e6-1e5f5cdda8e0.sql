CREATE OR REPLACE FUNCTION public.auto_assign_complaint_to_supervisor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _supervisor_name text;
BEGIN
  -- Skip if assigned_to is already explicitly set
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> '' THEN
    RETURN NEW;
  END IF;

  -- 1) Prefer a real user with the 'supervisor' role
  SELECT p.full_name INTO _supervisor_name
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'supervisor'
  LIMIT 1;

  -- 2) Fallback: anyone listed as a Supervisor in society_management
  IF _supervisor_name IS NULL THEN
    SELECT name INTO _supervisor_name
    FROM public.society_management
    WHERE role_title ILIKE '%supervisor%'
    ORDER BY display_order ASC
    LIMIT 1;
  END IF;

  IF _supervisor_name IS NOT NULL THEN
    NEW.assigned_to := _supervisor_name;
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill existing complaints that have no assignee
UPDATE public.complaints c
SET assigned_to = COALESCE(
  (SELECT p.full_name FROM public.user_roles ur JOIN public.profiles p ON p.user_id = ur.user_id WHERE ur.role = 'supervisor' LIMIT 1),
  (SELECT name FROM public.society_management WHERE role_title ILIKE '%supervisor%' ORDER BY display_order ASC LIMIT 1)
)
WHERE (c.assigned_to IS NULL OR c.assigned_to = '');