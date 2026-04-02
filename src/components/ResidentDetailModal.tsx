import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Home, Phone, Mail, Users, Car, IndianRupee, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
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
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    if (!resident?.id || !open) return;
    const fetchAll = async () => {
      const [mRes, cRes, fRes, vRes] = await Promise.all([
        supabase.from('maintenance_collections').select('*').eq('resident_id', resident.id).order('created_at', { ascending: false }),
        supabase.from('complaints').select('*').eq('resident_id', resident.id).order('created_at', { ascending: false }),
        supabase.from('family_member_details').select('*').eq('resident_id', resident.id).order('created_at'),
        supabase.from('vehicles').select('*').eq('resident_id', resident.id).order('created_at'),
      ]);
      setMaintenance(mRes.data || []);
      setComplaints(cRes.data || []);
      setFamilyMembers(fRes.data || []);
      setVehicles(vRes.data || []);
    };
    fetchAll();
  }, [resident?.id, open]);

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
            <Mail className="h-4 w-4 text-primary" />
            <div><p className="text-xs text-muted-foreground">{t('email')}</p><p className="font-medium text-sm truncate">{resident.email || '-'}</p></div>
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
          {familyMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_family_members_added')}</p>
          ) : (
            <div className="space-y-2">
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
          )}
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
