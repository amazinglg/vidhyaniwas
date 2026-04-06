import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const PendingSignups = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [pendingSignups, setPendingSignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').eq('is_approved', false);
    // Enrich with user metadata to get house_no and lane_no
    if (profiles) {
      const enriched = profiles.map((p: any) => ({
        ...p,
      }));
      setPendingSignups(enriched);
    } else {
      setPendingSignups([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
    const channel = supabase.channel('pending-signups-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { fetchPending(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleApprove = async (profileUserId: string) => {
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('user_id', profileUserId);
    if (error) { toast.error(error.message); return; }
    toast.success(t('signup_approved'));
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    queryClient.invalidateQueries({ queryKey: ['all_residents'] });
    fetchPending();
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
              {pendingSignups.map((p: any) => {
                // Try to get house_no/lane_no from resident record or user metadata
                const houseNo = p.house_no || '-';
                const laneNo = p.lane_no || '-';
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name || '-'}</TableCell>
                    <TableCell>{p.mobile || '-'}</TableCell>
                    <TableCell>{houseNo}</TableCell>
                    <TableCell>{laneNo}</TableCell>
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
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default PendingSignups;
