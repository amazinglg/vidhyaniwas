-- Per-user inbox notifications
CREATE TABLE IF NOT EXISTS public.inbox_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'general',
  link text,
  related_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_notifications_user_unread
  ON public.inbox_notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.inbox_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inbox"
  ON public.inbox_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own inbox"
  ON public.inbox_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own inbox"
  ON public.inbox_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can insert inbox notifications"
  ON public.inbox_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_notifications;

-- ============================================
-- Trigger: complaint status changed -> notify raiser
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_complaint_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _label text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT p.user_id INTO _user_id
  FROM public.profiles p
  WHERE p.resident_id = NEW.resident_id
  LIMIT 1;

  IF _user_id IS NULL THEN
    RETURN NEW;
  END IF;

  _label := CASE NEW.status
    WHEN 'resolved' THEN '✅ Complaint resolved'
    WHEN 'in_progress' THEN '🔧 Complaint in progress'
    WHEN 'open' THEN '🔄 Complaint reopened'
    WHEN 'withdrawn' THEN '↩️ Complaint withdrawn'
    ELSE 'Complaint updated'
  END;

  INSERT INTO public.inbox_notifications (user_id, title, body, type, link, related_id)
  VALUES (_user_id, _label, NEW.title, 'complaint_status', '/my-complaints', NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_complaint_status ON public.complaints;
CREATE TRIGGER trg_notify_complaint_status
  AFTER UPDATE OF status ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_complaint_status_change();

-- ============================================
-- Trigger: new complaint -> notify admins & supervisors
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_new_complaint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inbox_notifications (user_id, title, body, type, link, related_id)
  SELECT ur.user_id,
         '📝 New complaint raised',
         NEW.title,
         'complaint_new',
         '/complaints',
         NEW.id
  FROM public.user_roles ur
  WHERE ur.role::text IN ('master_admin','president','vice_president','treasury_head','secretary','supervisor')
    AND ur.user_id <> COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_complaint ON public.complaints;
CREATE TRIGGER trg_notify_new_complaint
  AFTER INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_complaint();

-- ============================================
-- Trigger: new pending signup -> notify admins
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved = true THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.inbox_notifications (user_id, title, body, type, link, related_id)
  SELECT ur.user_id,
         '👤 New signup pending',
         COALESCE(NEW.full_name, NEW.mobile, 'Unknown') || ' is awaiting approval.',
         'signup_pending',
         '/pending-signups',
         NEW.id
  FROM public.user_roles ur
  WHERE ur.role::text IN ('master_admin','president','vice_president','treasury_head','secretary');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_signup ON public.profiles;
CREATE TRIGGER trg_notify_new_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_signup();

-- ============================================
-- Trigger: new maintenance entry -> notify resident
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_new_maintenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT p.user_id INTO _user_id
  FROM public.profiles p
  WHERE p.resident_id = NEW.resident_id
  LIMIT 1;

  IF _user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.inbox_notifications (user_id, title, body, type, link, related_id)
  VALUES (
    _user_id,
    '💰 Maintenance entry added',
    NEW.month || ' ' || NEW.year || ' • ₹' || NEW.total_maintenance,
    'maintenance_new',
    '/my-profile',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_maintenance ON public.maintenance_collections;
CREATE TRIGGER trg_notify_new_maintenance
  AFTER INSERT ON public.maintenance_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_maintenance();

-- ============================================
-- Trigger: new notice -> notify all authenticated users
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_new_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_draft = true OR NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.inbox_notifications (user_id, title, body, type, link, related_id)
  SELECT p.user_id,
         '📢 ' || NEW.title,
         LEFT(COALESCE(NEW.content, ''), 150),
         'notice_new',
         '/notices',
         NEW.id
  FROM public.profiles p
  WHERE p.is_approved = true
    AND p.user_id <> COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_notice ON public.notices;
CREATE TRIGGER trg_notify_new_notice
  AFTER INSERT ON public.notices
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_notice();