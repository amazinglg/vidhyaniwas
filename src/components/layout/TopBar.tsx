import { Bell, LogOut, KeyRound, Languages, UserCircle } from 'lucide-react';
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
  treasury_head: 'Society Treasury Head',
  secretary: 'Society Secretary',
  coordinator: 'Coordinator',
  resident: 'Resident',
};

const ROLE_COLORS: Record<string, string> = {
  master_admin: 'gradient-warm text-primary-foreground',
  president: 'gradient-cool text-primary-foreground',
  vice_president: 'bg-accent text-accent-foreground',
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-lg px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-3 ml-12 md:ml-0">
        <div className="hidden sm:block">
          <h2 className="text-base md:text-lg font-semibold font-display text-foreground truncate max-w-[200px] md:max-w-none">
            {t('welcome')}, {displayName}
          </h2>
        </div>
        {userRole && (
          <Badge className={`text-xs ${ROLE_COLORS[userRole] || 'bg-muted text-muted-foreground'}`}>
            {ROLE_LABELS[userRole] || userRole}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        <Button variant="outline" size="sm" onClick={toggleLang} className="gap-1 font-semibold text-xs md:text-sm px-2 md:px-3">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{lang === 'en' ? 'हिंदी' : 'English'}</span>
          <span className="sm:hidden">{lang === 'en' ? 'हि' : 'EN'}</span>
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => navigate('/my-profile')} title={t('my_profile')}>
          <UserCircle className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => navigate('/change-password')} title={t('change_password')}>
          <KeyRound className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSignOut} title={t('sign_out')}>
          <LogOut className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </div>
    </header>
  );
};

export default TopBar;
