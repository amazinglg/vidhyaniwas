import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle, Home, Phone, Mail, Users, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MyProfile = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [resident, setResident] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', mobile: '', email: '' });

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
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
    </div>
  );
};

export default MyProfile;
