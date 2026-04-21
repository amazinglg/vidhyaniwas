import { Bell, LogOut, KeyRound, Languages, UserCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useUnreadNotices } from '@/hooks/useUnreadNotices';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

const ROLE_LABELS: Record<string, string> = {
  master_admin: 'Master Administrator',
  president: 'Society President',
  vice_president: 'Society Vice President',
  treasury_head: 'Society Treasury Head',
  secretary: 'Society Secretary',
  coordinator: 'Coordinator',
  resident: 'Resident',
  supervisor: 'Supervisor',
};

const ROLE_COLORS: Record<string, string> = {
  master_admin: 'gradient-warm text-primary-foreground',
  president: 'gradient-cool text-primary-foreground',
  vice_president: 'bg-accent text-accent-foreground',
  treasury_head: 'gradient-sunset text-primary-foreground',
  secretary: 'gradient-cool text-primary-foreground',
  coordinator: 'bg-warning text-warning-foreground',
  resident: 'bg-muted text-muted-foreground',
  supervisor: 'bg-info text-info-foreground',
};

const TopBar = () => {
  const { user, userRole, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadNotices();
  const { canInstall, installing, isIOS, promptInstall } = useInstallPrompt();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const handleSignOut = async () => {
    await signOut();
    toast.success(t('signed_out') || 'Signed out');
    navigate('/auth');
  };

  const toggleLang = () => setLang(lang === 'en' ? 'hi' : 'en');

  const handleInstall = () => {
    promptInstall(() => toast.info(t('install_ios_msg')));
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-lg px-4 md:px-6"
    >
      <div className="flex items-center gap-2 md:gap-3 ml-12 md:ml-0 min-w-0 flex-1">
        <div className="hidden sm:block min-w-0">
          <h2 className="text-base md:text-lg font-semibold font-display text-foreground truncate max-w-[160px] md:max-w-none">
            {t('welcome')}, {displayName}
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {canInstall && (
          <Button
            size="sm"
            onClick={handleInstall}
            disabled={installing}
            className="gradient-warm text-primary-foreground gap-1.5 h-9 px-2 md:px-3 text-xs"
            title={t('install_app')}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{installing ? t('installing') : t('install_app')}</span>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={toggleLang} className="gap-1 font-semibold text-xs md:text-sm px-2 md:px-3 h-9">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{lang === 'en' ? 'हिंदी' : 'English'}</span>
          <span className="sm:hidden">{lang === 'en' ? 'हि' : 'EN'}</span>
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => navigate('/notices')} title={t('notices')}>
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => navigate('/my-profile')} title={t('my_profile')}>
          <UserCircle className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 hidden sm:inline-flex" onClick={() => navigate('/change-password')} title={t('change_password')}>
          <KeyRound className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSignOut} title={t('sign_out')}>
          <LogOut className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </div>
    </header>
  );
};

export default TopBar;
