import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Home, Phone, Users, Car, IndianRupee, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { paid: 'default', partial: 'secondary', pending: 'outline', overdue: 'destructive' };
const statusIcon: Record<string, any> = { paid: CheckCircle2, partial: Clock, pending: Clock, overdue: AlertTriangle };

interface Props {
  resident: any;
  open: boolean;
  onClose: () => void;
}

const ResidentDetailModal = ({ resident, open, onClose }: Props) => {
  const { t } = useLanguage();
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [linkedMembers, setLinkedMembers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    if (!resident?.id || !open) return;
    const fetchAll = async () => {
      const [mRes, cRes, fRes, vRes, linkedRes, profilesRes] = await Promise.all([
        supabase.from('maintenance_collections').select('*').eq('resident_id', resident.id).order('created_at', { ascending: false }),
        supabase.from('complaints').select('*').eq('resident_id', resident.id).order('created_at', { ascending: false }),
        supabase.from('family_member_details').select('*').eq('resident_id', resident.id).order('created_at'),
        supabase.from('vehicles').select('*').eq('resident_id', resident.id).order('created_at'),
        // Linked residents that signed up under this house owner
        supabase.from('residents').select('id, name, mobile, resident_type, house_no, lane_no')
          .or(`owner_id.eq.${resident.id},and(house_no.eq.${resident.house_no},lane_no.eq.${resident.lane_no})`)
          .neq('id', resident.id),
        // Profiles that registered using this house/lane (covers signups not yet linked to a resident row)
        supabase.from('profiles').select('id, user_id, full_name, mobile, is_approved, resident_id, house_no, lane_no')
          .eq('house_no', resident.house_no || '').eq('lane_no', resident.lane_no || ''),
      ]);
      setMaintenance(mRes.data || []);
      setComplaints(cRes.data || []);
      setFamilyMembers(fRes.data || []);
      setVehicles(vRes.data || []);

      const linked = (linkedRes.data || []).filter((r: any) => r.id !== resident.id);
      const linkedIds = new Set(linked.map((r: any) => r.id));
      const linkedMobiles = new Set(linked.map((r: any) => r.mobile));
      const profileExtras = (profilesRes.data || [])
        .filter((p: any) => p.user_id && p.mobile !== resident.mobile)
        .filter((p: any) => !p.resident_id || !linkedIds.has(p.resident_id))
        .filter((p: any) => !p.mobile || !linkedMobiles.has(p.mobile))
        .map((p: any) => ({
          id: `profile-${p.id}`,
          name: p.full_name || '(Unnamed)',
          mobile: p.mobile,
          resident_type: p.is_approved ? 'member' : 'pending',
          house_no: p.house_no,
          lane_no: p.lane_no,
          _profileOnly: true,
          _approved: p.is_approved,
        }));
      setLinkedMembers([...linked, ...profileExtras]);
    };
    fetchAll();
  }, [resident?.id, resident?.house_no, resident?.lane_no, resident?.mobile, open]);

  if (!resident) return null;

  const totalPaid = maintenance.reduce((s, m) => s + Number(m.amount || 0), 0);
  const totalDue = maintenance.reduce((s, m) => s + Number(m.due_amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{resident.name}</DialogTitle>
        </DialogHeader>

        {/* Basic Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <Home className="h-4 w-4 text-primary" />
            <div><p className="text-xs text-muted-foreground">{t('house')}</p><p className="font-medium text-sm">{resident.house_no}</p></div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <Phone className="h-4 w-4 text-primary" />
            <div><p className="text-xs text-muted-foreground">{t('mobile')}</p><p className="font-medium text-sm">{resident.mobile}</p></div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <Users className="h-4 w-4 text-primary" />
            <div><p className="text-xs text-muted-foreground">{t('family')}</p><p className="font-medium text-sm">{resident.family_members || 1}</p></div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <Home className="h-4 w-4 text-primary" />
            <div><p className="text-xs text-muted-foreground">{t('lane')}</p><p className="font-medium text-sm">{resident.lane_no}</p></div>
          </div>
        </div>

        {/* Maintenance Summary */}
        <Card className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><IndianRupee className="h-4 w-4 text-primary" />{t('maintenance_fund')}</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-600 dark:text-green-400">{t('total_paid')}</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-600 dark:text-orange-400">{t('total_pending')}</p>
              <p className="text-lg font-bold text-orange-700 dark:text-orange-300">₹{totalDue.toLocaleString()}</p>
            </div>
          </div>
          {maintenance.length > 0 && (
            <div className="max-h-40 overflow-y-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">{t('month')}</TableHead>
                  <TableHead className="text-xs">{t('paid')}</TableHead>
                  <TableHead className="text-xs">{t('due')}</TableHead>
                  <TableHead className="text-xs">{t('status')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {maintenance.map(m => {
                    const SI = statusIcon[m.status] || Clock;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">{m.month} {m.year}</TableCell>
                        <TableCell className="text-xs text-green-600">₹{Number(m.amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-orange-600">₹{Number(m.due_amount || 0).toLocaleString()}</TableCell>
                        <TableCell><Badge variant={statusBadge[m.status] || 'outline'} className="text-xs gap-1"><SI className="h-3 w-3" />{t(m.status)}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Family Members */}
        <Card className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-primary" />{t('family_member_details')}</h3>

          {/* Signed-up linked members (members & tenants who registered) */}
          {linkedMembers.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Signed-up under this house</p>
              {linkedMembers.map((lm: any) => (
                <div key={lm.id} className="flex items-center justify-between p-2 rounded border bg-primary/5 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium truncate">{lm.name}</span>
                    <span className="text-muted-foreground ml-2 capitalize text-xs">({lm.resident_type})</span>
                    {lm._profileOnly && !lm._approved && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">Pending</Badge>
                    )}
                  </div>
                  {lm.mobile && <span className="text-xs text-muted-foreground">{lm.mobile}</span>}
                </div>
              ))}
            </div>
          )}

          {familyMembers.length === 0 && linkedMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_family_members_added')}</p>
          ) : familyMembers.length > 0 ? (
            <div className="space-y-2">
              {linkedMembers.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Manually added</p>
              )}
              {familyMembers.map(fm => (
                <div key={fm.id} className="flex items-center justify-between p-2 rounded border bg-muted/30 text-sm">
                  <div>
                    <span className="font-medium">{fm.name}</span>
                    <span className="text-muted-foreground ml-2">({fm.relation})</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {fm.age && <span>{t('age')}: {fm.age}</span>}
                    {fm.occupation && <span className="ml-2">• {fm.occupation}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        {/* Vehicles */}
        <Card className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Car className="h-4 w-4 text-primary" />{t('vehicles')}</h3>
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_vehicles_added')}</p>
          ) : (
            <div className="space-y-2">
              {vehicles.map(v => (
                <div key={v.id} className="flex items-center justify-between p-2 rounded border bg-muted/30 text-sm">
                  <div>
                    <span className="font-medium">{v.vehicle_type}</span>
                    <span className="text-muted-foreground ml-2">- {v.registration_no}</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {v.make_model && <span>{v.make_model}</span>}
                    {v.color && <span className="ml-2">• {v.color}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Complaints */}
        <Card className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-primary" />{t('complaints')}</h3>
          {complaints.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_complaints')}</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {complaints.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded border bg-muted/30 text-sm">
                  <div>
                    <span className="font-medium">{c.title}</span>
                    <span className="text-muted-foreground ml-2 text-xs">({c.category})</span>
                  </div>
                  <Badge variant={c.status === 'resolved' ? 'default' : c.status === 'in_progress' ? 'secondary' : 'outline'}>{t(c.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default ResidentDetailModal;
