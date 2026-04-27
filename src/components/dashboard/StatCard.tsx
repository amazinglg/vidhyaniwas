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
  <div className={cn('relative rounded-2xl border p-3 md:p-5 transition-all hover:shadow-lg hover:-translate-y-0.5', variantStyles[variant])}>
    {/* Icon as a small floating chip in the top-right (saves horizontal space on mobile) */}
    <div className={cn('absolute top-2 right-2 md:top-3 md:right-3 flex h-7 w-7 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-xl shadow-sm', iconStyles[variant])}>
      <Icon className="h-3.5 w-3.5 md:h-5 md:w-5" />
    </div>
    <div className="pr-9 md:pr-12">
      <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight line-clamp-2">{title}</p>
      <p className="text-lg md:text-2xl font-bold font-display mt-1.5 text-foreground break-words leading-tight">{value}</p>
      {subtitle && <p className="text-[10px] md:text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">{subtitle}</p>}
    </div>
  </div>
);

export default StatCard;
