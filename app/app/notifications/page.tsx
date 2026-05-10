"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import UserAvatar from "@/app/components/common/UserAvatar";

type NotificationActor = {
  username?: string | null;
  first_name?: string;
  last_name?: string;
  profile?: {
    avatar?: string | null;
  };
};

type AppNotification = {
  id: string;
  title: string;
  body: string;
  target_url: string;
  is_read: boolean;
  created_at: string;
  actor?: NotificationActor | null;
};

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) return;

      setNotifications(Array.isArray(data.results) ? data.results : []);
      setUnreadCount(Number(data.unread_count || 0));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markAllRead = async () => {
    setUnreadCount(0);
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    await fetch("/api/notifications", { method: "PATCH" });
  };

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-10 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="mt-2 text-sm text-base-content/60">
              {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You are all caught up."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 rounded-full border border-base-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl bg-base-200" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell size={24} />
              </div>
              <p className="font-semibold">No notifications yet</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-base-content/60">
                Follows, messages, and account updates will show up here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-base-300">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.target_url || "/profile"}
                  className={`flex gap-4 px-4 py-4 transition-colors hover:bg-base-200/60 ${
                    notification.is_read ? "bg-base-100" : "bg-primary/5"
                  }`}
                >
                  <UserAvatar user={notification.actor} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium">{notification.title}</p>
                      <span className="text-xs text-base-content/45">
                        {formatNotificationDate(notification.created_at)}
                      </span>
                    </div>
                    {notification.body && (
                      <p className="mt-1 text-sm leading-6 text-base-content/60">{notification.body}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
