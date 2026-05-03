import { Loader2, ArrowDown } from 'lucide-react';

interface Props { pullDistance: number; refreshing: boolean; threshold: number; }

const PullToRefreshIndicator = ({ pullDistance, refreshing, threshold }: Props) => {
  if (pullDistance === 0 && !refreshing) return null;
  const pct = Math.min(pullDistance / threshold, 1);
  return (
    <div
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center h-10 w-10 rounded-full bg-card border border-border shadow-lg transition-opacity"
      style={{ opacity: pct, transform: `translate(-50%, ${pullDistance * 0.3}px) rotate(${pct * 180}deg)` }}
    >
      {refreshing ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <ArrowDown className="h-4 w-4 text-primary" />}
    </div>
  );
};

export default PullToRefreshIndicator;
