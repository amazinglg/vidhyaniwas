-- ============================================================
-- PHASE 1: Backend & Schema Changes
-- ============================================================

-- ------------------------------------------------------------
-- 1. SOCIETY_INFO (global, replaces localStorage)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.society_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Shri Vidhya Niwas',
  total_houses text NOT NULL DEFAULT '40+',
  lanes text NOT NULL DEFAULT '4',
  monthly_maintenance text NOT NULL DEFAULT '₹3,000 per house',
  admin_name text NOT NULL DEFAULT 'Labhansh Garg',
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.society_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view society info"
  ON public.society_info FOR SELECT TO authenticated USING (true);

CREATE POLICY "Master admin can insert society info"
  ON public.society_info FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Master admin can update society info"
  ON public.society_info FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

CREATE TRIGGER trg_society_info_updated_at
  BEFORE UPDATE ON public.society_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.society_info (singleton) VALUES (true) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 2. HELPERS (separate from residents, no login required)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.helpers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text,
  role_title text NOT NULL DEFAULT 'Helper',
  photo_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.helpers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage helpers"
  ON public.helpers FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_helpers_updated_at
  BEFORE UPDATE ON public.helpers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 3. DELETED_RECORDS (soft-delete trash for maintenance + expenses)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deleted_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL CHECK (source_table IN ('maintenance_collections', 'expenses')),
  original_id uuid NOT NULL,
  payload jsonb NOT NULL,
  deleted_by uuid,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_deleted_at ON public.deleted_records(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deleted_records_source ON public.deleted_records(source_table);

ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can view deleted records"
  ON public.deleted_records FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Master admin can insert deleted records"
  ON public.deleted_records FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Master admin can delete from trash"
  ON public.deleted_records FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role));

-- Auto-purge function (>30 days)
CREATE OR REPLACE FUNCTION public.purge_old_deleted_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.deleted_records
  WHERE deleted_at < (now() - interval '30 days');
END;
$$;

-- Restore function (for master admin)
CREATE OR REPLACE FUNCTION public.restore_deleted_record(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec public.deleted_records;
BEGIN
  IF NOT has_role(auth.uid(), 'master_admin'::app_role) THEN
    RAISE EXCEPTION 'Only master admin can restore records';
  END IF;

  SELECT * INTO _rec FROM public.deleted_records WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;

  IF _rec.source_table = 'maintenance_collections' THEN
    INSERT INTO public.maintenance_collections
    SELECT * FROM jsonb_populate_record(NULL::public.maintenance_collections, _rec.payload)
    ON CONFLICT (id) DO NOTHING;
  ELSIF _rec.source_table = 'expenses' THEN
    INSERT INTO public.expenses
    SELECT * FROM jsonb_populate_record(NULL::public.expenses, _rec.payload)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  DELETE FROM public.deleted_records WHERE id = _id;
END;
$$;

-- Soft-delete trigger for maintenance_collections
CREATE OR REPLACE FUNCTION public.soft_delete_to_trash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.deleted_records (source_table, original_id, payload, deleted_by)
  VALUES (TG_TABLE_NAME, OLD.id, row_to_json(OLD)::jsonb, auth.uid());
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_soft_delete_maintenance ON public.maintenance_collections;
CREATE TRIGGER trg_soft_delete_maintenance
  BEFORE DELETE ON public.maintenance_collections
  FOR EACH ROW EXECUTE FUNCTION public.soft_delete_to_trash();

DROP TRIGGER IF EXISTS trg_soft_delete_expenses ON public.expenses;
CREATE TRIGGER trg_soft_delete_expenses
  BEFORE DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.soft_delete_to_trash();

-- ------------------------------------------------------------
-- 4. RESIDENTS — uniqueness constraints (fixes duplicates #9, #10)
-- ------------------------------------------------------------
-- Note: only enforce uniqueness on owner mobiles for active records,
-- because a member/tenant can share contact patterns; mobile must still
-- be globally unique to support mobile-based login mapping.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'residents_mobile_unique'
  ) THEN
    -- Only add if no existing duplicates
    IF NOT EXISTS (
      SELECT mobile FROM public.residents
      GROUP BY mobile HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE public.residents ADD CONSTRAINT residents_mobile_unique UNIQUE (mobile);
    END IF;
  END IF;
END $$;

-- Unique owner per house+lane (already enforced in app, now in DB)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'residents_unique_owner_per_house'
  ) THEN
    CREATE UNIQUE INDEX residents_unique_owner_per_house
      ON public.residents (house_no, lane_no)
      WHERE resident_type = 'owner' AND is_active = true;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5. RPC: signup_lookup_owner — owner mobile → house/lane/id (fixes #5)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.signup_lookup_owner(_owner_mobile text)
RETURNS TABLE(owner_id uuid, owner_name text, house_no text, lane_no text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, house_no, lane_no
  FROM public.residents
  WHERE mobile = _owner_mobile
    AND resident_type = 'owner'
    AND is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.signup_lookup_owner(text) TO anon, authenticated;

-- ------------------------------------------------------------
-- 6. RPC: check_duplicate_resident — used by Add User flow (#10)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_duplicate_resident(_mobile text)
RETURNS TABLE(exists_in_residents boolean, exists_in_helpers boolean, existing_name text, existing_house text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS(SELECT 1 FROM public.residents WHERE mobile = _mobile),
    EXISTS(SELECT 1 FROM public.helpers WHERE mobile = _mobile),
    (SELECT name FROM public.residents WHERE mobile = _mobile LIMIT 1),
    (SELECT house_no || ' / Lane ' || lane_no FROM public.residents WHERE mobile = _mobile LIMIT 1);
$$;

GRANT EXECUTE ON FUNCTION public.check_duplicate_resident(text) TO authenticated;

-- ------------------------------------------------------------
-- 7. Auto-link admins/profiles to residents row (#4 fix)
--    When a profile is created or updated and resident_id is NULL,
--    try to find a matching residents row by mobile and link it.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_link_resident_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _resident_id uuid;
BEGIN
  IF NEW.resident_id IS NULL AND NEW.mobile IS NOT NULL THEN
    SELECT id INTO _resident_id
    FROM public.residents
    WHERE mobile = NEW.mobile AND is_active = true
    LIMIT 1;
    IF _resident_id IS NOT NULL THEN
      NEW.resident_id := _resident_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_resident ON public.profiles;
CREATE TRIGGER trg_auto_link_resident
  BEFORE INSERT OR UPDATE OF mobile, resident_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_resident_to_profile();

-- Backfill: link existing profiles that have no resident_id
UPDATE public.profiles p
SET resident_id = r.id
FROM public.residents r
WHERE p.resident_id IS NULL
  AND p.mobile IS NOT NULL
  AND r.mobile = p.mobile
  AND r.is_active = true;

-- ------------------------------------------------------------
-- 8. Read access for residents/family/vehicles for ALL authenticated
--    (#4 fix: admin/non-owner residents need to see their unit data)
--    Already covered by existing residents RLS "Authenticated can view active residents".
--    Family + vehicle visibility is per-resident via profiles link.
--    No new policies needed here — backfill above takes care of linking.
-- ------------------------------------------------------------
