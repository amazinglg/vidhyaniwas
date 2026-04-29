import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInboxNotifications } from '@/hooks/useInboxNotifications';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';

const typeStyles: Record<string, string> = {
  complaint_status: 'bg-success/15 text-success-foreground border-success/30',
  complaint_new: 'bg-warning/15 text-warning-foreground border-warning/30',
  signup_pending: 'bg-info/15 text-info-foreground border-info/30',
  maintenance_new: 'bg-primary/15 text-primary-foreground border-primary/30',
  notice_new: 'bg-accent/30 text-accent-foreground border-accent/40',
  general: 'bg-muted text-muted-foreground border-border',
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markRead, markAllRead, remove } = useInboxNotifications(40);

  const handleClick = async (n: any) => {
    if (!n.is_read) await markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" title={t('notifications') || 'Notifications'}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0 border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div>
            <h3 className="text-sm font-bold font-display">{t('notifications') || 'Notifications'}</h3>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} ${t('unread') || 'unread'}` : (t('all_caught_up') || "You're all caught up")}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => markAllRead()}>
              <CheckCheck className="h-3.5 w-3.5" />
              {t('mark_all_read') || 'Mark all'}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[60vh]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {t('no_notifications') || 'No notifications yet'}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map(n => (
                <li
                  key={n.id}
                  className={`group relative flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/60 ${!n.is_read ? 'bg-primary/5' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  {!n.is_read && (
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                  )}
                  <div className={`shrink-0 mt-0.5 h-8 w-8 rounded-lg border flex items-center justify-center text-xs font-bold ${typeStyles[n.type] || typeStyles.general}`}>
                    {n.title.match(/\p{Emoji}/u)?.[0] || '•'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight truncate">
                      {n.title.replace(/^\p{Emoji}\s*/u, '')}
                    </p>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity self-start text-muted-foreground hover:text-destructive p-1"
                    onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
