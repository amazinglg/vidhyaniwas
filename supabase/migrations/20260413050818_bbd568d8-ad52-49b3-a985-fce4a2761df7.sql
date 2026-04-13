
-- 1. Fix user_roles: replace ALL policy with explicit per-operation policies for master_admin
DROP POLICY IF EXISTS "Master admin can manage roles" ON public.user_roles;

CREATE POLICY "Master admin can select all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Master admin can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Master admin can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'))
WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Master admin can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));

-- 2. Fix photos storage INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload photos" ON storage.objects;

CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);
