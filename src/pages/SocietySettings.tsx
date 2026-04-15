import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROLE_LABELS } from '@/types/society';
import { Building2, Users, KeyRound, Edit2, Trash2, Save, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAllResidents } from '@/hooks/useSocietyData';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const SocietySettings = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: residents = [] } = useAllResidents();
  const queryClient = useQueryClient();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [editResident, setEditResident] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', house_no: '', lane_no: '', mobile: '', family_members: '1' });

  // Add user dialog
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ name: '', house_no: '', lane_no: '', mobile: '', resident_type: 'owner' });

  const [editingSociety, setEditingSociety] = useState(false);
  const [societyForm, setSocietyForm] = useState({
    name: 'Shri Vidhya Niwas',
    totalHouses: '40+',
    lanes: '4',
    monthlyMaintenance: '₹3,000 per house',
    adminName: 'Labhansh Garg',
  });

  useEffect(() => { fetchUsersAndRoles(); }, []);

  const fetchUsersAndRoles = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: userRoles } = await supabase.from('user_roles').select('*');
    setUsers(profiles || []);
    setRoles(userRoles || []);
  };

  // Realtime sync for profiles
  useEffect(() => {
    const channel = supabase.channel('settings-profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { fetchUsersAndRoles(); })
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

  const handleAddUser = async () => {
    if (!addUserForm.name || !addUserForm.mobile || !addUserForm.house_no) {
      toast.error(t('please_fill_required'));
      return;
    }

    // Block duplicate house owner
    if (addUserForm.resident_type === 'owner') {
      const { data: existingOwners } = await supabase.from('residents').select('id')
        .eq('house_no', addUserForm.house_no)
        .eq('lane_no', addUserForm.lane_no)
        .eq('resident_type', 'owner');
      if (existingOwners && existingOwners.length > 0) {
        toast.error('A house owner already exists for this house number. Use member or tenant instead.');
        return;
      }
    }

    let ownerId: string | null = null;
    if (addUserForm.resident_type === 'member' || addUserForm.resident_type === 'tenant') {
      const { data: owners } = await supabase.from('residents').select('id')
        .eq('house_no', addUserForm.house_no)
        .eq('lane_no', addUserForm.lane_no)
        .eq('resident_type', 'owner')
        .limit(1);
      if (!owners || owners.length === 0) {
        toast.error('No house owner found for this house. Register an owner first.');
        return;
      }
      ownerId = owners[0].id;
    }

    const { error } = await supabase.from('residents').insert({
      name: addUserForm.name,
      house_no: addUserForm.house_no,
      lane_no: addUserForm.lane_no,
      mobile: addUserForm.mobile,
      resident_type: addUserForm.resident_type,
      owner_id: ownerId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('User added');
    queryClient.invalidateQueries({ queryKey: ['residents'] });
    queryClient.invalidateQueries({ queryKey: ['all_residents'] });
    setAddUserOpen(false);
    setAddUserForm({ name: '', house_no: '', lane_no: '', mobile: '', resident_type: 'owner' });
  };

  const handleSaveSocietyInfo = () => {
    localStorage.setItem('society_info', JSON.stringify(societyForm));
    setEditingSociety(false);
    toast.success(t('society_info_updated'));
  };

  useEffect(() => {
    const saved = localStorage.getItem('society_info');
    if (saved) { try { setSocietyForm(JSON.parse(saved)); } catch {} }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-foreground">{t('settings')}</h1>
        <p className="text-muted-foreground mt-1">{t('master_admin_controls')}</p>
      </div>

      <Tabs defaultValue="society" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="society"><Building2 className="h-4 w-4 mr-2" />{t('society_info')}</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />{t('manage_users')}</TabsTrigger>
        </TabsList>

        <TabsContent value="society" className="mt-6">
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <div className="flex items-center justify-between mb-6">
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
                  <Button variant="outline" onClick={() => setEditingSociety(false)}>{t('cancel')}</Button>
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
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setAddUserOpen(true)} className="gradient-warm text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />{t('add_user')}
            </Button>
          </div>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('house')}</TableHead>
                  <TableHead>{t('mobile')}</TableHead>
                  <TableHead>{t('lane')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.map((r: any) => {
                  const matchedUser = users.find((u: any) => u.mobile === r.mobile);
                  const currentRole = matchedUser ? getUserRole(matchedUser.user_id) : (r.pending_role || 'resident');
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.house_no}</TableCell>
                      <TableCell>{r.mobile}</TableCell>
                      <TableCell>{r.lane_no}</TableCell>
                      <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? t('active') : t('inactive')}</Badge></TableCell>
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
                          {!matchedUser && <Badge variant="outline" className="text-xs whitespace-nowrap">Not signed up</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditResident(r)}><Edit2 className="h-4 w-4" /></Button>
                          {matchedUser && (
                            <Button variant="outline" size="sm" onClick={() => handleForceResetPassword(matchedUser.user_id)} className="text-destructive border-destructive/30">
                              <KeyRound className="h-3 w-3 mr-1" /> {t('reset_password')}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteResident(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
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

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">{t('add_user')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('resident_type')}</Label>
              <Select value={addUserForm.resident_type} onValueChange={(v) => setAddUserForm({ ...addUserForm, resident_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t('house_owner')}</SelectItem>
                  <SelectItem value="member">{t('family_member')}</SelectItem>
                  <SelectItem value="tenant">{t('tenant')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>{t('full_name')} *</Label><Input value={addUserForm.name} onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>{t('house_no')} *</Label><Input value={addUserForm.house_no} onChange={(e) => setAddUserForm({ ...addUserForm, house_no: e.target.value })} /></div>
              <div className="grid gap-2"><Label>{t('lane_no')}</Label><Input value={addUserForm.lane_no} onChange={(e) => setAddUserForm({ ...addUserForm, lane_no: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>{t('mobile')} *</Label><Input value={addUserForm.mobile} onChange={(e) => setAddUserForm({ ...addUserForm, mobile: e.target.value })} /></div>
            
            <Button onClick={handleAddUser} className="w-full gradient-warm text-primary-foreground">{t('add_user')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocietySettings;
