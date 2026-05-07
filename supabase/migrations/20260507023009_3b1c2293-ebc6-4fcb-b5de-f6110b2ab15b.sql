
DROP TRIGGER IF EXISTS audit_maintenance_collections ON public.maintenance_collections;
CREATE TRIGGER audit_maintenance_collections
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_collections
FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
