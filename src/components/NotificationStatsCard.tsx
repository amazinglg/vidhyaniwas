import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, ChevronRight, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface UserRow {
  user_id: string;
  full_name: string | null;
  mobile: string | null;
  house_no: string | null;
  lane_no: string | null;
}

/**
 * Admin-only tile that surfaces how many approved residents have actually
 * subscribed to push notifications, plus a drill-down to see exactly who
 * has NOT enabled them — so admins can nudge them in person/WhatsApp.
 */
const NotificationStatsCard = () => {
  const [loading, setLoading] = useState(true);
  const [subscribedCount, setSubscribedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [notSubscribed, setNotSubscribed] = useState<UserRow[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // 1. All approved users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, mobile, house_no, lane_no')
        .eq('is_approved', true);

      // 2. Distinct user_ids that have at least one push subscription
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('user_id');

      const subscribedSet = new Set((subs || []).map((s) => s.user_id));
      const all = profiles || [];
      const missing = all.filter((p) => !subscribedSet.has(p.user_id));

      setTotalCount(all.length);
      setSubscribedCount(all.filter((p) => subscribedSet.has(p.user_id)).length);
      setNotSubscribed(missing);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const pct = totalCount > 0 ? Math.round((subscribedCount / totalCount) * 100) : 0;

  return (
    <>
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold font-display">Push notification reach</h3>
              {!loading && (
                <Badge variant={pct >= 70 ? 'default' : pct >= 40 ? 'secondary' : 'outline'}>
                  {pct}%
                </Badge>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-7 w-32 mt-2" />
            ) : (
              <p className="text-2xl font-bold font-display mt-1">
                {subscribedCount} <span className="text-base font-normal text-muted-foreground">/ {totalCount} users</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Residents who can receive instant alerts on their device.
            </p>

            {/* Progress bar */}
            <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full gradient-warm transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            {!loading && notSubscribed.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(true)}
              >
                See {notSubscribed.length} {notSubscribed.length === 1 ? 'user' : 'users'} who haven't enabled
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellOff className="h-4 w-4 text-muted-foreground" />
              Users without notifications
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2 mb-2">
            These approved residents haven't enabled push on any device. Ask them to log in,
            allow the notification prompt, or enable it from their profile.
          </p>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-2">
              {notSubscribed.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-6">Everyone is subscribed 🎉</p>
              ) : (
                notSubscribed.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.mobile || 'No mobile'}
                        {u.house_no && ` • H ${u.house_no}`}
                        {u.lane_no && ` / L ${u.lane_no}`}
                      </p>
                    </div>
                    {u.mobile && (
                      <Button asChild size="sm" variant="outline" className="h-8 shrink-0">
                        <a
                          href={`https://wa.me/91${u.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(
                            'Hi! Please enable notifications in the Vidhya Niwas app to receive society alerts. Open the app → My Profile → Enable Notifications.'
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Nudge
                        </a>
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationStatsCard;
