
-- FY rollover: generate next FY annual due entries with carry-over
CREATE OR REPLACE FUNCTION public.generate_new_fy_dues(_target_year integer DEFAULT NULL)
RETURNS TABLE(resident_id uuid, new_due numeric, created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _fy_year integer;
  _r record;
  _carry numeric;
  _amount numeric;
  _total numeric;
  _exists uuid;
BEGIN
  -- Default: next FY based on current date (April → March)
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
    -- Skip if Annual entry already exists for this FY
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

    -- Sum unpaid dues from PRIOR years (carry-over)
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
$$;

-- Allow only admins to invoke the manual RPC
REVOKE ALL ON FUNCTION public.generate_new_fy_dues(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_new_fy_dues(integer) TO authenticated;

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any prior schedule with the same name to keep it idempotent
DO $$
BEGIN
  PERFORM cron.unschedule('fy-rollover-april-1')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fy-rollover-april-1');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule April 1 at 00:05 IST = 18:35 UTC the previous day (March 31)
SELECT cron.schedule(
  'fy-rollover-april-1',
  '35 18 31 3 *',
  $$ SELECT public.generate_new_fy_dues(); $$
);
