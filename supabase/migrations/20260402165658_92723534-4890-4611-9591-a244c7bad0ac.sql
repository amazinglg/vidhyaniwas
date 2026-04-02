
ALTER TABLE public.maintenance_collections ADD COLUMN IF NOT EXISTS total_maintenance numeric NOT NULL DEFAULT 3000;
