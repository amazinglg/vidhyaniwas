
-- Add admin_comment column to complaints
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS admin_comment text;

-- Function to get email by mobile number (for mobile login)
CREATE OR REPLACE FUNCTION public.get_email_by_mobile(_mobile text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE p.mobile = _mobile
  LIMIT 1
$$;

-- Grant execute to anon so unauthenticated users can use it for login
GRANT EXECUTE ON FUNCTION public.get_email_by_mobile(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_mobile(text) TO authenticated;
