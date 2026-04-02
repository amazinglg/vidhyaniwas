import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCircle, Home, Phone, Mail, Users, Save, IndianRupee, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { paid: 'default', partial: 'secondary', pending: 'outline', overdue: 'destructive' };
const statusIcon: Record<string, any> = { paid: CheckCircle2, partial: Clock, pending: Clock, overdue: AlertTriangle };

const MyProfile = () => {
  const { user, residentId } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [resident, setResident] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', mobile: '', email: '' });
  const [maintenance, setMaintenance] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, residents(*)')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData);
        setResident(profileData.residents);
        setForm({
          full_name: profileData.full_name || '',
          mobile: profileData.mobile || '',
          email: user.email || '',
        });
      }
    };
    fetchData();
  }, [user]);

  // Fetch maintenance records for this resident
  useEffect(() => {
    if (!residentId) return;
    const fetchMaintenance = async () => {
      const { data } = await supabase
        .from('maintenance_collections')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false });
      setMaintenance(data || []);
    };
    fetchMaintenance();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('my-maintenance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_collections', filter: `resident_id=eq.${residentId}` }, () => {
        fetchMaintenance();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [residentId]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name, mobile: form.mobile })
      .eq('user_id', user.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('profile_updated'));
    setEditing(false);
  };

  const totalPaid = maintenance.reduce((s, m) => s + Number(m.amount || 0), 0);
  const totalDue = maintenance.reduce((s, m) => s + Number(m.due_amount || 0), 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-display text-foreground">{t('my_profile')}</h1>
        <p className="text-muted-foreground mt-1">{t('view_update_info')}</p>
      </div>

      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-warm shadow-lg">
            <UserCircle className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display">{form.full_name || 'Your Name'}</h2>
            {resident && <p className="text-muted-foreground">{t('house')} {resident.house_no} • {t('lane')} {resident.lane_no}</p>}
          </div>
        </div>

        {editing ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>{t('full_name')}</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>{t('mobile')}</Label>
              <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="gradient-warm text-primary-foreground"><Save className="h-4 w-4 mr-2" />{t('save')}</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>{t('cancel')}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                <Phone className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('mobile')}</p>
                  <p className="font-medium">{form.mobile || t('not_set')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                <Mail className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('email')}</p>
                  <p className="font-medium text-sm">{form.email || t('not_set')}</p>
                </div>
              </div>
              {resident && (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                    <Home className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('house_no')}</p>
                      <p className="font-medium">{resident.house_no}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                    <Users className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('family_members')}</p>
                      <p className="font-medium">{resident.family_members || 1}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <Button onClick={() => setEditing(true)} variant="outline">{t('edit_profile')}</Button>
          </div>
        )}
      </Card>

      {/* Maintenance Payment History */}
      {residentId && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-warm">
              <IndianRupee className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display">{t('maintenance_fund')}</h3>
              <p className="text-sm text-muted-foreground">{t('your_payment_history')}</p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">{t('total_paid')}</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">{t('total_pending')}</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">₹{totalDue.toLocaleString()}</p>
            </div>
          </div>

          {maintenance.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('no_records')}</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('month')}</TableHead>
                      <TableHead>{t('total_maintenance')}</TableHead>
                      <TableHead>{t('paid')}</TableHead>
                      <TableHead>{t('due')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('payment_mode')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.map((m) => {
                      const StatusIcon = statusIcon[m.status] || Clock;
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.month} {m.year}</TableCell>
                          <TableCell>₹{Number(m.total_maintenance || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-green-600 font-medium">₹{Number(m.amount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-orange-600 font-medium">₹{Number(m.due_amount || 0).toLocaleString()}</TableCell>
                          <TableCell>{m.paid_date || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={statusBadge[m.status] || 'outline'} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {t(m.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{m.payment_mode || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {maintenance.map((m) => {
                  const StatusIcon = statusIcon[m.status] || Clock;
                  return (
                    <div key={m.id} className="p-4 rounded-lg border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{m.month} {m.year}</span>
                        <Badge variant={statusBadge[m.status] || 'outline'} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {t(m.status)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div><p className="text-muted-foreground text-xs">{t('total_maintenance')}</p><p className="font-medium">₹{Number(m.total_maintenance || 0).toLocaleString()}</p></div>
                        <div><p className="text-muted-foreground text-xs">{t('paid')}</p><p className="font-medium text-green-600">₹{Number(m.amount || 0).toLocaleString()}</p></div>
                        <div><p className="text-muted-foreground text-xs">{t('due')}</p><p className="font-medium text-orange-600">₹{Number(m.due_amount || 0).toLocaleString()}</p></div>
                      </div>
                      <div className="text-xs text-muted-foreground">{m.paid_date || '-'} • {m.payment_mode || '-'}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default MyProfile;
