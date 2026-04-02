import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:ml-64 transition-all duration-300">
        <TopBar />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
