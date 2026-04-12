
-- Fix: Change default total_maintenance from 3000 to 0 so it doesn't reset
ALTER TABLE public.maintenance_collections ALTER COLUMN total_maintenance SET DEFAULT 0;

-- Allow master admin to delete complaints  
CREATE POLICY "Master admin can delete complaints"
ON public.complaints
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'master_admin'));
