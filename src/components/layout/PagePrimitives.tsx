import { Card } from '@/components/ui/card';
import { ReactNode } from 'react';

/**
 * Compact section pattern shared across all main pages, mirroring the
 * MyProfile aesthetic: tight padding, uppercase tracked headers, icon-led.
 */

export const PageHeader = ({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 px-1 pt-1 pb-3">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-bold font-display leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-center justify-between pt-3 pb-2">
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <h3 className="text-sm font-bold font-display uppercase tracking-wide truncate">{title}</h3>
      {subtitle && <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">• {subtitle}</span>}
    </div>
    {action}
  </div>
);

export const SectionCard = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <Card className={`px-5 py-2 border-border bg-card/95 shadow-sm ${className}`}>{children}</Card>
);

export const Chip = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  icon?: any;
}) => (
  <div className="flex items-center gap-2 rounded-lg bg-muted/60 border border-border px-2.5 py-1.5 min-w-0">
    {Icon && <Icon className="h-3.5 w-3.5 text-primary shrink-0" />}
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{label}</div>
      <div className="text-xs font-semibold truncate leading-tight mt-0.5">{value}</div>
    </div>
  </div>
);
