
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('master_admin', 'president', 'vice_president', 'supervisor', 'coordinator', 'resident');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: is_admin checks for admin-level roles
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('master_admin', 'president', 'vice_president', 'supervisor')
  )
$$;

-- Helper: is_coordinator
CREATE OR REPLACE FUNCTION public.is_coordinator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'coordinator'
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  mobile TEXT,
  avatar_url TEXT,
  resident_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Residents table
CREATE TABLE public.residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  house_no TEXT NOT NULL,
  lane_no TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  family_members INTEGER DEFAULT 1,
  move_in_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

-- Add FK from profiles to residents after residents table exists
ALTER TABLE public.profiles ADD CONSTRAINT profiles_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE SET NULL;

-- Maintenance collections table
CREATE TABLE public.maintenance_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_amount NUMERIC NOT NULL DEFAULT 0,
  paid_date DATE,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_mode TEXT,
  receipt_no TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_collections ENABLE ROW LEVEL SECURITY;

-- Expense categories enum
CREATE TYPE public.expense_category AS ENUM (
  'repair', 'purchase', 'maintenance', 'staff_salary', 'electricity',
  'water', 'security', 'gardening', 'cleaning', 'events', 'legal', 'insurance', 'other'
);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category expense_category NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor TEXT,
  approved_by_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Notices table
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  resolved_at DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_residents_updated_at BEFORE UPDATE ON public.residents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON public.maintenance_collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, mobile)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== RLS POLICIES ==========

-- user_roles: only admins can manage, users can read own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Master admin can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'master_admin'));

-- profiles: users can read own, admins can read all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (public.is_admin(auth.uid()));

-- residents: admins full access, coordinators read, residents read own
CREATE POLICY "Admins can manage residents" ON public.residents FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Coordinators can view residents" ON public.residents FOR SELECT USING (public.is_coordinator(auth.uid()));
CREATE POLICY "Residents can view own record" ON public.residents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = residents.id)
);

-- maintenance_collections: admins & coordinators full, residents read own
CREATE POLICY "Admins can manage maintenance" ON public.maintenance_collections FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Coordinators can manage maintenance" ON public.maintenance_collections FOR ALL USING (public.is_coordinator(auth.uid()));
CREATE POLICY "Residents can view own maintenance" ON public.maintenance_collections FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = maintenance_collections.resident_id)
);

-- expenses: admins only
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL USING (public.is_admin(auth.uid()));

-- notices: admins manage, all authenticated can read active
CREATE POLICY "Admins can manage notices" ON public.notices FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "All authenticated can view active notices" ON public.notices FOR SELECT TO authenticated USING (is_active = true);

-- complaints: admins full, coordinators full, residents own
CREATE POLICY "Admins can manage complaints" ON public.complaints FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Coordinators can manage complaints" ON public.complaints FOR ALL USING (public.is_coordinator(auth.uid()));
CREATE POLICY "Residents can view own complaints" ON public.complaints FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = complaints.resident_id)
);
CREATE POLICY "Residents can create complaints" ON public.complaints FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.resident_id = complaints.resident_id)
);
