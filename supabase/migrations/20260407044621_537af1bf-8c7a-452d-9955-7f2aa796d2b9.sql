
-- Add mobile column to society_management
ALTER TABLE public.society_management ADD COLUMN IF NOT EXISTS mobile text;

-- Add due_date to maintenance_collections
ALTER TABLE public.maintenance_collections ADD COLUMN IF NOT EXISTS due_date date;

-- Add approved_by and approved_at to profiles for tracking approval history
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Create notifications table for notice targeting
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notice_id uuid NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  target_type text NOT NULL DEFAULT 'all', -- 'all', 'admins', 'specific'
  target_user_ids uuid[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (
  target_type = 'all' OR 
  (target_type = 'admins' AND is_admin(auth.uid())) OR
  (target_type = 'specific' AND auth.uid() = ANY(target_user_ids))
);

-- Create photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for photos bucket
CREATE POLICY "Photos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Authenticated users can update photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'photos');
CREATE POLICY "Authenticated users can delete photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'photos');
