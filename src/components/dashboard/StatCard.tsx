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
  primary: 'bg-card border-border',
  success: 'bg-card border-border',
  destructive: 'bg-card border-border',
  warning: 'bg-card border-border',
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
  <div className={cn('relative rounded-lg border p-2.5 md:p-4 transition-all hover:shadow-md hover:-translate-y-0.5', variantStyles[variant])}>
    {/* Icon as a small floating chip in the top-right (saves horizontal space on mobile) */}
    <div className={cn('absolute top-2 right-2 md:top-3 md:right-3 flex h-6 w-6 md:h-9 md:w-9 items-center justify-center rounded-md md:rounded-lg shadow-sm', iconStyles[variant])}>
      <Icon className="h-3 w-3 md:h-5 md:w-5" />
    </div>
    <div className="pr-7 md:pr-12">
      <p className="text-[9px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight line-clamp-2">{title}</p>
      <p className="text-sm md:text-xl font-bold font-display mt-1 md:mt-1.5 text-foreground leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{value}</p>
      {subtitle && <p className="text-[10px] md:text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">{subtitle}</p>}
    </div>
  </div>
);

export default StatCard;
