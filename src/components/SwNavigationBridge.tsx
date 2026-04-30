import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Bridges service-worker `notificationclick` events into React Router so a
 * push notification routes the user to the correct in-app page without a
 * full reload (preserving auth/session state).
 */
export const SwNavigationBridge = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'NAVIGATE' && typeof data.url === 'string') {
        try {
          // Accept either a path or a full URL
          const u = data.url.startsWith('http')
            ? new URL(data.url)
            : null;
          const path = u ? u.pathname + u.search + u.hash : data.url;
          navigate(path);
        } catch {
          navigate(data.url);
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [navigate]);
  return null;
};

export default SwNavigationBridge;
