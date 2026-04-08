import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';

interface AuditHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  tableName: string;
  recordId: string;
}

const AuditHistoryDialog = ({ open, onClose, tableName, recordId }: AuditHistoryDialogProps) => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !recordId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('audit_log').select('*')
        .eq('table_name', tableName).eq('record_id', recordId)
        .order('performed_at', { ascending: false });
      setLogs(data || []);

      // Fetch performer names
      const userIds = [...new Set((data || []).map((l: any) => l.performed_by).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name || 'Unknown'; });
        setProfiles(map);
      }
      setLoading(false);
    };
    fetch();
  }, [open, recordId, tableName]);

  const actionColor: Record<string, 'default' | 'secondary' | 'destructive'> = {
    INSERT: 'default', UPDATE: 'secondary', DELETE: 'destructive',
  };

  const getChanges = (log: any) => {
    if (log.action !== 'UPDATE' || !log.old_data || !log.new_data) return null;
    const changes: { field: string; from: any; to: any }[] = [];
    const skip = ['updated_at', 'created_at', 'id'];
    for (const key of Object.keys(log.new_data)) {
      if (skip.includes(key)) continue;
      if (JSON.stringify(log.old_data[key]) !== JSON.stringify(log.new_data[key])) {
        changes.push({ field: key, from: log.old_data[key], to: log.new_data[key] });
      }
    }
    return changes.length > 0 ? changes : null;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            {t('history') || 'History'}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-center text-muted-foreground py-6">{t('loading')}</p>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No history found</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const changes = getChanges(log);
              return (
                <div key={log.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={actionColor[log.action] || 'secondary'}>{log.action}</Badge>
                      <span className="text-sm font-medium">{profiles[log.performed_by] || 'System'}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.performed_at), 'dd MMM yyyy, hh:mm a')}
                    </span>
                  </div>
                  {log.action === 'INSERT' && (
                    <p className="text-xs text-muted-foreground">Entry created</p>
                  )}
                  {log.action === 'DELETE' && (
                    <p className="text-xs text-muted-foreground">Entry deleted</p>
                  )}
                  {changes && (
                    <div className="space-y-1">
                      {changes.map((c, i) => (
                        <div key={i} className="text-xs">
                          <span className="font-medium capitalize">{c.field.replace(/_/g, ' ')}</span>:{' '}
                          <span className="text-destructive line-through">{String(c.from ?? '-')}</span>
                          {' → '}
                          <span className="text-primary font-medium">{String(c.to ?? '-')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuditHistoryDialog;
