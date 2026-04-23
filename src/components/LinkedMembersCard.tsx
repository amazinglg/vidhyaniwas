import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UsersRound, CheckCircle2, Unlink, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface Props {
  ownerResidentId: string;
  ownerHouseNo: string;
  ownerLaneNo: string;
}

const LinkedMembersCard = ({ ownerResidentId, ownerHouseNo, ownerLaneNo }: Props) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinked = async () => {
    setLoading(true);
    // Find residents in the same house/lane OR owner_id = me, excluding the owner himself
    const { data: linkedResidents } = await supabase
      .from('residents')
      .select('id, name, mobile, resident_type, owner_id, house_no, lane_no')
      .or(`owner_id.eq.${ownerResidentId},and(house_no.eq.${ownerHouseNo},lane_no.eq.${ownerLaneNo})`)
      .neq('id', ownerResidentId);

    const residentIds = (linkedResidents || []).map((r) => r.id);
    let profileMap: Record<string, any> = {};
    if (residentIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, mobile, is_approved, resident_id')
        .in('resident_id', residentIds);
      profileMap = Object.fromEntries((profs || []).map((p) => [p.resident_id!, p]));
    }
    const merged = (linkedResidents || []).map((r) => ({ ...r, profile: profileMap[r.id] || null }));
    setMembers(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchLinked();
    const channel = supabase
      .channel('linked-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchLinked())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'residents' }, () => fetchLinked())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ownerResidentId, ownerHouseNo, ownerLaneNo]);

  const handleApprove = async (profileUserId: string) => {
    const { error } = await supabase.from('profiles').update({
      is_approved: true,
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
    }).eq('user_id', profileUserId);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === 'hi' ? 'सदस्य स्वीकृत' : 'Member approved');
    fetchLinked();
  };

  const handleUnlink = async (m: any) => {
    if (!confirm(lang === 'hi' ? 'क्या आप वाकई इस सदस्य को अनलिंक करना चाहते हैं?' : 'Unlink this member from your house?')) return;
    // For tenants: remove resident record. For members with profiles: mark profile unapproved & clear resident_id.
    if (m.resident_type === 'tenant') {
      await supabase.from('residents').delete().eq('id', m.id);
    } else if (m.profile) {
      await supabase.from('profiles').update({ is_approved: false, resident_id: null }).eq('id', m.profile.id);
    } else {
      // Family member without profile — just clear owner_id link if set
      await supabase.from('residents').update({ owner_id: null }).eq('id', m.id);
    }
    toast.success(lang === 'hi' ? 'अनलिंक किया गया' : 'Unlinked');
    fetchLinked();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-warm">
          <UsersRound className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-bold font-display">{lang === 'hi' ? 'लिंक्ड सदस्य' : 'Linked Members'}</h3>
          <p className="text-sm text-muted-foreground">
            {lang === 'hi' ? 'आपके घर से जुड़े लोगों को देखें, स्वीकृत करें या अनलिंक करें' : 'View, approve or unlink people connected to your house'}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-4">{lang === 'hi' ? 'लोड हो रहा है…' : 'Loading…'}</p>
      ) : members.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">
          {lang === 'hi' ? 'कोई लिंक्ड सदस्य नहीं' : 'No linked members yet'}
        </p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const pendingApproval = m.profile && !m.profile.is_approved;
            return (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border bg-muted/30">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{m.name}</span>
                    <Badge variant="outline" className="text-xs capitalize">{m.resident_type}</Badge>
                    {pendingApproval && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Clock className="h-3 w-3" /> {lang === 'hi' ? 'लंबित' : 'Pending'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.mobile}</p>
                </div>
                <div className="flex gap-1.5">
                  {pendingApproval && (
                    <Button size="sm" variant="default" onClick={() => handleApprove(m.profile.user_id)} className="h-8 gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {lang === 'hi' ? 'स्वीकृत' : 'Approve'}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleUnlink(m)} className="h-8 gap-1">
                    <Unlink className="h-3.5 w-3.5" />
                    {lang === 'hi' ? 'अनलिंक' : 'Unlink'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default LinkedMembersCard;
