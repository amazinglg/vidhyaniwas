import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Residents from "@/pages/Residents";
import Maintenance from "@/pages/Maintenance";
import Expenses from "@/pages/Expenses";
import Notices from "@/pages/Notices";
import Complaints from "@/pages/Complaints";
import SocietySettings from "@/pages/SocietySettings";
import MyProfile from "@/pages/MyProfile";
import MyComplaints from "@/pages/MyComplaints";
import ChangePassword from "@/pages/ChangePassword";
import Auth from "@/pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/my-profile" replace />;
  return <>{children}</>;
};

const MasterAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isMasterAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isMasterAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const DefaultRedirect = () => {
  const { isAdmin, isCoordinator } = useAuth();
  if (isAdmin) return <Dashboard />;
  if (isCoordinator) return <Navigate to="/residents" replace />;
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
            <Routes>
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<DefaultRedirect />} />
                      <Route path="/residents" element={<Residents />} />
                      <Route path="/maintenance" element={<Maintenance />} />
                      <Route path="/expenses" element={<Expenses />} />
                      <Route path="/notices" element={<Notices />} />
                      <Route path="/complaints" element={<Complaints />} />
                      <Route path="/settings" element={<MasterAdminRoute><SocietySettings /></MasterAdminRoute>} />
                      <Route path="/my-profile" element={<MyProfile />} />
                      <Route path="/my-complaints" element={<MyComplaints />} />
                      <Route path="/change-password" element={<ChangePassword />} />
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
