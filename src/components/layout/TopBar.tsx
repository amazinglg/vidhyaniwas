import { Bell, LogOut, KeyRound, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  master_admin: 'Master Administrator',
  president: 'Society President',
  vice_president: 'Society Vice President',
  supervisor: 'Society Supervisor',
  treasury_head: 'Society Treasury Head',
  secretary: 'Society Secretary',
  coordinator: 'Coordinator',
  resident: 'Resident',
};

const ROLE_COLORS: Record<string, string> = {
  master_admin: 'gradient-warm text-primary-foreground',
  president: 'gradient-cool text-primary-foreground',
  vice_president: 'bg-accent text-accent-foreground',
  supervisor: 'bg-info text-info-foreground',
  treasury_head: 'gradient-sunset text-primary-foreground',
  secretary: 'gradient-cool text-primary-foreground',
  coordinator: 'bg-warning text-warning-foreground',
  resident: 'bg-muted text-muted-foreground',
};

const TopBar = () => {
  const { user, userRole, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/auth');
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'hi' : 'en');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-lg px-6">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold font-display text-foreground">
            {t('welcome')}, {displayName}
          </h2>
        </div>
        {userRole && (
          <Badge className={ROLE_COLORS[userRole] || 'bg-muted text-muted-foreground'}>
            {ROLE_LABELS[userRole] || userRole}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={toggleLang} className="gap-1.5 font-semibold">
          <Languages className="h-4 w-4" />
          {lang === 'en' ? 'हिंदी' : 'English'}
        </Button>
        <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/change-password')} title={t('change_password')}>
          <KeyRound className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleSignOut} title={t('sign_out')}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default TopBar;
