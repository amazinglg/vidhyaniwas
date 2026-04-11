
-- Add supervisor to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';

-- Add comments array column to complaints for comment history
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]'::jsonb;
