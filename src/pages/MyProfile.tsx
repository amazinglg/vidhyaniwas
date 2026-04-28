import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserCircle, Home, Phone, Users, Save, IndianRupee, CheckCircle2, Clock, AlertTriangle, Car, Plus, Edit2, Trash2, UsersRound, FileDown, Crown, RefreshCw, Download, Smartphone, Bell, BellOff, AlertCircle, HelpCircle } from 'lucide-react';
import { hardRefreshApp } from '@/utils/hardRefresh';
import LinkedMembersCard from '@/components/LinkedMembersCard';
import AppSettingsCard from '@/components/AppSettingsCard';

const APK_DOWNLOAD_URL = (import.meta.env.VITE_APK_URL as string) || '/downloads/vidhyaniwas.apk';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { downloadReceipt } from '@/utils/generateReceipt';

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { paid: 'default', partial: 'secondary', pending: 'outline', overdue: 'destructive' };
const statusIcon: Record<string, any> = { paid: CheckCircle2, partial: Clock, pending: Clock, overdue: AlertTriangle };

const RELATIONS = ['Self', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other'];
const VEHICLE_TYPES = ['Car', 'Bike', 'Scooter', 'Bicycle', 'Auto', 'Other'];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isInStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

const MyProfile = () => {
  const { user, residentId } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<any>(null);
  const [resident, setResident] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', mobile: '' });
  const [maintenance, setMaintenance] = useState<any[]>([]);

  // PWA install button
  const [deferredInstall, setDeferredInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(isInStandalone());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredInstall(e as BeforeInstallPromptEvent); };
    const installed = () => { setStandalone(true); setDeferredInstall(null); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const canInstall = !standalone && (deferredInstall || isIOS);

  const handleInstallApp = async () => {
    if (deferredInstall) {
      setInstalling(true);
      try {
        await deferredInstall.prompt();
        const { outcome } = await deferredInstall.userChoice;
        if (outcome === 'accepted') {
          toast.success(lang === 'hi' ? 'ऐप इंस्टॉल हो रहा है…' : 'App installing…');
        }
      } finally {
        setInstalling(false);
        setDeferredInstall(null);
      }
    } else if (isIOS) {
      toast.info(t('install_ios_msg') || 'On iOS: tap Share → Add to Home Screen.');
    }
  };

  // Family members
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [familyDialog, setFamilyDialog] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [familyForm, setFamilyForm] = useState({ name: '', relation: 'Other', age: '', occupation: '' });

  // Vehicles
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ vehicle_type: 'Car', registration_no: '', make_model: '', color: '' });

  // Tenants (for owners)
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantDialog, setTenantDialog] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [tenantForm, setTenantForm] = useState({ name: '', mobile: '' });

  // House owner info (for tenants/members)
  const [houseOwner, setHouseOwner] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: profileData } = await supabase.from('profiles').select('*, residents(*)').eq('user_id', user.id).maybeSingle();
      if (profileData) {
        setProfile(profileData);
        setResident(profileData.residents);
        setForm({ full_name: profileData.full_name || '', mobile: profileData.mobile || '' });
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!residentId) return;
    const fetchMaintenance = async () => {
      const { data } = await supabase.from('maintenance_collections').select('*').eq('resident_id', residentId).order('created_at', { ascending: false });
      setMaintenance(data || []);
    };
    fetchMaintenance();
    const channel = supabase.channel('my-maintenance').on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_collections', filter: `resident_id=eq.${residentId}` }, () => { fetchMaintenance(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [residentId]);

  // Fetch family, vehicles & tenants
  const fetchFamily = async () => {
    if (!residentId) return;
    const { data } = await supabase.from('family_member_details').select('*').eq('resident_id', residentId).order('created_at');
    setFamilyMembers(data || []);
  };
  const fetchVehicles = async () => {
    if (!residentId) return;
    const { data } = await supabase.from('vehicles').select('*').eq('resident_id', residentId).order('created_at');
    setVehicles(data || []);
  };
  const fetchTenants = async () => {
    if (!residentId) return;
    const { data } = await supabase.from('residents').select('*').eq('owner_id', residentId).eq('resident_type', 'tenant');
    setTenants(data || []);
  };

  useEffect(() => { fetchFamily(); fetchVehicles(); fetchTenants(); }, [residentId]);

  // Determine read-only status: family/tenant cannot edit anything
  const isOwner = resident?.resident_type === 'owner';
  const isFamilyOrTenant = resident && (resident.resident_type === 'member' || resident.resident_type === 'tenant');
  const canEditUnit = isOwner; // only owner can add family/vehicle/tenant

  // Fetch house owner for tenants/family members
  useEffect(() => {
    if (!resident || resident.resident_type === 'owner') return;
    const fetchOwner = async () => {
      if (resident.owner_id) {
        const { data } = await supabase.from('residents').select('name, mobile, house_no, lane_no').eq('id', resident.owner_id).maybeSingle();
        setHouseOwner(data);
      } else {
        // Fallback: find owner by same house_no + lane_no
        const { data } = await supabase.from('residents').select('name, mobile, house_no, lane_no').eq('house_no', resident.house_no).eq('lane_no', resident.lane_no).eq('resident_type', 'owner').maybeSingle();
        setHouseOwner(data);
      }
    };
    fetchOwner();
  }, [resident]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ full_name: form.full_name, mobile: form.mobile }).eq('user_id', user.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('profile_updated'));
    setEditing(false);
  };

  // Family CRUD
  const openAddFamily = () => { setEditingFamilyId(null); setFamilyForm({ name: '', relation: 'Other', age: '', occupation: '' }); setFamilyDialog(true); };
  const openEditFamily = (fm: any) => { setEditingFamilyId(fm.id); setFamilyForm({ name: fm.name, relation: fm.relation, age: fm.age?.toString() || '', occupation: fm.occupation || '' }); setFamilyDialog(true); };
  const handleSaveFamily = async () => {
    if (!familyForm.name || !residentId) { toast.error(t('please_fill_required')); return; }
    const payload = { resident_id: residentId, name: familyForm.name, relation: familyForm.relation, age: familyForm.age ? Number(familyForm.age) : null, occupation: familyForm.occupation || null };
    if (editingFamilyId) {
      const { error } = await supabase.from('family_member_details').update(payload).eq('id', editingFamilyId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('family_member_details').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editingFamilyId ? t('update') : t('add'));
    setFamilyDialog(false);
    fetchFamily();
  };
  const handleDeleteFamily = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    await supabase.from('family_member_details').delete().eq('id', id);
    fetchFamily();
  };

  // Vehicle CRUD
  const openAddVehicle = () => { setEditingVehicleId(null); setVehicleForm({ vehicle_type: 'Car', registration_no: '', make_model: '', color: '' }); setVehicleDialog(true); };
  const openEditVehicle = (v: any) => { setEditingVehicleId(v.id); setVehicleForm({ vehicle_type: v.vehicle_type, registration_no: v.registration_no, make_model: v.make_model || '', color: v.color || '' }); setVehicleDialog(true); };
  const handleSaveVehicle = async () => {
    if (!vehicleForm.registration_no || !residentId) { toast.error(t('please_fill_required')); return; }
    const payload = { resident_id: residentId, vehicle_type: vehicleForm.vehicle_type, registration_no: vehicleForm.registration_no, make_model: vehicleForm.make_model || null, color: vehicleForm.color || null };
    if (editingVehicleId) {
      const { error } = await supabase.from('vehicles').update(payload).eq('id', editingVehicleId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('vehicles').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editingVehicleId ? t('update') : t('add'));
    setVehicleDialog(false);
    fetchVehicles();
  };
  const handleDeleteVehicle = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    await supabase.from('vehicles').delete().eq('id', id);
    fetchVehicles();
  };

  // Tenant CRUD (owner only)
  const openAddTenant = () => { setEditingTenantId(null); setTenantForm({ name: '', mobile: '' }); setTenantDialog(true); };
  const openEditTenant = (tn: any) => { setEditingTenantId(tn.id); setTenantForm({ name: tn.name, mobile: tn.mobile }); setTenantDialog(true); };
  const handleSaveTenant = async () => {
    if (!tenantForm.name || !tenantForm.mobile || !residentId || !resident) { toast.error(t('please_fill_required')); return; }
    if (!editingTenantId && tenants.length >= 1) { toast.error('Only one tenant per house is allowed'); return; }
    const payload = {
      name: tenantForm.name, mobile: tenantForm.mobile,
      house_no: resident.house_no, lane_no: resident.lane_no,
      resident_type: 'tenant' as const, owner_id: residentId,
    };
    if (editingTenantId) {
      const { error } = await supabase.from('residents').update(payload).eq('id', editingTenantId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('residents').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editingTenantId ? t('update') : t('tenant_added'));
    setTenantDialog(false);
    fetchTenants();
    queryClient.invalidateQueries({ queryKey: ['residents'] });
  };
  const handleDeleteTenant = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    await supabase.from('residents').delete().eq('id', id);
    fetchTenants();
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    toast.success(t('tenant_removed'));
  };

  const totalPaid = maintenance.reduce((s, m) => s + Number(m.amount || 0), 0);
  const totalDue = maintenance.reduce((s, m) => s + Number(m.due_amount || 0), 0);

  const handleDownloadReceipt = async (m: any) => {
    const { data: receipt } = await supabase.from('maintenance_receipts').select('*').eq('maintenance_collection_id', m.id).maybeSingle();
    const r: any = receipt || {};
    downloadReceipt({
      societyName: r.society_name || 'Vidhya Niwas Society',
      receiptNo: r.receipt_no || m.receipt_no || 'N/A',
      receiptDate: r.receipt_date || m.paid_date || new Date().toISOString().split('T')[0],
      residentName: r.resident_name || resident?.name || form.full_name || '',
      houseNo: r.house_no || resident?.house_no || '',
      laneNo: r.lane_no || resident?.lane_no || '',
      month: r.month || m.month,
      year: r.year || m.year,
      totalMaintenance: Number(r.total_maintenance || m.total_maintenance || 0),
      amountPaid: Number(r.amount_paid || m.amount || 0),
      dueAmount: Number(r.due_amount || m.due_amount || 0),
      paymentMode: r.payment_mode || m.payment_mode || '',
      notes: r.notes || 'This is a digitally generated receipt and does not require a manual signature.',
      customFields: r.custom_fields || {},
    });
  };

  // Compact section header to match AppSettingsCard style
  const SectionHeader = ({ icon: Icon, title, subtitle, action }: any) => (
    <div className="flex items-center justify-between pt-3 pb-2">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-bold font-display uppercase tracking-wide truncate">{title}</h3>
        {subtitle && <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">• {subtitle}</span>}
      </div>
      {action}
    </div>
  );

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">{t('my_profile')}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t('view_update_info')}</p>
      </div>

      {/* Profile Card — compact */}
      <Card className="px-5 py-2 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-center gap-3 pt-3 pb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-warm shadow-md shrink-0">
            <UserCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold font-display truncate">{form.full_name || 'Your Name'}</h2>
            {resident && <p className="text-[11px] text-muted-foreground truncate">{t('house')} {resident.house_no} • {t('lane')} {resident.lane_no}</p>}
          </div>
          {!editing && (
            <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="h-8 text-xs shrink-0">
              <Edit2 className="h-3.5 w-3.5 mr-1" />{t('edit')}
            </Button>
          )}
        </div>
        {editing ? (
          <div className="grid gap-3 pb-3">
            <div className="grid gap-1.5"><Label className="text-xs">{t('full_name')}</Label><Input className="h-9" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">{t('mobile')}</Label><Input className="h-9" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="h-8 text-xs gradient-warm text-primary-foreground"><Save className="h-3.5 w-3.5 mr-1" />{t('save')}</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditing(false)}>{t('cancel')}</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-card border"><Phone className="h-3.5 w-3.5 text-primary shrink-0" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground leading-none">{t('mobile')}</p><p className="text-xs font-medium truncate">{form.mobile || t('not_set')}</p></div></div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-card border"><Home className="h-3.5 w-3.5 text-primary shrink-0" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground leading-none">{t('house_no')}</p><p className="text-xs font-medium truncate">{resident?.house_no || t('not_set')}</p></div></div>
            {resident && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-card border"><Users className="h-3.5 w-3.5 text-primary shrink-0" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground leading-none">{t('family_members')}</p><p className="text-xs font-medium truncate">{resident.family_members || 1}</p></div></div>
            )}
          </div>
        )}
      </Card>

      {/* App Settings — consolidated card (notifications + install + refresh + APK) */}
      <AppSettingsCard
        canInstall={!!canInstall}
        installing={installing}
        isIOS={isIOS}
        standalone={standalone}
        onInstall={handleInstallApp}
        userId={user?.id}
        isMasterAdmin={profile?.mobile === '9826016419'}
        apkUrl={APK_DOWNLOAD_URL}
        lang={lang}
        t={t}
      />

      {/* House Owner card — shown to family members & tenants */}
      {resident && resident.resident_type !== 'owner' && houseOwner && (
        <Card className="px-5 py-2 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 pt-3 pb-2">
            <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-bold font-display uppercase tracking-wide">{lang === 'hi' ? 'मकान मालिक' : 'House Owner'}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 pb-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-card border"><UserCircle className="h-3.5 w-3.5 text-primary shrink-0" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground leading-none">{t('name')}</p><p className="text-xs font-medium truncate">{houseOwner.name}</p></div></div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-card border"><Phone className="h-3.5 w-3.5 text-primary shrink-0" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground leading-none">{t('mobile')}</p><p className="text-xs font-medium truncate">{houseOwner.mobile}</p></div></div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-card border"><Home className="h-3.5 w-3.5 text-primary shrink-0" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground leading-none">{t('house_no')}</p><p className="text-xs font-medium truncate">{houseOwner.house_no}</p></div></div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-card border"><Home className="h-3.5 w-3.5 text-primary shrink-0" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground leading-none">{t('lane')}</p><p className="text-xs font-medium truncate">{houseOwner.lane_no}</p></div></div>
          </div>
        </Card>
      )}

      {/* Linked Members (owners only) */}
      {residentId && isOwner && resident && (
        <LinkedMembersCard ownerResidentId={residentId} ownerHouseNo={resident.house_no} ownerLaneNo={resident.lane_no} />
      )}

      {/* Tenant Management (owners only) */}
      {residentId && isOwner && (
        <Card className="px-5 py-2">
          <SectionHeader
            icon={UsersRound}
            title={t('tenants')}
            subtitle={t('manage_tenant_info')}
            action={tenants.length === 0 && <Button size="sm" className="h-8 text-xs gradient-warm text-primary-foreground" onClick={openAddTenant}><Plus className="h-3.5 w-3.5 mr-1" />{t('add_tenant')}</Button>}
          />
          <div className="pb-3">
          {tenants.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-3">{t('no_tenants')}</p>
          ) : (
            <div className="space-y-1.5">
              {tenants.map(tn => (
                <div key={tn.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate">{tn.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{t('tenant')}</Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{tn.mobile}</span>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTenant(tn)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteTenant(tn.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </Card>
      )}

      {/* Family Members — visible for ALL residents (owner can edit, family/tenant read-only) */}
      {residentId && (
        <Card className="px-5 py-2">
          <SectionHeader
            icon={Users}
            title={t('family_member_details')}
            subtitle={t('manage_family_info')}
            action={canEditUnit && <Button size="sm" className="h-8 text-xs gradient-warm text-primary-foreground" onClick={openAddFamily}><Plus className="h-3.5 w-3.5 mr-1" />{t('add')}</Button>}
          />
          <div className="pb-3">
          {familyMembers.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-3">{t('no_family_members_added')}</p>
          ) : (
            <div className="space-y-1.5">
              {familyMembers.map(fm => (
                <div key={fm.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate">{fm.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{fm.relation}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {fm.age && <span>{t('age')}: {fm.age}</span>}
                      {fm.age && fm.occupation && <span> • </span>}
                      {fm.occupation && <span>{fm.occupation}</span>}
                    </div>
                  </div>
                  {canEditUnit && (
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditFamily(fm)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteFamily(fm.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        </Card>
      )}

      {/* Vehicles — visible for ALL residents (owner can edit, family/tenant read-only) */}
      {residentId && (
        <Card className="px-5 py-2">
          <SectionHeader
            icon={Car}
            title={t('vehicles')}
            subtitle={t('manage_vehicle_info')}
            action={canEditUnit && <Button size="sm" className="h-8 text-xs gradient-warm text-primary-foreground" onClick={openAddVehicle}><Plus className="h-3.5 w-3.5 mr-1" />{t('add')}</Button>}
          />
          <div className="pb-3">
          {vehicles.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-3">{t('no_vehicles_added')}</p>
          ) : (
            <div className="space-y-1.5">
              {vehicles.map(v => (
                <div key={v.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{v.vehicle_type}</Badge>
                      <span className="text-sm font-medium truncate">{v.registration_no}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {v.make_model && <span>{v.make_model}</span>}
                      {v.make_model && v.color && <span> • </span>}
                      {v.color && <span>{v.color}</span>}
                    </div>
                  </div>
                  {canEditUnit && (
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditVehicle(v)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteVehicle(v.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        </Card>
      )}

      {/* Maintenance Payment History */}
      {residentId && (
        <Card className="px-5 py-2">
          <div className="flex items-center gap-2 pt-3 pb-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold font-display uppercase tracking-wide">{t('maintenance_fund')}</h3>
            <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">• {t('your_payment_history')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="text-[10px] text-green-600 dark:text-green-400 font-medium uppercase tracking-wide">{t('total_paid')}</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wide">{t('total_pending')}</p>
              <p className="text-lg font-bold text-orange-700 dark:text-orange-300">₹{totalDue.toLocaleString()}</p>
            </div>
          </div>
          {maintenance.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('no_records')}</p>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('month')}</TableHead><TableHead>{t('total_maintenance')}</TableHead><TableHead>{t('paid')}</TableHead><TableHead>{t('due')}</TableHead><TableHead>{t('date')}</TableHead><TableHead>{t('status')}</TableHead><TableHead>{t('payment_mode')}</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
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
                          <TableCell><Badge variant={statusBadge[m.status] || 'outline'} className="gap-1"><StatusIcon className="h-3 w-3" />{t(m.status)}</Badge></TableCell>
                          <TableCell className="capitalize">{m.payment_mode || '-'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDownloadReceipt(m)} title="Download Receipt">
                              <FileDown className="h-4 w-4 text-primary" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-3">
                {maintenance.map((m) => {
                  const StatusIcon = statusIcon[m.status] || Clock;
                  return (
                    <div key={m.id} className="p-4 rounded-lg border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{m.month} {m.year}</span>
                        <Badge variant={statusBadge[m.status] || 'outline'} className="gap-1"><StatusIcon className="h-3 w-3" />{t(m.status)}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div><p className="text-muted-foreground text-xs">{t('total_maintenance')}</p><p className="font-medium">₹{Number(m.total_maintenance || 0).toLocaleString()}</p></div>
                        <div><p className="text-muted-foreground text-xs">{t('paid')}</p><p className="font-medium text-green-600">₹{Number(m.amount || 0).toLocaleString()}</p></div>
                        <div><p className="text-muted-foreground text-xs">{t('due')}</p><p className="font-medium text-orange-600">₹{Number(m.due_amount || 0).toLocaleString()}</p></div>
                      </div>
                      <div className="text-xs text-muted-foreground">{m.paid_date || '-'} • {m.payment_mode || '-'}</div>
                      <div className="flex justify-end pt-1">
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(m)}>
                          <FileDown className="h-3.5 w-3.5 text-primary mr-1" /> Receipt
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Family Member Dialog */}
      <Dialog open={familyDialog} onOpenChange={setFamilyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingFamilyId ? t('edit') : t('add')} {t('family_member_details')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>{t('name')} *</Label><Input value={familyForm.name} onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>{t('relation')}</Label>
              <Select value={familyForm.relation} onValueChange={(v) => setFamilyForm({ ...familyForm, relation: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RELATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>{t('age')}</Label><Input type="number" value={familyForm.age} onChange={(e) => setFamilyForm({ ...familyForm, age: e.target.value })} /></div>
              <div className="grid gap-2"><Label>{t('occupation')}</Label><Input value={familyForm.occupation} onChange={(e) => setFamilyForm({ ...familyForm, occupation: e.target.value })} /></div>
            </div>
            <Button onClick={handleSaveFamily} className="w-full">{editingFamilyId ? t('update') : t('add')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vehicle Dialog */}
      <Dialog open={vehicleDialog} onOpenChange={setVehicleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingVehicleId ? t('edit') : t('add')} {t('vehicle')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('vehicle_type')}</Label>
              <Select value={vehicleForm.vehicle_type} onValueChange={(v) => setVehicleForm({ ...vehicleForm, vehicle_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VEHICLE_TYPES.map(vt => <SelectItem key={vt} value={vt}>{vt}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>{t('registration_no')} *</Label><Input value={vehicleForm.registration_no} onChange={(e) => setVehicleForm({ ...vehicleForm, registration_no: e.target.value })} placeholder="e.g. UP14XX1234" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>{t('make_model')}</Label><Input value={vehicleForm.make_model} onChange={(e) => setVehicleForm({ ...vehicleForm, make_model: e.target.value })} placeholder="e.g. Maruti Swift" /></div>
              <div className="grid gap-2"><Label>{t('color')}</Label><Input value={vehicleForm.color} onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })} /></div>
            </div>
            <Button onClick={handleSaveVehicle} className="w-full">{editingVehicleId ? t('update') : t('add')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tenant Dialog */}
      <Dialog open={tenantDialog} onOpenChange={setTenantDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingTenantId ? t('edit_tenant') : t('add_tenant')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>{t('name')} *</Label><Input value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>{t('mobile')} *</Label><Input value={tenantForm.mobile} onChange={(e) => setTenantForm({ ...tenantForm, mobile: e.target.value })} /></div>
            <Button onClick={handleSaveTenant} className="w-full gradient-warm text-primary-foreground">{editingTenantId ? t('update') : t('add_tenant')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProfile;
