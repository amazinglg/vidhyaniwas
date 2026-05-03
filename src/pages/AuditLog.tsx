import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader, SectionCard } from '@/components/layout/PagePrimitives';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ACTIONS = ['ALL', 'INSERT', 'UPDATE', 'DELETE'];

const AuditLog = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [tables, setTables] = useState<string[]>([]);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('audit_log').select('*').order('performed_at', { ascending: false }).limit(500);
      setLogs(data || []);
      setTables(Array.from(new Set((data || []).map((l: any) => l.table_name))).sort());
    })();
  }, []);

  const filtered = logs.filter(l => {
    if (tableFilter !== 'all' && l.table_name !== tableFilter) return false;
    if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const blob = `${l.table_name} ${l.action} ${l.record_id} ${JSON.stringify(l.old_data || {})} ${JSON.stringify(l.new_data || {})}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  const actionColor = (a: string) => a === 'INSERT' ? 'default' : a === 'UPDATE' ? 'secondary' : 'destructive';

  return (
    <div className="space-y-4">
      <PageHeader icon={History} title="Audit Log" subtitle={`Latest ${logs.length} changes across the system`} />

      <SectionCard className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tables</SelectItem>
              {tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {filtered.map(l => (
            <button key={l.id} onClick={() => setDetail(l)} className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant={actionColor(l.action) as any}>{l.action}</Badge>
                  <span className="font-medium">{l.table_name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(l.performed_at).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">ID: {l.record_id}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No matching records.</p>}
        </div>
      </SectionCard>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.action} on {detail?.table_name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-xs">
              <div><span className="font-semibold">When:</span> {new Date(detail.performed_at).toLocaleString()}</div>
              <div><span className="font-semibold">By user:</span> {detail.performed_by || '—'}</div>
              <div><span className="font-semibold">Record ID:</span> {detail.record_id}</div>
              {detail.old_data && (
                <div><div className="font-semibold mb-1">Old data</div><pre className="p-2 bg-muted rounded overflow-x-auto">{JSON.stringify(detail.old_data, null, 2)}</pre></div>
              )}
              {detail.new_data && (
                <div><div className="font-semibold mb-1">New data</div><pre className="p-2 bg-muted rounded overflow-x-auto">{JSON.stringify(detail.new_data, null, 2)}</pre></div>
              )}
              <Button variant="outline" onClick={() => setDetail(null)} className="w-full">Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLog;
