import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/types/society';
import { Building2, Shield } from 'lucide-react';

const SocietySettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Society configuration and roles</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display">Shri Vidhya Niwas</h2>
            <p className="text-muted-foreground">Residential Society Management System</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Total Houses:</span> <span className="font-medium">40+</span></div>
          <div><span className="text-muted-foreground">Lanes:</span> <span className="font-medium">4</span></div>
          <div><span className="text-muted-foreground">Monthly Maintenance:</span> <span className="font-medium">₹3,000 per house</span></div>
          <div><span className="text-muted-foreground">Master Admin:</span> <span className="font-medium">Labhansh Garg</span></div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold font-display">User Roles</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="font-medium">{label}</span>
              <Badge variant={key === 'master_admin' ? 'destructive' : 'secondary'}>{key.replace('_', ' ')}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default SocietySettings;
