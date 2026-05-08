import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ROLE_LABELS } from '@/types/society';
import { Building2, Users, KeyRound, Edit2, Trash2, Save, Plus, Ban, ShieldCheck, Rocket, Search, Filter, AlertTriangle, HardHat, History, SlidersHorizontal, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAllResidents } from '@/hooks/useSocietyData';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';
import { PageHeader, SectionCard } from '@/components/layout/PagePrimitives';
import RolePermissionsCard from '@/components/RolePermissionsCard';


type AppRole = Database['public']['Enums']['app_role'];

const ROLE_FILTER_OPTIONS = ['all', 'master_admin', 'president', 'vice_president', 'treasury_head', 'secretary', 'coordinator', 'supervisor', 'resident', 'helper'];

const SocietySettings = () => {
  const { user, isMasterAdmin } = useAuth();
  const { t } = useLanguage();
  const { data: residents = [] } = useAllResidents();
  const queryClient = useQueryClient();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [helpers, setHelpers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [editResident, setEditResident] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', house_no: '', lane_no: '', mobile: '', family_members: '1' });

  // Add user dialog
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ name: '', house_no: '', lane_no: '', mobile: '', resident_type: 'owner' });

  // Helper dialog
  const [helperDialogOpen, setHelperDialogOpen] = useState(false);
  const [editingHelper, setEditingHelper] = useState<any>(null);
  const [helperForm, setHelperForm] = useState({ name: '', mobile: '', role_title: 'Helper', notes: '' });

  // Search & filter for users
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Duplicate guard state
  const [duplicateAlert, setDuplicateAlert] = useState<{ open: boolean; existing: { name: string; house: string } | null; payload: any | null }>({ open: false, existing: null, payload: null });

  const [editingSociety, setEditingSociety] = useState(false);
  const [societyForm, setSocietyForm] = useState({
    name: 'Shri Vidhya Niwas',
    totalHouses: '40+',
    lanes: '4',
    monthlyMaintenance: '₹3,000 per house',
    adminName: 'Labhansh Garg',
  });
  const [societyRowId, setSocietyRowId] = useState<string | null>(null);

  useEffect(() => { fetchUsersAndRoles(); fetchHelpers(); fetchSocietyInfo(); fetchDevices(); }, []);

  const fetchSocietyInfo = async () => {
    const { data } = await supabase.from('society_info').select('*').limit(1).maybeSingle();
    if (data) {
      setSocietyRowId(data.id);
      setSocietyForm({
        name: data.name, totalHouses: data.total_houses, lanes: data.lanes,
        monthlyMaintenance: data.monthly_maintenance, adminName: data.admin_name,
      });
    }
  };

  // Realtime sync for society_info — keeps everyone in sync, fixes "auto-revert" bug
  useEffect(() => {
    const channel = supabase.channel('society-info-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'society_info' }, fetchSocietyInfo).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchUsersAndRoles = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: userRoles } = await supabase.from('user_roles').select('*');
    setUsers(profiles || []);
    setRoles(userRoles || []);
  };

  const fetchHelpers = async () => {
    const { data } = await supabase.from('helpers').select('*').order('created_at', { ascending: false });
    setHelpers(data || []);
  };

  const fetchDevices = async () => {
    const { data } = await supabase.from('app_user_devices' as any).select('*').order('last_seen_at', { ascending: false });
    setDevices(data || []);
  };

  const getUserDevice = (userId?: string) => {
    if (!userId) return null;
    return devices.find((d: any) => d.user_id === userId);
  };

  // Realtime sync for profiles + helpers
  useEffect(() => {
    const channel = supabase.channel('settings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { fetchUsersAndRoles(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'helpers' }, () => { fetchHelpers(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_user_devices' }, () => { fetchDevices(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getUserRole = (userId: string) => {
    const r = roles.find((r: any) => r.user_id === userId);
    return r?.role || 'No role';
  };

  const handleForceResetPassword = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke('force-reset-password', {
      body: { target_user_id: userId },
    });
    if (error) { toast.error('Failed to reset password'); return; }
    toast.success(data?.message || 'Password reset to mobile number');
  };

  const handleToggleBlock = async (matchedUser: any, currentRole: string) => {
    if (!matchedUser) { toast.error('User has not signed up yet'); return; }
    if (currentRole === 'master_admin') { toast.error('Cannot block the master admin'); return; }
    if (matchedUser.user_id === user?.id) { toast.error('You cannot block yourself'); return; }
    const newBlocked = !matchedUser.is_blocked;
    const { error } = await supabase.from('profiles').update({ is_blocked: newBlocked } as any).eq('user_id', matchedUser.user_id);
    if (error) { toast.error(error.message); return; }
    if (newBlocked) {
      await supabase.functions.invoke('force-reset-password', { body: { target_user_id: matchedUser.user_id } }).catch(() => {});
    }
    toast.success(newBlocked ? 'User blocked' : 'User unblocked');
    fetchUsersAndRoles();
  };

  const openEditResident = (r: any) => {
    setEditResident(r);
    setEditForm({ name: r.name, house_no: r.house_no, lane_no: r.lane_no, mobile: r.mobile, family_members: String(r.family_members || 1) });
  };

  const handleSaveResident = async () => {
    if (!editResident) return;
    const { error } = await supabase.from('residents').update({
      name: editForm.name, house_no: editForm.house_no, lane_no: editForm.lane_no,
      mobile: editForm.mobile, family_members: Number(editForm.family_members),
    }).eq('id', editResident.id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    setEditResident(null);
    toast.success(t('resident_updated'));
  };

  const handleDeleteResident = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    const { error } = await supabase.from('residents').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    toast.success(t('resident_removed'));
  };

  const handleDeleteUser = async (resident: any, matchedUser: any, currentRole: string) => {
    if (!confirm(t('confirm_complete_user_delete'))) return;
    if (currentRole === 'master_admin') { toast.error('Master admin cannot be deleted'); return; }
    if (matchedUser?.user_id === user?.id) { toast.error('You cannot delete yourself'); return; }
    if (matchedUser?.user_id) {
      const { data, error } = await supabase.functions.invoke('delete-app-user', { body: { target_user_id: matchedUser.user_id } });
      if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || 'Delete failed'); return; }
    } else {
      const { error } = await supabase.from('residents').delete().eq('id', resident.id);
      if (error) { toast.error(error.message); return; }
    }
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    queryClient.invalidateQueries({ queryKey: ['all_residents'] });
    fetchUsersAndRoles();
    fetchDevices();
    toast.success(t('user_deleted_completely'));
  };

  // Add User: handles helpers separately + duplicate check + master override
  const performAddUser = async (force: boolean) => {
    const isHelper = addUserForm.resident_type === 'helper';

    if (isHelper) {
      // Helpers go to a separate table
      const { error } = await supabase.from('helpers').insert({
        name: addUserForm.name,
        mobile: addUserForm.mobile || null,
        role_title: 'Helper',
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Helper added');
      fetchHelpers();
      setAddUserOpen(false);
      setAddUserForm({ name: '', house_no: '', lane_no: '', mobile: '', resident_type: 'owner' });
      setDuplicateAlert({ open: false, existing: null, payload: null });
      return;
    }

    if (!addUserForm.house_no) {
      toast.error(t('please_fill_required'));
      return;
    }

    // Owner duplicate-per-house check
    if (addUserForm.resident_type === 'owner') {
      const { data: existingOwners } = await supabase.from('residents').select('id')
        .eq('house_no', addUserForm.house_no).eq('lane_no', addUserForm.lane_no).eq('resident_type', 'owner');
      if (existingOwners && existingOwners.length > 0) {
        toast.error('A house owner already exists for this house number. Use member or tenant instead.');
        return;
      }
    }

    let ownerId: string | null = null;
    if (addUserForm.resident_type === 'member' || addUserForm.resident_type === 'tenant') {
      const { data: owners } = await supabase.from('residents').select('id')
        .eq('house_no', addUserForm.house_no).eq('lane_no', addUserForm.lane_no).eq('resident_type', 'owner').limit(1);
      if (!owners || owners.length === 0) {
        toast.error('No house owner found for this house. Register an owner first.');
        return;
      }
      ownerId = owners[0].id;
    }

    // Duplicate check by mobile (skipped if force=true and master admin)
    if (!force) {
      const { data: dup } = await supabase.rpc('check_duplicate_resident', { _mobile: addUserForm.mobile });
      const dupRow = Array.isArray(dup) ? dup[0] : dup;
      if (dupRow?.exists_in_residents) {
        setDuplicateAlert({
          open: true,
          existing: { name: dupRow.existing_name || 'Unknown', house: dupRow.existing_house || '' },
          payload: { ...addUserForm, owner_id: ownerId },
        });
        return;
      }
    }

    const payload: any = {
      name: addUserForm.name,
      house_no: addUserForm.house_no,
      lane_no: addUserForm.lane_no,
      mobile: addUserForm.mobile,
      resident_type: addUserForm.resident_type,
      owner_id: ownerId,
    };

    const { error } = await supabase.from('residents').insert(payload);
    if (error) {
      // Catch unique constraint violation
      if (error.code === '23505') {
        toast.error('A resident with this mobile already exists. Master admin can override.');
        return;
      }
      toast.error(error.message);
      return;
    }
    toast.success('User added');
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    queryClient.invalidateQueries({ queryKey: ['all_residents'] });
    setAddUserOpen(false);
    setAddUserForm({ name: '', house_no: '', lane_no: '', mobile: '', resident_type: 'owner' });
    setDuplicateAlert({ open: false, existing: null, payload: null });
  };

  const handleAddUser = async () => {
    if (!addUserForm.name || !addUserForm.mobile) {
      toast.error(t('please_fill_required'));
      return;
    }
    await performAddUser(false);
  };

  // Helper CRUD
  const openAddHelper = () => { setEditingHelper(null); setHelperForm({ name: '', mobile: '', role_title: 'Helper', notes: '' }); setHelperDialogOpen(true); };
  const openEditHelper = (h: any) => { setEditingHelper(h); setHelperForm({ name: h.name, mobile: h.mobile || '', role_title: h.role_title, notes: h.notes || '' }); setHelperDialogOpen(true); };
  const handleSaveHelper = async () => {
    if (!helperForm.name) { toast.error(t('please_fill_required')); return; }
    const payload = { name: helperForm.name, mobile: helperForm.mobile || null, role_title: helperForm.role_title, notes: helperForm.notes || null };
    if (editingHelper) {
      const { error } = await supabase.from('helpers').update(payload).eq('id', editingHelper.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('helpers').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editingHelper ? 'Helper updated' : 'Helper added');
    setHelperDialogOpen(false);
    fetchHelpers();
  };
  const handleDeleteHelper = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    const { error } = await supabase.from('helpers').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Helper removed');
    fetchHelpers();
  };

  const handleSaveSocietyInfo = async () => {
    const payload = {
      name: societyForm.name, total_houses: societyForm.totalHouses, lanes: societyForm.lanes,
      monthly_maintenance: societyForm.monthlyMaintenance, admin_name: societyForm.adminName,
      updated_by: user?.id,
    };
    if (societyRowId) {
      const { error } = await supabase.from('society_info').update(payload).eq('id', societyRowId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('society_info').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    setEditingSociety(false);
    toast.success(t('society_info_updated'));
  };

  // Filtered + searched user list
  const filteredResidents = useMemo(() => {
    return residents.filter((r: any) => {
      const matchedUser = users.find((u: any) => u.mobile === r.mobile);
      const role = matchedUser ? getUserRole(matchedUser.user_id) : (r.pending_role || 'resident');
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || r.name?.toLowerCase().includes(q) || r.mobile?.includes(q) || r.house_no?.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || roleFilter === role;
      return matchesSearch && matchesRole;
    });
  }, [residents, users, roles, search, roleFilter]);

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader icon={Building2} title={t('settings')} subtitle={t('master_admin_controls')} />

      <Tabs defaultValue="society" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="society"><Building2 className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">{t('society_info')}</span><span className="sm:hidden">Society</span></TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">{t('manage_users')}</span><span className="sm:hidden">Users</span></TabsTrigger>
          <TabsTrigger value="helpers"><HardHat className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">{t('helpers')}</span><span className="sm:hidden">{t('helpers')}</span></TabsTrigger>
          <TabsTrigger value="permissions"><SlidersHorizontal className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">{t('permissions')}</span><span className="sm:hidden">Perms</span></TabsTrigger>
        </TabsList>

        <TabsContent value="society" className="mt-6">
          <SectionCard className="py-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl gradient-warm shadow-lg">
                  <Building2 className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display">{societyForm.name}</h2>
                  <p className="text-muted-foreground">Residential Society Management System</p>
                </div>
              </div>
              {!editingSociety && (
                <Button variant="outline" onClick={() => setEditingSociety(true)}><Edit2 className="h-4 w-4 mr-2" />{t('edit')}</Button>
              )}
            </div>
            {editingSociety ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>{t('society_name')}</Label><Input value={societyForm.name} onChange={(e) => setSocietyForm({ ...societyForm, name: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>{t('master_admin')}</Label><Input value={societyForm.adminName} onChange={(e) => setSocietyForm({ ...societyForm, adminName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2"><Label>{t('total_houses')}</Label><Input value={societyForm.totalHouses} onChange={(e) => setSocietyForm({ ...societyForm, totalHouses: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>{t('lanes')}</Label><Input value={societyForm.lanes} onChange={(e) => setSocietyForm({ ...societyForm, lanes: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>{t('monthly_maintenance')}</Label><Input value={societyForm.monthlyMaintenance} onChange={(e) => setSocietyForm({ ...societyForm, monthlyMaintenance: e.target.value })} /></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveSocietyInfo} className="gradient-warm text-primary-foreground"><Save className="h-4 w-4 mr-2" />{t('save_changes')}</Button>
                  <Button variant="outline" onClick={() => { setEditingSociety(false); fetchSocietyInfo(); }}>{t('cancel')}</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-card border"><span className="text-muted-foreground">{t('total_houses')}:</span> <span className="font-medium">{societyForm.totalHouses}</span></div>
                <div className="p-3 rounded-lg bg-card border"><span className="text-muted-foreground">{t('lanes')}:</span> <span className="font-medium">{societyForm.lanes}</span></div>
                <div className="p-3 rounded-lg bg-card border"><span className="text-muted-foreground">{t('monthly_maintenance')}:</span> <span className="font-medium">{societyForm.monthlyMaintenance}</span></div>
                <div className="p-3 rounded-lg bg-card border"><span className="text-muted-foreground">{t('master_admin')}:</span> <span className="font-medium">{societyForm.adminName}</span></div>
              </div>
            )}
          </SectionCard>

          {isMasterAdmin && (
            <>
              <SectionCard className="py-4 mt-6 border-destructive/30 bg-destructive/5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                      <Rocket className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-display">{t('release_updates')}</h3>
                      <p className="text-sm text-muted-foreground max-w-xl mt-1">
                        Force every installed PWA and browser session to immediately reload and reinstall the latest published version. Use this only after publishing new changes.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (!confirm('This will force-refresh the app for ALL users right now. Continue?')) return;
                      const { error } = await supabase.from('app_releases').insert({
                        released_by: user?.id ?? null,
                        note: 'Manual release triggered from Settings',
                      });
                      if (error) { toast.error('Failed to broadcast release: ' + error.message); return; }
                      toast.success('Release broadcast sent. All users will update shortly.');
                    }}
                  >
                    <Rocket className="h-4 w-4 mr-2" /> Release Updates
                  </Button>
                </div>
              </SectionCard>

              <SectionCard className="py-4 mt-6 border-warning/30 bg-warning/10">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/15 text-warning-foreground">
                      <History className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-display">{t('deleted_history')}</h3>
                      <p className="text-sm text-muted-foreground max-w-xl mt-1">
                        View and restore deleted maintenance and expense entries. Items older than 30 days are auto-purged.
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline">
                    <Link to="/deleted-history"><History className="h-4 w-4 mr-2" /> Open Deleted History</Link>
                  </Button>
                </div>
              </SectionCard>
            </>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search by name, mobile, or house no…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-52"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_FILTER_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r === 'all' ? 'All roles' : (ROLE_LABELS[r as any] || r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setAddUserOpen(true)} className="gradient-warm text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />{t('add_user')}
            </Button>
          </div>

          <SectionCard className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('house')}</TableHead>
                  <TableHead>{t('mobile')}</TableHead>
                  <TableHead>{t('lane')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('device')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResidents.map((r: any) => {
                  const matchedUser = users.find((u: any) => u.mobile === r.mobile);
                  const currentRole = matchedUser ? getUserRole(matchedUser.user_id) : (r.pending_role || 'resident');
                  const device = getUserDevice(matchedUser?.user_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.house_no}</TableCell>
                      <TableCell>{r.mobile}</TableCell>
                      <TableCell>{r.lane_no}</TableCell>
                      <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? t('active') : t('inactive')}</Badge></TableCell>
                      <TableCell>{device ? <Badge variant="outline" className="gap-1"><Smartphone className="h-3 w-3" />{device.platform} · {device.display_mode}</Badge> : <span className="text-xs text-muted-foreground">-</span>}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select value={currentRole} onValueChange={async (v) => {
                            await supabase.from('residents').update({ pending_role: v }).eq('id', r.id);
                            if (matchedUser) {
                              const userId = matchedUser.user_id;
                              const existing = roles.find((ro: any) => ro.user_id === userId);
                              if (existing) {
                                const { error } = await supabase.from('user_roles').update({ role: v as any }).eq('user_id', userId);
                                if (error) { toast.error(error.message); return; }
                              } else {
                                const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: v as any });
                                if (error) { toast.error(error.message); return; }
                              }
                            }
                            toast.success(t('role_updated'));
                            fetchUsersAndRoles();
                            queryClient.invalidateQueries({ queryKey: ['residents'] });
                          }}>
                            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {!matchedUser && <Badge variant="outline" className="text-xs whitespace-nowrap">{t('not_signed_up')}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {matchedUser?.is_blocked && <Badge variant="destructive" className="text-xs">{t('blocked')}</Badge>}
                          <Button variant="ghost" size="icon" onClick={() => openEditResident(r)}><Edit2 className="h-4 w-4" /></Button>
                          {matchedUser && (
                            <Button variant="outline" size="sm" onClick={() => handleForceResetPassword(matchedUser.user_id)} className="text-destructive border-destructive/30">
                              <KeyRound className="h-3 w-3 mr-1" /> {t('reset_password')}
                            </Button>
                          )}
                          {isMasterAdmin && matchedUser && currentRole !== 'master_admin' && matchedUser.user_id !== user?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleBlock(matchedUser, currentRole)}
                              className={matchedUser.is_blocked ? 'border-success/40 text-success' : 'border-destructive/40 text-destructive'}
                            >
                              {matchedUser.is_blocked ? <><ShieldCheck className="h-3 w-3 mr-1" />{t('unblock')}</> : <><Ban className="h-3 w-3 mr-1" />{t('block')}</>}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(r, matchedUser, currentRole)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredResidents.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No users match the filter.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="permissions" className="mt-6"><RolePermissionsCard /></TabsContent>

        {/* HELPERS TAB */}
        <TabsContent value="helpers" className="mt-6 space-y-4">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">Helpers are not residents. They don't have login or maintenance dues.</p>
            <Button onClick={openAddHelper} className="gradient-warm text-primary-foreground"><Plus className="h-4 w-4 mr-2" />{t('add_helper')}</Button>
          </div>
          <SectionCard className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{t('mobile')}</TableHead>
                  <TableHead>{t('notes')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {helpers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No helpers added yet.</TableCell></TableRow>
                ) : helpers.map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>{h.role_title}</TableCell>
                    <TableCell>{h.mobile || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{h.notes || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditHelper(h)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteHelper(h.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Edit Resident Dialog */}
      <Dialog open={!!editResident} onOpenChange={() => setEditResident(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">{t('edit_resident')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>{t('full_name')}</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>{t('house_no')}</Label><Input value={editForm.house_no} onChange={(e) => setEditForm({ ...editForm, house_no: e.target.value })} /></div>
              <div className="grid gap-2"><Label>{t('lane_no')}</Label><Input value={editForm.lane_no} onChange={(e) => setEditForm({ ...editForm, lane_no: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>{t('mobile')}</Label><Input value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} /></div>
            <Button onClick={handleSaveResident} className="w-full gradient-warm text-primary-foreground">{t('save_changes')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog (with Helper option) */}
      <Dialog open={addUserOpen} onOpenChange={(o) => { setAddUserOpen(o); if (!o) setDuplicateAlert({ open: false, existing: null, payload: null }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">{t('add_user')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>User Type</Label>
              <Select value={addUserForm.resident_type} onValueChange={(v) => setAddUserForm({ ...addUserForm, resident_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t('house_owner')}</SelectItem>
                  <SelectItem value="member">{t('family_member')}</SelectItem>
                  <SelectItem value="tenant">{t('tenant')}</SelectItem>
                  <SelectItem value="helper">Helper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>{t('full_name')} *</Label><Input value={addUserForm.name} onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })} /></div>

            {addUserForm.resident_type !== 'helper' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>{t('house_no')} *</Label><Input value={addUserForm.house_no} onChange={(e) => setAddUserForm({ ...addUserForm, house_no: e.target.value })} /></div>
                <div className="grid gap-2"><Label>{t('lane_no')}</Label><Input value={addUserForm.lane_no} onChange={(e) => setAddUserForm({ ...addUserForm, lane_no: e.target.value })} /></div>
              </div>
            )}
            <div className="grid gap-2"><Label>{t('mobile')} {addUserForm.resident_type !== 'helper' && '*'}</Label><Input value={addUserForm.mobile} onChange={(e) => setAddUserForm({ ...addUserForm, mobile: e.target.value })} /></div>

            {duplicateAlert.open && duplicateAlert.existing && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{duplicateAlert.existing.name}</strong> ({duplicateAlert.existing.house}) already exists with this mobile.
                  {isMasterAdmin && (
                    <div className="mt-2">
                      <Button size="sm" variant="destructive" onClick={() => performAddUser(true)}>Continue anyway (creates duplicate)</Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleAddUser} className="w-full gradient-warm text-primary-foreground">{t('add_user')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Helper Dialog */}
      <Dialog open={helperDialogOpen} onOpenChange={setHelperDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">{editingHelper ? 'Edit Helper' : 'Add Helper'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Name *</Label><Input value={helperForm.name} onChange={(e) => setHelperForm({ ...helperForm, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Role / Title</Label><Input value={helperForm.role_title} onChange={(e) => setHelperForm({ ...helperForm, role_title: e.target.value })} placeholder="e.g. Cleaner, Gardener, Security" /></div>
            <div className="grid gap-2"><Label>Mobile</Label><Input value={helperForm.mobile} onChange={(e) => setHelperForm({ ...helperForm, mobile: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Notes</Label><Input value={helperForm.notes} onChange={(e) => setHelperForm({ ...helperForm, notes: e.target.value })} /></div>
            <Button onClick={handleSaveHelper} className="w-full gradient-warm text-primary-foreground">{editingHelper ? 'Update' : 'Add'} Helper</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocietySettings;
