
-- Backfill can_write to match the role capabilities that existed BEFORE the matrix was introduced.
-- Admin-tier committee roles previously had full write via is_admin(); supervisor had write on complaints.
-- Coordinator previously had ALL on maintenance & complaints via is_coordinator().

-- Admin-tier roles: full read+write on every page
UPDATE public.role_page_permissions
SET can_read = true, can_write = true, allowed = true
WHERE role IN ('president','vice_president','treasury_head','secretary');

-- Supervisor: write on complaints (previously had UPDATE via is_supervisor)
UPDATE public.role_page_permissions
SET can_read = true, can_write = true, allowed = true
WHERE role = 'supervisor' AND page_key = 'complaints';

-- Coordinator: write on maintenance & complaints (previously had ALL via is_coordinator)
UPDATE public.role_page_permissions
SET can_read = true, can_write = true, allowed = true
WHERE role = 'coordinator' AND page_key IN ('maintenance','complaints');
