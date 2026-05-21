'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

export default function NotificationsButton() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    const response = await fetch('/api/notifications?summary=true', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) return;

    setUnreadCount(Number(data.unread_count || 0));
  }, []);

  useEffect(() => {
    void loadNotifications();

    const handleFocus = () => {
      void loadNotifications();
    };
    const handleNotificationsRead = () => {
      setUnreadCount(0);
      void loadNotifications();
    };
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadNotifications();
    }, 120000);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('oneclyq:notifications-read', handleNotificationsRead);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('oneclyq:notifications-read', handleNotificationsRead);
    };
  }, [loadNotifications]);

  return (
    <button
      type="button"
      onClick={() => router.push('/notifications')}
      className="relative flex w-full items-center justify-center rounded-xl px-2 py-2 text-xs text-base-content transition-colors hover:text-primary"
      aria-label="Open notifications"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-semibold leading-none text-secondary-content">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
      <span className="ml-1 font-medium">Alerts</span>
    </button>
  );
}
