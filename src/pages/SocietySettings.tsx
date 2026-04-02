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
import { Building2, Shield, Users, KeyRound, Edit2, Trash2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useResidents } from '@/hooks/useSocietyData';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const SocietySettings = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: residents = [] } = useResidents();
  const queryClient = useQueryClient();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [editResident, setEditResident] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', house_no: '', lane_no: '', mobile: '', email: '', family_members: '1' });
  const [roleDialog, setRoleDialog] = useState<{ userId: string; currentRole: string } | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('resident');

  // Society info editing
  const [editingSociety, setEditingSociety] = useState(false);
  const [societyForm, setSocietyForm] = useState({
    name: 'Shri Vidhya Niwas',
    totalHouses: '40+',
    lanes: '4',
    monthlyMaintenance: '₹3,000 per house',
    adminName: 'Labhansh Garg',
  });

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: userRoles } = await supabase.from('user_roles').select('*');
    setUsers(profiles || []);
    setRoles(userRoles || []);
  };

  const getUserRole = (userId: string) => {
    const r = roles.find((r: any) => r.user_id === userId);
    return r?.role || 'No role';
  };

  const handleChangeRole = async () => {
    if (!roleDialog) return;
    const existing = roles.find((r: any) => r.user_id === roleDialog.userId);
    if (existing) {
      const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', roleDialog.userId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('user_roles').insert({ user_id: roleDialog.userId, role: newRole });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t('role_updated'));
    setRoleDialog(null);
    fetchUsersAndRoles();
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
    setEditForm({ name: r.name, house_no: r.house_no, lane_no: r.lane_no, mobile: r.mobile, email: r.email || '', family_members: String(r.family_members || 1) });
  };

  const handleSaveResident = async () => {
    if (!editResident) return;
    const { error } = await supabase.from('residents').update({
      name: editForm.name, house_no: editForm.house_no, lane_no: editForm.lane_no,
      mobile: editForm.mobile, email: editForm.email || null, family_members: Number(editForm.family_members),
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

  const handleSaveSocietyInfo = () => {
    // Save to localStorage for now (could be a DB table later)
    localStorage.setItem('society_info', JSON.stringify(societyForm));
    setEditingSociety(false);
    toast.success(t('society_info_updated'));
  };

  // Load society info from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('society_info');
    if (saved) {
      try { setSocietyForm(JSON.parse(saved)); } catch {}
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-foreground">{t('settings')}</h1>
        <p className="text-muted-foreground mt-1">{t('master_admin_controls')}</p>
      </div>

      <Tabs defaultValue="society" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="society"><Building2 className="h-4 w-4 mr-2" />{t('society_info')}</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />{t('manage_users')}</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="h-4 w-4 mr-2" />{t('manage_roles')}</TabsTrigger>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>{t('society_name')}</Label><Input value={societyForm.name} onChange={(e) => setSocietyForm({ ...societyForm, name: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>{t('master_admin')}</Label><Input value={societyForm.adminName} onChange={(e) => setSocietyForm({ ...societyForm, adminName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
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
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('house')}</TableHead>
                  <TableHead>{t('mobile')}</TableHead>
                  <TableHead>{t('lane')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.map((r: any) => {
                  // Find user for this resident by mobile to show role
                  const matchedUser = users.find((u: any) => u.mobile === r.mobile);
                  const role = matchedUser ? getUserRole(matchedUser.user_id) : 'No role';
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.house_no}</TableCell>
                      <TableCell>{r.mobile}</TableCell>
                      <TableCell>{r.lane_no}</TableCell>
                      <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? t('active') : t('inactive')}</Badge></TableCell>
                      <TableCell>
                        {matchedUser ? (
                          <Select value={role} onValueChange={(v) => {
                            const userId = matchedUser.user_id;
                            setRoleDialog({ userId, currentRole: role });
                            setNewRole(v as AppRole);
                            // Auto-save
                            const existing = roles.find((r: any) => r.user_id === userId);
                            if (existing) {
                              supabase.from('user_roles').update({ role: v }).eq('user_id', userId).then(({ error }) => {
                                if (error) toast.error(error.message);
                                else { toast.success(t('role_updated')); fetchUsersAndRoles(); }
                              });
                            } else {
                              supabase.from('user_roles').insert({ user_id: userId, role: v as AppRole }).then(({ error }) => {
                                if (error) toast.error(error.message);
                                else { toast.success(t('role_updated')); fetchUsersAndRoles(); }
                              });
                            }
                            setRoleDialog(null);
                          }}>
                            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">Not registered</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditResident(r)}><Edit2 className="h-4 w-4" /></Button>
                        {matchedUser && (
                          <Button variant="outline" size="sm" onClick={() => handleForceResetPassword(matchedUser.user_id)} className="text-destructive border-destructive/30">
                            <KeyRound className="h-3 w-3 mr-1" /> {t('reset_password')}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteResident(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-6 space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold font-display mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> {t('user_roles_password')}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('mobile')}</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || 'Unknown'}</TableCell>
                    <TableCell>{u.mobile || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getUserRole(u.user_id) === 'master_admin' ? 'gradient-warm text-primary-foreground' : 'bg-muted text-muted-foreground'}>
                        {ROLE_LABELS[getUserRole(u.user_id) as keyof typeof ROLE_LABELS] || getUserRole(u.user_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => { setRoleDialog({ userId: u.user_id, currentRole: getUserRole(u.user_id) }); setNewRole(getUserRole(u.user_id) as AppRole || 'resident'); }}>
                        <Shield className="h-3 w-3 mr-1" /> {t('change_role')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleForceResetPassword(u.user_id)} className="text-destructive border-destructive/30">
                        <KeyRound className="h-3 w-3 mr-1" /> {t('reset_password')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="p-4">
            <h3 className="text-lg font-semibold font-display mb-3">{t('available_roles')}</h3>
            <div className="space-y-2">
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="font-medium">{label}</span>
                  <Badge variant={key === 'master_admin' ? 'destructive' : 'secondary'}>{key.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
            </div>
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
            <div className="grid gap-2"><Label>{t('email')}</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <Button onClick={handleSaveResident} className="w-full gradient-warm text-primary-foreground">{t('save_changes')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display">{t('change_role')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('select_role')}</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleChangeRole} className="w-full gradient-warm text-primary-foreground">{t('update_role')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocietySettings;
