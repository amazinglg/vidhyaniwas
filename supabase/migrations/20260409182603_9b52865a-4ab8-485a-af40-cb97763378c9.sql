
-- Create maintenance_receipts table
CREATE TABLE public.maintenance_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_collection_id uuid NOT NULL REFERENCES public.maintenance_collections(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  society_name text NOT NULL DEFAULT 'Vidhya Niwas Society',
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  total_maintenance numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  due_amount numeric NOT NULL DEFAULT 0,
  payment_mode text,
  receipt_no text,
  month text NOT NULL,
  year integer NOT NULL,
  resident_name text,
  house_no text,
  lane_no text,
  notes text DEFAULT 'This is a digitally generated receipt and does not require a manual signature.',
  custom_fields jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(maintenance_collection_id)
);

-- Enable RLS
ALTER TABLE public.maintenance_receipts ENABLE ROW LEVEL SECURITY;

-- Residents can view their own receipts
CREATE POLICY "Residents can view own receipts"
ON public.maintenance_receipts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = maintenance_receipts.resident_id
));

-- Admins can do everything
CREATE POLICY "Admins can manage receipts"
ON public.maintenance_receipts FOR ALL
USING (is_admin(auth.uid()));

-- Master admin can update receipts
CREATE POLICY "Master admin can update receipts"
ON public.maintenance_receipts FOR UPDATE
USING (has_role(auth.uid(), 'master_admin'));

-- Trigger to auto-create receipt on maintenance insert
CREATE OR REPLACE FUNCTION public.auto_create_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _resident_name text;
  _house_no text;
  _lane_no text;
BEGIN
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
$$;

CREATE TRIGGER trg_auto_create_receipt
AFTER INSERT OR UPDATE ON public.maintenance_collections
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_receipt();

-- Timestamp trigger
CREATE TRIGGER update_maintenance_receipts_updated_at
BEFORE UPDATE ON public.maintenance_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
