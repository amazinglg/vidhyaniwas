import { ReactNode, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import { useWebNotifications } from '@/hooks/useWebNotifications';
import { useForcedReleaseSync } from '@/hooks/useForcedReleaseSync';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import NotificationWelcomeModal from '@/components/NotificationWelcomeModal';
import InstallAppBanner from '@/components/InstallAppBanner';
import PwaUpdatePrompt from '@/components/PwaUpdatePrompt';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  useWebNotifications();
  useForcedReleaseSync();
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  const { pullDistance, refreshing, threshold } = usePullToRefresh({
    onRefresh: async () => { await queryClient.invalidateQueries(); },
  });
  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={threshold} />
      <AppSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="md:ml-64 transition-all duration-300">
        <TopBar onOpenSidebar={() => setMobileOpen(true)} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
      <PwaUpdatePrompt />
      <NotificationWelcomeModal />
      <InstallAppBanner />
    </div>
  );
};

export default AppLayout;
