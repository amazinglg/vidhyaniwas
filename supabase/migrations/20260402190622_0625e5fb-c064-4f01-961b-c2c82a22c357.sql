
-- Family member details table
CREATE TABLE public.family_member_details (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  name text NOT NULL,
  relation text NOT NULL DEFAULT 'Other',
  age integer,
  occupation text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.family_member_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage family members" ON public.family_member_details FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Residents can view own family" ON public.family_member_details FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = family_member_details.resident_id));
CREATE POLICY "Residents can insert own family" ON public.family_member_details FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = family_member_details.resident_id));
CREATE POLICY "Residents can update own family" ON public.family_member_details FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = family_member_details.resident_id));
CREATE POLICY "Residents can delete own family" ON public.family_member_details FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = family_member_details.resident_id));
CREATE POLICY "Coordinators can view family" ON public.family_member_details FOR SELECT USING (public.is_coordinator(auth.uid()));

-- Vehicles table
CREATE TABLE public.vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL DEFAULT 'Car',
  registration_no text NOT NULL,
  make_model text,
  color text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vehicles" ON public.vehicles FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Residents can view own vehicles" ON public.vehicles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = vehicles.resident_id));
CREATE POLICY "Residents can insert own vehicles" ON public.vehicles FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = vehicles.resident_id));
CREATE POLICY "Residents can update own vehicles" ON public.vehicles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = vehicles.resident_id));
CREATE POLICY "Residents can delete own vehicles" ON public.vehicles FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = vehicles.resident_id));
CREATE POLICY "Coordinators can view vehicles" ON public.vehicles FOR SELECT USING (public.is_coordinator(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_family_member_details_updated_at BEFORE UPDATE ON public.family_member_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
