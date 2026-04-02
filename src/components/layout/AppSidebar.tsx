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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isAdmin, isCoordinator, isMasterAdmin, isResident } = useAuth();

  const navItems = [];

  if (isAdmin) {
    navItems.push(
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { label: 'Residents', icon: Users, path: '/residents' },
      { label: 'Maintenance Fund', icon: IndianRupee, path: '/maintenance' },
      { label: 'Expenses', icon: Receipt, path: '/expenses' },
      { label: 'Notices', icon: Megaphone, path: '/notices' },
      { label: 'Manage Complaints', icon: MessageSquareWarning, path: '/complaints' },
    );
    if (isMasterAdmin) {
      navItems.push({ label: 'Settings', icon: Settings, path: '/settings' });
    }
  } else if (isCoordinator) {
    navItems.push(
      { label: 'Residents', icon: Users, path: '/residents' },
      { label: 'Notices', icon: Megaphone, path: '/notices' },
      { label: 'Manage Complaints', icon: MessageSquareWarning, path: '/complaints' },
    );
  } else {
    // Resident
    navItems.push(
      { label: 'My Profile', icon: UserCircle, path: '/my-profile' },
      { label: 'Notices', icon: Megaphone, path: '/notices' },
      { label: 'My Complaints', icon: MessageSquareWarning, path: '/my-complaints' },
    );
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-warm">
          <Building2 className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold font-display truncate text-sidebar-foreground">
              Shri Vidhya Niwas
            </h1>
            <p className="text-xs text-sidebar-muted truncate">Society Management</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
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

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-4 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
