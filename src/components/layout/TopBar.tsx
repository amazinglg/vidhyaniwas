import { LogOut, KeyRound, Languages, UserCircle, Download, Menu, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useState } from 'react';
import IosInstallGuideDialog from '@/components/IosInstallGuideDialog';
import NotificationBell from '@/components/NotificationBell';

interface TopBarProps {
  onOpenSidebar?: () => void;
}

const TopBar = ({ onOpenSidebar }: TopBarProps) => {
  const { user, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { canInstall, installing, isIOS, promptInstall } = useInstallPrompt();
  const [iosGuide, setIosGuide] = useState(false);
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const handleSignOut = async () => {
    await signOut();
    toast.success(t('signed_out') || 'Signed out');
    navigate('/auth');
  };

  const toggleLang = () => setLang(lang === 'en' ? 'hi' : 'en');

  const handleInstall = () => {
    promptInstall(() => setIosGuide(true));
  };

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-lg px-2 md:px-6 [transform:translateZ(0)] will-change-transform"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px))',
          minHeight: 'calc(env(safe-area-inset-top, 0px) + 4rem)',
        }}
      >
        <div className="flex items-center gap-1.5 md:gap-3 min-w-0 flex-1 h-16">
          {/* Hamburger inside the bar (mobile only) — sticks together with the rest */}
          <button
            onClick={onOpenSidebar}
            className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            to="/"
            aria-label="Go to Dashboard"
            className="font-display font-bold text-lg md:text-xl tracking-[0.15em] bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent shrink-0 drop-shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
          >
            SVN
          </Link>
          <div className="hidden sm:block min-w-0">
            <h2 className="text-base md:text-lg font-semibold font-display text-foreground truncate max-w-[160px] md:max-w-none">
              {t('welcome')}, {displayName}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2 shrink-0 h-16">
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
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <NotificationBell />
          <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => navigate('/my-profile')} title={t('my_profile')}>
            <UserCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="relative h-9 w-9 hidden sm:inline-flex" onClick={() => navigate('/change-password')} title={t('change_password')}>
            <KeyRound className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSignOut} title={t('sign_out')}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <IosInstallGuideDialog open={iosGuide} onOpenChange={setIosGuide} />
    </>
  );
};

export default TopBar;
