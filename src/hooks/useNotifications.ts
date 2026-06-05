import { useState, useEffect, useCallback } from 'react';

/**
 * useMedicationNotifications
 * 
 * Custom React hook that manages Notification API permissions with
 * a dedicated iOS Safari fallback path. On iOS Safari (non-PWA),
 * push notifications are unsupported, so we surface a polite Arabic
 * alert instructing the user to install to their Home Screen first.
 */
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);
  const [iosWarning, setIosWarning] = useState<string | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        // Show the permission prompt modal after a short delay to
        // let the main UI render first and avoid jarring the user
        const timer = setTimeout(() => setShowPrompt(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const requestPermission = useCallback(async () => {
    // 1. Detect iOS devices (iPhone / iPad / iPod)
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

    // 2. Detect if PWA is installed and running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    // 3. iOS + regular Safari (not PWA) → can't do push notifications
    if (isIOS && !isStandalone) {
      setIosWarning(
        'لتفعيل التنبيهات، يرجى تثبيت التطبيق على الشاشة الرئيسية أولاً (Add to Home Screen)'
      );
      return;
    }

    // 4. Standard Notification.requestPermission() flow
    if ('Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        setShowPrompt(false);
        setIosWarning(null);

        // If granted, register for periodic background sync when available
        if (result === 'granted' && 'serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            if ('periodicSync' in registration) {
              await (registration as any).periodicSync.register('medication-alarm-sync', {
                minInterval: 60 * 1000, // 1 minute minimum
              });
              console.log('[Seidaly] Periodic background sync registered.');
            }
          } catch (syncErr) {
            // Periodic sync requires a high site-engagement score or
            // is not supported — this is expected on most browsers.
            console.info('[Seidaly] Periodic sync not available, falling back to foreground scheduler.', syncErr);
          }
        }
      } catch (err) {
        console.error('[Seidaly] Error requesting notification permission:', err);
      }
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    setIosWarning(null);
  }, []);

  return { permission, showPrompt, iosWarning, requestPermission, dismissPrompt };
}
