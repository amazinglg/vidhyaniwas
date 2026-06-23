
-- 1. Add admin guard to generate_new_fy_dues
CREATE OR REPLACE FUNCTION public.generate_new_fy_dues(_target_year integer DEFAULT NULL::integer)
 RETURNS TABLE(resident_id uuid, new_due numeric, created boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _fy_year integer;
  _r record;
  _carry numeric;
  _amount numeric;
  _total numeric;
  _exists uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can generate FY dues';
  END IF;

  IF _target_year IS NULL THEN
    IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
      _fy_year := EXTRACT(YEAR FROM CURRENT_DATE)::int;
    ELSE
      _fy_year := EXTRACT(YEAR FROM CURRENT_DATE)::int - 1;
    END IF;
  ELSE
    _fy_year := _target_year;
  END IF;

  FOR _r IN
    SELECT id, maintenance_amount
    FROM public.residents
    WHERE is_active = true AND resident_type = 'owner'
  LOOP
    SELECT id INTO _exists
    FROM public.maintenance_collections
    WHERE maintenance_collections.resident_id = _r.id
      AND year = _fy_year
      AND month = 'Annual'
    LIMIT 1;

    IF _exists IS NOT NULL THEN
      resident_id := _r.id; new_due := 0; created := false;
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(due_amount), 0) INTO _carry
    FROM public.maintenance_collections
    WHERE maintenance_collections.resident_id = _r.id
      AND year < _fy_year
      AND status <> 'paid';

    _amount := COALESCE(_r.maintenance_amount, 0);
    _total := _amount + _carry;

    IF _total > 0 THEN
      INSERT INTO public.maintenance_collections (
        resident_id, year, month, total_maintenance, amount, due_amount, status
      ) VALUES (
        _r.id, _fy_year, 'Annual', _total, 0, _total, 'pending'
      );
      resident_id := _r.id; new_due := _total; created := true;
      RETURN NEXT;
    ELSE
      resident_id := _r.id; new_due := 0; created := false;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;

-- 2. Tighten inbox_notifications INSERT policy.
-- Triggers (SECURITY DEFINER) bypass RLS so they continue to work.
DROP POLICY IF EXISTS "Admins can insert inbox notifications" ON public.inbox_notifications;
CREATE POLICY "Admins can insert inbox notifications"
  ON public.inbox_notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
