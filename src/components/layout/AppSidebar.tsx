import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  Receipt,
  Megaphone,
  MessageSquareWarning,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserCircle,
  Menu,
  X,
  Clock,
  Shield,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isAdmin, isCoordinator, isMasterAdmin, isResident, isSupervisor } = useAuth();
  const { t } = useLanguage();

  const navItems = [];

  if (isAdmin) {
    navItems.push(
      { label: t('dashboard'), icon: LayoutDashboard, path: '/' },
      { label: t('residents'), icon: Users, path: '/residents' },
      { label: t('maintenance_fund'), icon: IndianRupee, path: '/maintenance' },
      { label: t('expenses'), icon: Receipt, path: '/expenses' },
      { label: t('notices_short'), icon: Megaphone, path: '/notices' },
      { label: t('manage_complaints'), icon: MessageSquareWarning, path: '/complaints' },
      { label: t('society_management'), icon: Shield, path: '/society-management' },
      { label: t('pending_signups'), icon: Clock, path: '/pending-signups' },
    );
    if (isMasterAdmin) {
      navItems.push({ label: t('settings'), icon: Settings, path: '/settings' });
      navItems.push({ label: t('deleted_history'), icon: Trash2, path: '/deleted-history' });
    }
  } else if (isSupervisor) {
    navItems.push(
      { label: t('manage_complaints'), icon: MessageSquareWarning, path: '/complaints' },
    );
  } else if (isCoordinator) {
    navItems.push(
      { label: t('my_profile'), icon: UserCircle, path: '/my-profile' },
    );
  } else if (isResident) {
    navItems.push(
      { label: t('residents'), icon: Users, path: '/residents' },
      { label: t('maintenance_fund'), icon: IndianRupee, path: '/maintenance' },
      { label: t('expenses'), icon: Receipt, path: '/expenses' },
      { label: t('notices_short'), icon: Megaphone, path: '/notices' },
      { label: t('society_management'), icon: Shield, path: '/society-management' },
      { label: t('my_complaints'), icon: MessageSquareWarning, path: '/my-complaints' },
    );
  }

  // Ensure My Profile is available for ALL user types
  if (!navItems.some(item => item.path === '/my-profile')) {
    navItems.push({ label: t('my_profile'), icon: UserCircle, path: '/my-profile' });
  }

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-warm">
          <Building2 className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden flex-1">
            <h1 className="text-sm font-bold font-display truncate text-sidebar-foreground">
              Shri Vidhya Niwas
            </h1>
            <p className="text-xs text-sidebar-muted truncate">{t('society_management')}</p>
          </div>
        )}
        <button onClick={() => setMobileOpen(false)} className="md:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground ml-auto">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'gradient-warm text-primary-foreground shadow-lg'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex items-center justify-center py-4 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
      </button>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen bg-sidebar text-sidebar-foreground transition-transform duration-300 flex flex-col w-64 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 flex-col hidden md:flex',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default AppSidebar;
