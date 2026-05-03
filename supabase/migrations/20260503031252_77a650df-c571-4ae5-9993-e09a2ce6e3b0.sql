
-- 1) login_attempts table for lockout
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  ip text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_mobile_time ON public.login_attempts(mobile, attempted_at DESC);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view login attempts" ON public.login_attempts
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Master admin can delete login attempts" ON public.login_attempts
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));

-- RPCs (security definer, so unauth clients can call them)
CREATE OR REPLACE FUNCTION public.is_mobile_locked(_mobile text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*) FROM public.login_attempts
    WHERE mobile = _mobile
      AND success = false
      AND attempted_at > now() - interval '15 minutes'
  ) >= 5;
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(_mobile text, _success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (mobile, success) VALUES (_mobile, _success);
  IF _success THEN
    DELETE FROM public.login_attempts WHERE mobile = _mobile AND success = false;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_login_attempts(_mobile text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'master_admin'::app_role) THEN
    RAISE EXCEPTION 'Only master admin can clear lockouts';
  END IF;
  DELETE FROM public.login_attempts WHERE mobile = _mobile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_mobile_locked(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_login_attempts(text) TO authenticated;

-- 2) role_page_permissions
CREATE TABLE public.role_page_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  page_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (role, page_key)
);
ALTER TABLE public.role_page_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view role permissions"
  ON public.role_page_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master admin can manage role permissions"
  ON public.role_page_permissions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

-- Seed defaults: pages = dashboard, residents, maintenance, expenses, notices, complaints, society_management, polls
-- Admins (incl master) get everything; supervisor → complaints; coordinator → my_profile; resident → most read pages
INSERT INTO public.role_page_permissions (role, page_key, allowed) VALUES
  ('master_admin','dashboard',true),('master_admin','residents',true),('master_admin','maintenance',true),('master_admin','expenses',true),('master_admin','notices',true),('master_admin','complaints',true),('master_admin','society_management',true),('master_admin','polls',true),
  ('president','dashboard',true),('president','residents',true),('president','maintenance',true),('president','expenses',true),('president','notices',true),('president','complaints',true),('president','society_management',true),('president','polls',true),
  ('vice_president','dashboard',true),('vice_president','residents',true),('vice_president','maintenance',true),('vice_president','expenses',true),('vice_president','notices',true),('vice_president','complaints',true),('vice_president','society_management',true),('vice_president','polls',true),
  ('treasury_head','dashboard',true),('treasury_head','residents',true),('treasury_head','maintenance',true),('treasury_head','expenses',true),('treasury_head','notices',true),('treasury_head','complaints',true),('treasury_head','society_management',true),('treasury_head','polls',true),
  ('secretary','dashboard',true),('secretary','residents',true),('secretary','maintenance',true),('secretary','expenses',true),('secretary','notices',true),('secretary','complaints',true),('secretary','society_management',true),('secretary','polls',true),
  ('supervisor','complaints',true),('supervisor','notices',true),('supervisor','society_management',true),('supervisor','polls',true),
  ('coordinator','residents',true),('coordinator','notices',true),('coordinator','society_management',true),('coordinator','polls',true),
  ('resident','residents',true),('resident','maintenance',true),('resident','expenses',true),('resident','notices',true),('resident','society_management',true),('resident','polls',true);

-- 3) Polls module
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of strings
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view active polls" ON public.polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage polls" ON public.polls FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all poll votes" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own vote" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own vote" ON public.poll_votes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own vote" ON public.poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all votes" ON public.poll_votes FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_polls_updated_at
  BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
