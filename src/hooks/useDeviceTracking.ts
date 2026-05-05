import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DEVICE_KEY = 'svn-device-key-v1';

const getDeviceKey = () => {
  let key = localStorage.getItem(DEVICE_KEY);
  if (!key) {
    key = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    localStorage.setItem(DEVICE_KEY, key);
  }
  return key;
};

const detectPlatform = () => {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac/i.test(ua)) return 'Mac';
  if (/windows/i.test(ua)) return 'Windows';
  return 'Web';
};

const detectDisplayMode = () => {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  return standalone ? 'PWA' : 'Browser';
};

export const useDeviceTracking = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const save = async () => {
      try {
        await supabase.from('app_user_devices' as any).upsert({
          user_id: user.id,
          device_key: getDeviceKey(),
          platform: detectPlatform(),
          display_mode: detectDisplayMode(),
          user_agent: navigator.userAgent,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: 'user_id,device_key' });
      } catch {}
    };
    void save();
    const id = window.setInterval(() => { void save(); }, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [user?.id]);
};
