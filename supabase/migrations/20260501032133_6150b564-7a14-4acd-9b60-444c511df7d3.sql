CREATE OR REPLACE FUNCTION public.notify_complaint_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    WHEN 'resolved' THEN 'Complaint resolved'
    WHEN 'in_progress' THEN 'Complaint in progress'
    WHEN 'pending_user_reply' THEN 'Pending resident reply'
    WHEN 'open' THEN 'Complaint reopened'
    WHEN 'withdrawn' THEN 'Complaint withdrawn'
    ELSE 'Complaint updated'
  END;

  INSERT INTO public.inbox_notifications (user_id, title, body, type, link, related_id)
  VALUES (_user_id, _label, NEW.title, 'complaint_status', '/my-complaints', NEW.id);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_complaint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.inbox_notifications (user_id, title, body, type, link, related_id)
  SELECT ur.user_id,
         'New complaint raised',
         NEW.title,
         'complaint_new',
         '/complaints',
         NEW.id
  FROM public.user_roles ur
  WHERE ur.role::text IN ('master_admin','president','vice_president','treasury_head','secretary','supervisor')
    AND ur.user_id <> COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_draft = true OR NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.inbox_notifications (user_id, title, body, type, link, related_id)
  SELECT p.user_id,
         'New notice: ' || NEW.title,
         LEFT(COALESCE(NEW.content, ''), 150),
         'notice_new',
         '/notices',
         NEW.id
  FROM public.profiles p
  WHERE p.is_approved = true
    AND p.user_id <> COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_approved = true THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.inbox_notifications (user_id, title, body, type, link, related_id)
  SELECT ur.user_id,
         'New signup pending',
         COALESCE(NEW.full_name, NEW.mobile, 'Unknown') || ' is awaiting approval.',
         'signup_pending',
         '/pending-signups',
         NEW.id
  FROM public.user_roles ur
  WHERE ur.role::text IN ('master_admin','president','vice_president','treasury_head','secretary');

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_maintenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    'Maintenance entry added',
    NEW.month || ' ' || NEW.year || ' • ₹' || NEW.total_maintenance,
    'maintenance_new',
    '/my-profile',
    NEW.id
  );

  RETURN NEW;
END;
$function$;

UPDATE public.inbox_notifications
SET title = CASE
  WHEN type = 'complaint_new' THEN 'New complaint raised'
  WHEN type = 'signup_pending' THEN 'New signup pending'
  WHEN type = 'maintenance_new' THEN 'Maintenance entry added'
  WHEN type = 'complaint_status' AND title ILIKE '%resolved%' THEN 'Complaint resolved'
  WHEN type = 'complaint_status' AND title ILIKE '%progress%' THEN 'Complaint in progress'
  WHEN type = 'complaint_status' AND title ILIKE '%reopen%' THEN 'Complaint reopened'
  WHEN type = 'complaint_status' AND title ILIKE '%withdraw%' THEN 'Complaint withdrawn'
  WHEN type = 'notice_new' AND title NOT ILIKE 'New notice:%' THEN 'New notice: ' || regexp_replace(title, '^[^A-Za-z0-9]+[[:space:]]*', '')
  ELSE title
END
WHERE title ~ '^[^A-Za-z0-9]' OR type IN ('complaint_new','signup_pending','maintenance_new');