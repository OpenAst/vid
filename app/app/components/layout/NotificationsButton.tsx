'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Bell } from 'lucide-react';
import { createRealtimeSocket, type RealtimeSocket } from '@/app/lib/socket';
import type { RootState } from '@/app/store/store';

type NotificationRealtimePayload = {
  unreadCount?: number;
  notification?: unknown;
};

export default function NotificationsButton() {
  const router = useRouter();
  const { token, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?summary=true', { cache: 'no-store' });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) return;

      setUnreadCount(Number(data?.unread_count || 0));
    } catch (error) {
      console.warn('Unable to load notification summary', error);
    }
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

    window.addEventListener('focus', handleFocus);
    window.addEventListener('oneclyq:notifications-read', handleNotificationsRead);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('oneclyq:notifications-read', handleNotificationsRead);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket: RealtimeSocket = createRealtimeSocket(token);

    const handleNotification = (payload: NotificationRealtimePayload) => {
      setUnreadCount((current) => {
        if (typeof payload.unreadCount === 'number') {
          return Math.max(0, payload.unreadCount);
        }
        return current + 1;
      });
      window.dispatchEvent(new CustomEvent('oneclyq:notification-new', { detail: payload.notification }));
    };

    const handleNotificationsReadRealtime = (payload: NotificationRealtimePayload) => {
      setUnreadCount(Math.max(0, Number(payload.unreadCount || 0)));
    };

    socket.on('notifications:new', handleNotification);
    socket.on('notifications:read', handleNotificationsReadRealtime);
    socket.on('connect', () => {
      void loadNotifications();
    });
    socket.on('connect_error', () => {
      void loadNotifications();
    });
    socket.connect();

    return () => {
      socket.off('notifications:new', handleNotification);
      socket.off('notifications:read', handleNotificationsReadRealtime);
      socket.disconnect();
    };
  }, [isAuthenticated, loadNotifications, token]);

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
