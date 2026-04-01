import { Bell, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  master_admin: 'Master Administrator',
  president: 'Society President',
  vice_president: 'Society Vice President',
  supervisor: 'Society Supervisor',
  coordinator: 'Coordinator',
  resident: 'Resident',
};

const TopBar = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <h2 className="text-lg font-semibold font-display text-foreground">
          Welcome back, {displayName}
        </h2>
        <p className="text-sm text-muted-foreground">{userRole ? ROLE_LABELS[userRole] || userRole : 'Member'}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default TopBar;
