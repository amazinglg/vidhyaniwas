import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import MyProfile from "@/pages/MyProfile";
import NotFound from "./pages/NotFound";
import { Building2 } from "lucide-react";
import SwNavigationBridge from "@/components/SwNavigationBridge";
import Dashboard from "@/pages/Dashboard";
import Residents from "@/pages/Residents";
import Maintenance from "@/pages/Maintenance";
import Expenses from "@/pages/Expenses";
import Notices from "@/pages/Notices";
import Complaints from "@/pages/Complaints";
import SocietySettings from "@/pages/SocietySettings";
import MyComplaints from "@/pages/MyComplaints";
import PendingSignups from "@/pages/PendingSignups";
import SocietyManagement from "@/pages/SocietyManagement";
import DeletedHistory from "@/pages/DeletedHistory";
import { usePageAccess, type PageKey } from '@/hooks/usePageAccess';

const queryClient = new QueryClient();

const SplashScreen = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-warm shadow-lg animate-pulse mb-4">
      <Building2 className="h-8 w-8 text-primary-foreground" />
    </div>
    <h1 className="text-xl font-bold font-display">Shri Vidhya Niwas</h1>
    <p className="text-sm text-muted-foreground mt-2">{message}</p>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading, isApproved, profileLoading } = useAuth();
  if (loading || profileLoading) return <SplashScreen message="Verifying your account…" />;
  if (!session) return <Navigate to="/auth" replace />;
  if (!isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-6xl">⏳</div>
          <h1 className="text-2xl font-bold">Signup Pending Approval</h1>
          <p className="text-muted-foreground">Your account is pending approval from Society management. You will be able to login once approved.</p>
          <button onClick={async () => { const { supabase } = await import('@/integrations/supabase/client'); await supabase.auth.signOut(); window.location.href = '/auth'; }} className="text-primary underline">Sign out</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!isAdmin) return <Navigate to="/my-profile" replace />;
  return <>{children}</>;
};

const AdminOrSupervisorRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isSupervisor, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!isAdmin && !isSupervisor) return <Navigate to="/my-profile" replace />;
  return <>{children}</>;
};

const MasterAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isMasterAdmin, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!isMasterAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const PagePermissionRoute = ({ page, children }: { page: PageKey; children: React.ReactNode }) => {
  const { canRead, loading } = usePageAccess(page);
  if (loading) return <SplashScreen />;
  if (!canRead) return <Navigate to="/my-profile" replace />;
  return <>{children}</>;
};

const ResidentOrAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isResident, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!isAdmin && !isResident) return <Navigate to="/my-profile" replace />;
  return <>{children}</>;
};

const DefaultRedirect = () => {
  const { isAdmin, isSupervisor, isCoordinator } = useAuth();
  if (isAdmin) return <Dashboard />;
  if (isSupervisor) return <Navigate to="/complaints" replace />;
  if (isCoordinator) return <Navigate to="/my-profile" replace />;
  return <Navigate to="/my-profile" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SwNavigationBridge />
            <Routes>
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<DefaultRedirect />} />
                      <Route path="/residents" element={<PagePermissionRoute page="residents"><Residents /></PagePermissionRoute>} />
                      <Route path="/maintenance" element={<PagePermissionRoute page="maintenance"><Maintenance /></PagePermissionRoute>} />
                      <Route path="/expenses" element={<PagePermissionRoute page="expenses"><Expenses /></PagePermissionRoute>} />
                      <Route path="/notices" element={<PagePermissionRoute page="notices"><Notices /></PagePermissionRoute>} />
                      <Route path="/complaints" element={<PagePermissionRoute page="complaints"><Complaints /></PagePermissionRoute>} />
                      <Route path="/settings" element={<MasterAdminRoute><SocietySettings /></MasterAdminRoute>} />
                      <Route path="/deleted-history" element={<MasterAdminRoute><DeletedHistory /></MasterAdminRoute>} />
                      <Route path="/my-profile" element={<MyProfile />} />
                      <Route path="/my-complaints" element={<MyComplaints />} />
                      <Route path="/pending-signups" element={<AdminRoute><PendingSignups /></AdminRoute>} />
                      <Route path="/society-management" element={<PagePermissionRoute page="society_management"><SocietyManagement /></PagePermissionRoute>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              } />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
