-- 1. Add parent_id column for parent/child relationship
ALTER TABLE public.maintenance_collections
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.maintenance_collections(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_maintenance_collections_parent_id ON public.maintenance_collections(parent_id);

-- 2. Update auto_create_receipt to skip parent rows (only create receipts for child payment events)
CREATE OR REPLACE FUNCTION public.auto_create_receipt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _resident_name text;
  _house_no text;
  _lane_no text;
BEGIN
  -- Skip parent (FY summary) rows: they have no payment event of their own
  IF NEW.parent_id IS NULL AND COALESCE(NEW.amount, 0) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT name, house_no, lane_no INTO _resident_name, _house_no, _lane_no
  FROM public.residents WHERE id = NEW.resident_id;

  INSERT INTO public.maintenance_receipts (
    maintenance_collection_id, resident_id, receipt_date, total_maintenance,
    amount_paid, due_amount, payment_mode, receipt_no, month, year,
    resident_name, house_no, lane_no
  ) VALUES (
    NEW.id, NEW.resident_id, COALESCE(NEW.paid_date, CURRENT_DATE), NEW.total_maintenance,
    NEW.amount, NEW.due_amount, NEW.payment_mode, NEW.receipt_no, NEW.month, NEW.year,
    _resident_name, _house_no, _lane_no
  )
  ON CONFLICT (maintenance_collection_id) DO UPDATE SET
    amount_paid = EXCLUDED.amount_paid,
    due_amount = EXCLUDED.due_amount,
    payment_mode = EXCLUDED.payment_mode,
    receipt_no = EXCLUDED.receipt_no,
    receipt_date = EXCLUDED.receipt_date,
    total_maintenance = EXCLUDED.total_maintenance,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- 3. Migrate existing rows: group by (resident, FY); earliest = parent; rest become children.
DO $migrate$
DECLARE
  grp RECORD;
  parent_row RECORD;
  parent_total numeric;
  total_paid numeric;
BEGIN
  FOR grp IN
    SELECT resident_id,
           CASE WHEN EXTRACT(MONTH FROM COALESCE(paid_date, created_at::date)) >= 4
                THEN EXTRACT(YEAR FROM COALESCE(paid_date, created_at::date))::int
                ELSE EXTRACT(YEAR FROM COALESCE(paid_date, created_at::date))::int - 1
           END AS fy_start
    FROM public.maintenance_collections
    WHERE parent_id IS NULL
    GROUP BY 1, 2
  LOOP
    SELECT * INTO parent_row
    FROM public.maintenance_collections
    WHERE resident_id = grp.resident_id
      AND parent_id IS NULL
      AND (CASE WHEN EXTRACT(MONTH FROM COALESCE(paid_date, created_at::date)) >= 4
                THEN EXTRACT(YEAR FROM COALESCE(paid_date, created_at::date))::int
                ELSE EXTRACT(YEAR FROM COALESCE(paid_date, created_at::date))::int - 1
           END) = grp.fy_start
    ORDER BY created_at ASC
    LIMIT 1;

    parent_total := COALESCE(parent_row.total_maintenance, 0);

    -- If parent itself has a payment (amount > 0), spin off a child mirroring that payment
    IF COALESCE(parent_row.amount, 0) > 0 THEN
      INSERT INTO public.maintenance_collections (
        parent_id, resident_id, amount, due_amount, total_maintenance,
        paid_date, month, year, status, payment_mode, receipt_no, created_at, updated_at
      ) VALUES (
        parent_row.id, parent_row.resident_id, parent_row.amount, 0, parent_row.total_maintenance,
        parent_row.paid_date, parent_row.month, parent_row.year, 'paid', parent_row.payment_mode,
        parent_row.receipt_no, parent_row.created_at, parent_row.updated_at
      );
    END IF;

    -- Re-parent all other top-level rows in this group
    UPDATE public.maintenance_collections
    SET parent_id = parent_row.id
    WHERE resident_id = grp.resident_id
      AND id <> parent_row.id
      AND parent_id IS NULL
      AND (CASE WHEN EXTRACT(MONTH FROM COALESCE(paid_date, created_at::date)) >= 4
                THEN EXTRACT(YEAR FROM COALESCE(paid_date, created_at::date))::int
                ELSE EXTRACT(YEAR FROM COALESCE(paid_date, created_at::date))::int - 1
           END) = grp.fy_start;

    -- Recompute parent totals from children
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.maintenance_collections
    WHERE parent_id = parent_row.id;

    UPDATE public.maintenance_collections
    SET amount = 0,
        due_amount = GREATEST(0, parent_total - total_paid),
        status = CASE WHEN total_paid >= parent_total AND parent_total > 0 THEN 'paid'
                      WHEN total_paid > 0 THEN 'partial'
                      ELSE 'pending' END,
        month = 'Annual',
        year = grp.fy_start,
        paid_date = NULL,
        payment_mode = NULL,
        receipt_no = NULL
    WHERE id = parent_row.id;
  END LOOP;
END
$migrate$;

-- 4. Helper function to recompute parent totals when a child changes
CREATE OR REPLACE FUNCTION public.recompute_maintenance_parent(_parent_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  parent_total numeric;
  total_paid numeric;
BEGIN
  SELECT COALESCE(total_maintenance, 0) INTO parent_total
  FROM public.maintenance_collections WHERE id = _parent_id;

  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM public.maintenance_collections WHERE parent_id = _parent_id;

  UPDATE public.maintenance_collections
  SET amount = 0,
      due_amount = GREATEST(0, parent_total - total_paid),
      status = CASE WHEN total_paid >= parent_total AND parent_total > 0 THEN 'paid'
                    WHEN total_paid > 0 THEN 'partial'
                    ELSE 'pending' END,
      updated_at = now()
  WHERE id = _parent_id;
END;
$function$;

-- 5. Trigger to auto-recompute parent whenever a child row is inserted/updated/deleted
CREATE OR REPLACE FUNCTION public.trg_recompute_parent_on_child()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.parent_id IS NOT NULL THEN
      PERFORM public.recompute_maintenance_parent(OLD.parent_id);
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.parent_id IS NOT NULL THEN
      PERFORM public.recompute_maintenance_parent(NEW.parent_id);
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.parent_id IS NOT NULL AND OLD.parent_id <> NEW.parent_id THEN
      PERFORM public.recompute_maintenance_parent(OLD.parent_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$function$;

DROP TRIGGER IF EXISTS recompute_parent_on_child ON public.maintenance_collections;
CREATE TRIGGER recompute_parent_on_child
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_collections
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_parent_on_child();