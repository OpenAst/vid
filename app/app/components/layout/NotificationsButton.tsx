'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

export default function NotificationsButton() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    const response = await fetch('/api/notifications', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) return;

    setUnreadCount(Number(data.unread_count || 0));
  }, []);

  useEffect(() => {
    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  return (
    <button
      type="button"
      onClick={() => router.push('/notifications')}
      className="relative flex w-full items-center justify-center rounded-lg px-2 py-2 text-xs text-base-content transition-colors hover:bg-base-200"
      aria-label="Open notifications"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
      <span className="ml-1 font-medium">Alerts</span>
    </button>
  );
}
