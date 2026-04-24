import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'success' | 'destructive' | 'warning' | 'default';
}

const variantStyles = {
  primary: 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20',
  success: 'bg-gradient-to-br from-success/10 to-success/5 border-success/20',
  destructive: 'bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20',
  warning: 'bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20',
  default: 'bg-card border-border',
};

const iconStyles = {
  primary: 'gradient-warm text-primary-foreground',
  success: 'bg-success text-success-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  warning: 'bg-warning text-warning-foreground',
  default: 'bg-muted text-muted-foreground',
};

const StatCard = ({ title, value, subtitle, icon: Icon, variant = 'default' }: StatCardProps) => (
  <div className={cn('rounded-2xl border p-4 md:p-5 transition-all hover:shadow-lg hover:-translate-y-0.5', variantStyles[variant])}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] md:text-sm font-medium text-muted-foreground truncate uppercase tracking-wide">{title}</p>
        <p className="text-xl md:text-2xl font-bold font-display mt-1 text-foreground truncate">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>}
      </div>
      <div className={cn('flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-xl shadow-md shrink-0', iconStyles[variant])}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

export default StatCard;
