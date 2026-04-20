import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, RotateCcw, AlertTriangle, IndianRupee, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

const DeletedHistory = () => {
  const { t } = useLanguage();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'maintenance_collections' | 'expenses'>('maintenance_collections');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetch = async () => {
    setLoading(true);
    // Trigger purge on every load (cheap, idempotent)
    try { await supabase.rpc('purge_old_deleted_records'); } catch {}
    const { data } = await supabase.from('deleted_records').select('*').order('deleted_at', { ascending: false });
    setRecords(data || []);
    setLoading(false);
    setSelected(new Set());
  };

  useEffect(() => {
    fetch();
    const channel = supabase.channel('deleted-records-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'deleted_records' }, fetch).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => records.filter(r => r.source_table === tab), [records, tab]);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleRestore = async (ids: string[]) => {
    if (!confirm(`Restore ${ids.length} record(s)?`)) return;
    let okCount = 0; let errCount = 0;
    for (const id of ids) {
      const { error } = await supabase.rpc('restore_deleted_record', { _id: id });
      if (error) errCount++; else okCount++;
    }
    toast.success(`Restored ${okCount} record(s)${errCount ? `, ${errCount} failed` : ''}`);
    fetch();
  };

  const handlePermanentDelete = async (ids: string[]) => {
    if (!confirm(`Permanently delete ${ids.length} record(s)? This cannot be undone.`)) return;
    const { error } = await supabase.from('deleted_records').delete().in('id', ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`Permanently deleted ${ids.length} record(s)`);
    fetch();
  };

  const daysLeft = (deletedAt: string) => {
    const ms = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  };

  const renderPayload = (sourceTable: string, payload: any) => {
    if (sourceTable === 'maintenance_collections') {
      return (
        <div className="text-xs space-y-0.5">
          <div><span className="text-muted-foreground">Month:</span> {payload.month} {payload.year}</div>
          <div><span className="text-muted-foreground">Paid:</span> ₹{Number(payload.amount || 0).toLocaleString('en-IN')}</div>
          <div><span className="text-muted-foreground">Due:</span> ₹{Number(payload.due_amount || 0).toLocaleString('en-IN')}</div>
        </div>
      );
    }
    return (
      <div className="text-xs space-y-0.5">
        <div className="font-medium">{payload.description}</div>
        <div><span className="text-muted-foreground">{payload.category}</span> • ₹{Number(payload.amount || 0).toLocaleString('en-IN')}</div>
        <div className="text-muted-foreground">{payload.date}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">{t('deleted_history')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('deleted_history_desc')}</p>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <span className="text-amber-700 dark:text-amber-300">
          Records are kept for 30 days. After that they are permanently removed automatically.
        </span>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setSelected(new Set()); }}>
        <TabsList>
          <TabsTrigger value="maintenance_collections"><IndianRupee className="h-4 w-4 mr-1" /> {t('maintenance_fund')}</TabsTrigger>
          <TabsTrigger value="expenses"><Receipt className="h-4 w-4 mr-1" /> {t('expenses')}</TabsTrigger>
        </TabsList>

        {['maintenance_collections', 'expenses'].map((tabKey) => (
          <TabsContent key={tabKey} value={tabKey} className="space-y-3">
            {selected.size > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 sticky top-0 z-10 backdrop-blur">
                <span className="text-sm font-medium">{selected.size} selected</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleRestore(Array.from(selected))}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handlePermanentDelete(Array.from(selected))}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete forever
                  </Button>
                </div>
              </div>
            )}

            <Card className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">{t('loading')}</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Trash2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p>{t('no_deleted_records')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                      </TableHead>
                      <TableHead>Record</TableHead>
                      <TableHead>Deleted</TableHead>
                      <TableHead>Auto-purge in</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} />
                        </TableCell>
                        <TableCell>{renderPayload(r.source_table, r.payload)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.deleted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell><Badge variant={daysLeft(r.deleted_at) <= 5 ? 'destructive' : 'secondary'}>{daysLeft(r.deleted_at)} days</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleRestore([r.id])}><RotateCcw className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handlePermanentDelete([r.id])}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default DeletedHistory;
