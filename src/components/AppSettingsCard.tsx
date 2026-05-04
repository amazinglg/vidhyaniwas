import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Bell, BellOff, CheckCircle2, AlertCircle, Download, RefreshCw, Smartphone, HelpCircle, Settings, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { requestNotificationPermission } from '@/hooks/useWebNotifications';
import { rememberPushPreference, subscribeToWebPush } from '@/lib/webPush';
import { toast } from 'sonner';
import { hardRefreshApp } from '@/utils/hardRefresh';
import IosInstallGuideDialog from '@/components/IosInstallGuideDialog';

type NotifStatus = 'unsupported' | 'denied' | 'default' | 'granted-not-subscribed' | 'subscribed' | 'loading';

interface Props {
  canInstall: boolean;
  installing: boolean;
  isIOS: boolean;
  standalone: boolean;
  onInstall: () => void;
  userId?: string;
  isMasterAdmin: boolean;
  apkUrl: string;
  lang: string;
  t: (k: string) => string;
}

const AppSettingsCard = ({ canInstall, installing, isIOS, standalone, onInstall, userId, isMasterAdmin, apkUrl, lang, t }: Props) => {
  const [status, setStatus] = useState<NotifStatus>('loading');
  const [working, setWorking] = useState(false);
  const [iosGuide, setIosGuide] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const changePassword = async () => {
    if (pw !== pwConfirm) { toast.error('Passwords do not match'); return; }
    if (pw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === 'hi' ? 'पासवर्ड अपडेट हो गया' : 'Password updated');
    setPw(''); setPwConfirm(''); setPwOpen(false);
  };

  const refresh = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) { setStatus('unsupported'); return; }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    if (Notification.permission === 'default') { setStatus('default'); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setStatus('granted-not-subscribed'); return; }
      if (userId) {
        const { data } = await supabase.from('push_subscriptions').select('id').eq('user_id', userId).eq('endpoint', sub.endpoint).maybeSingle();
        setStatus(data ? 'subscribed' : 'granted-not-subscribed');
      } else setStatus('granted-not-subscribed');
    } catch { setStatus('granted-not-subscribed'); }
  };
  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, [userId]);

  const enableNotif = async () => {
    if (!userId) return;
    setWorking(true);
    try {
      const r = await requestNotificationPermission();
      if (r !== 'granted') { toast.error(r === 'denied' ? 'Permission blocked' : 'Permission not granted'); await refresh(); return; }
      const ok = await subscribeToWebPush(userId);
      toast[ok ? 'success' : 'error'](ok ? 'Notifications enabled' : 'Could not subscribe');
      await refresh();
    } finally { setWorking(false); }
  };
  const disableNotif = async () => {
    if (!userId) return;
    setWorking(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
      rememberPushPreference(userId, false);
      toast.success('Notifications disabled');
      await refresh();
    } finally { setWorking(false); }
  };

  const notifBadge = () => {
    if (status === 'subscribed') return <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15 gap-1 text-[10px]"><CheckCircle2 className="h-3 w-3" />On</Badge>;
    if (status === 'denied') return <Badge variant="destructive" className="gap-1 text-[10px]"><AlertCircle className="h-3 w-3" />Blocked</Badge>;
    if (status === 'unsupported') return <Badge variant="outline" className="text-[10px]">N/A</Badge>;
    if (status === 'loading') return null;
    return <Badge variant="outline" className="gap-1 text-[10px]"><BellOff className="h-3 w-3" />Off</Badge>;
  };

  const Row = ({ icon: Icon, title, hint, action }: any) => (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0"><Icon className="h-4 w-4" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        {hint && <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );

  return (
    <>
      <Card className="px-5 py-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-center gap-2 pt-3 pb-1">
          <Settings className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold font-display uppercase tracking-wide">App Settings</h3>
        </div>
        <div className="divide-y">
          <Row
            icon={Bell}
            title={<span className="flex items-center gap-2">Notifications {notifBadge()}</span>}
            hint={status === 'denied' ? 'Blocked in browser settings — unblock & refresh' : status === 'unsupported' ? 'Install to home screen first' : status === 'subscribed' ? 'Receiving alerts on this device' : 'Get instant alerts for notices & dues'}
            action={status === 'subscribed' ? (
              <Button size="sm" variant="outline" onClick={disableNotif} disabled={working} className="h-8 text-xs">{working ? '…' : 'Turn off'}</Button>
            ) : status === 'denied' ? (
              <Button size="sm" variant="outline" onClick={refresh} disabled={working} className="h-8 text-xs">Recheck</Button>
            ) : status === 'unsupported' ? null : (
              <Button size="sm" onClick={enableNotif} disabled={working || status === 'loading'} className="h-8 text-xs gradient-warm text-primary-foreground">{working ? '…' : status === 'loading' ? 'Enable' : 'Enable'}</Button>
            )}
          />

          {canInstall && (
            <Row
              icon={Download}
              title={lang === 'hi' ? 'ऐप इंस्टॉल करें' : 'Install App'}
              hint={isIOS ? 'Tap help for iPhone steps' : 'Add to home screen for faster access'}
              action={
                <div className="flex gap-1">
                  {isIOS && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIosGuide(true)} title="iOS install help"><HelpCircle className="h-4 w-4" /></Button>
                  )}
                  <Button size="sm" onClick={onInstall} disabled={installing} className="h-8 text-xs gradient-warm text-primary-foreground">{installing ? '…' : 'Install'}</Button>
                </div>
              }
            />
          )}

          {standalone && (
            <Row
              icon={RefreshCw}
              title={t('hard_refresh')}
              hint={t('hard_refresh_desc')}
              action={
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={async () => {
                  if (!confirm(t('hard_refresh_confirm'))) return;
                  toast.success(t('hard_refreshing'), { description: t('hard_refresh_note') });
                  setTimeout(() => { void hardRefreshApp(); }, 400);
                }}>Refresh</Button>
              }
            />
          )}

          {isMasterAdmin && (
            <Row
              icon={Smartphone}
              title={<span className="flex items-center gap-2">APK Download <Badge variant="secondary" className="text-[9px]">Master</Badge></span>}
              hint="Native Android build"
              action={<Button asChild size="sm" variant="outline" className="h-8 text-xs"><a href={apkUrl} download>Get APK</a></Button>}
            />
          )}
        </div>
      </Card>
      <IosInstallGuideDialog open={iosGuide} onOpenChange={setIosGuide} />
    </>
  );
};

export default AppSettingsCard;
