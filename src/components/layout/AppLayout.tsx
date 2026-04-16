import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import { useWebNotifications } from '@/hooks/useWebNotifications';
import NotificationPermissionBanner from '@/components/NotificationPermissionBanner';
import InstallAppBanner from '@/components/InstallAppBanner';
import PwaUpdatePrompt from '@/components/PwaUpdatePrompt';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  useWebNotifications();
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:ml-64 transition-all duration-300">
        <TopBar />
        <main className="p-4 md:p-6">{children}</main>
      </div>
      <PwaUpdatePrompt />
      <NotificationPermissionBanner />
      <InstallAppBanner />
    </div>
  );
};

export default AppLayout;
