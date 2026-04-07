import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const PendingSignups = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingSignups, setPendingSignups] = useState<any[]>([]);
  const [approvedHistory, setApprovedHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').eq('is_approved', false);
    setPendingSignups(profiles || []);
    setLoading(false);
  };

  const fetchApprovedHistory = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('is_approved', true).not('approved_at', 'is', null).order('approved_at', { ascending: false }).limit(50);
    // Enrich with approver names
    if (data && data.length > 0) {
      const approverIds = [...new Set(data.filter(p => p.approved_by).map(p => p.approved_by))];
      let approverMap: Record<string, string> = {};
      if (approverIds.length > 0) {
        const { data: approvers } = await supabase.from('profiles').select('user_id, full_name').in('user_id', approverIds);
        if (approvers) {
          approverMap = Object.fromEntries(approvers.map(a => [a.user_id, a.full_name || 'Admin']));
        }
      }
      setApprovedHistory(data.map(p => ({ ...p, approver_name: p.approved_by ? approverMap[p.approved_by] || 'Admin' : 'Auto' })));
    } else {
      setApprovedHistory([]);
    }
  };

  useEffect(() => {
    fetchPending();
    fetchApprovedHistory();
    const channel = supabase.channel('pending-signups-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { fetchPending(); fetchApprovedHistory(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleApprove = async (profileUserId: string) => {
    const { error } = await supabase.from('profiles').update({ 
      is_approved: true, 
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
    }).eq('user_id', profileUserId);
    if (error) { toast.error(error.message); return; }
    toast.success(t('signup_approved'));
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    queryClient.invalidateQueries({ queryKey: ['all_residents'] });
    fetchPending();
    fetchApprovedHistory();
  };

  const handleReject = async (profileUserId: string) => {
    if (!confirm(t('confirm_reject_signup'))) return;
    await supabase.from('user_roles').delete().eq('user_id', profileUserId);
    await supabase.from('profiles').delete().eq('user_id', profileUserId);
    toast.success(t('signup_rejected'));
    fetchPending();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-foreground">{t('pending_signups')}</h1>
        <p className="text-muted-foreground mt-1">{t('review_pending_signups')}</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-1" /> {t('pending')} {pendingSignups.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{pendingSignups.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" /> {t('approval_history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">{t('loading')}</div>
            ) : pendingSignups.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p>{t('no_pending_approvals')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('mobile')}</TableHead>
                    <TableHead>{t('house_no')}</TableHead>
                    <TableHead>{t('lane_no')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingSignups.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || '-'}</TableCell>
                      <TableCell>{p.mobile || '-'}</TableCell>
                      <TableCell>{p.house_no || '-'}</TableCell>
                      <TableCell>{p.lane_no || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="default" onClick={() => handleApprove(p.user_id)}>
                            <CheckCircle className="h-4 w-4 mr-1" />{t('approve')}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(p.user_id)}>
                            <XCircle className="h-4 w-4 mr-1" />{t('reject')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="overflow-x-auto">
            {approvedHistory.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">{t('no_records_found')}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('mobile')}</TableHead>
                    <TableHead>{t('approved_by')}</TableHead>
                    <TableHead>{t('approved_at')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedHistory.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || '-'}</TableCell>
                      <TableCell>{p.mobile || '-'}</TableCell>
                      <TableCell>{p.approver_name}</TableCell>
                      <TableCell>{p.approved_at ? new Date(p.approved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PendingSignups;
