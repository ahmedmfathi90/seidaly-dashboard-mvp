import { useState, useEffect } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);
  const [iosWarning, setIosWarning] = useState<string | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        setShowPrompt(true);
      }
    }
  }, []);

  const requestPermission = async () => {
    // Detect iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    
    // Detect if PWA is installed and running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (navigator as any).standalone;

    if (isIOS && !isStandalone) {
      setIosWarning('لتفعيل التنبيهات، يرجى تثبيت التطبيق على الشاشة الرئيسية أولاً');
      return;
    }

    if ('Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        setShowPrompt(false);
        setIosWarning(null);
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    setIosWarning(null);
  };

  return { permission, showPrompt, iosWarning, requestPermission, dismissPrompt };
}
