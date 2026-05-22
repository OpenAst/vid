"use client";

import Link from "next/link";
import { Bell, CheckCheck, Filter, MailOpen } from "lucide-react";
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

type NotificationRealtimeEvent = CustomEvent<AppNotification | null | undefined>;

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
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({ limit: "50" });
      if (filter === "unread") query.set("unread", "true");
      const response = await fetch(`/api/notifications?${query.toString()}`, { cache: "no-store" });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) return;

      setNotifications(Array.isArray(data.results) ? data.results : []);
      setUnreadCount(Number(data.unread_count || 0));
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleRealtimeNotification = (event: Event) => {
      const notification = (event as NotificationRealtimeEvent).detail;
      if (!notification?.id) {
        void loadNotifications();
        return;
      }

      setUnreadCount((current) => current + (notification.is_read ? 0 : 1));
      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) return current;
        if (filter === "unread" && notification.is_read) return current;
        return [notification, ...current].slice(0, 50);
      });
    };

    window.addEventListener("oneclyq:notification-new", handleRealtimeNotification);
    return () => {
      window.removeEventListener("oneclyq:notification-new", handleRealtimeNotification);
    };
  }, [filter, loadNotifications]);

  const markAllRead = async () => {
    setUnreadCount(0);
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    await fetch("/api/notifications", { method: "PATCH" });
    window.dispatchEvent(new Event("oneclyq:notifications-read"));
  };

  const markOneRead = async (notificationId: string) => {
    setNotifications((current) =>
      current
        .map((item) => item.id === notificationId ? { ...item, is_read: true } : item)
        .filter((item) => filter !== "unread" || !item.is_read)
    );
    setUnreadCount((current) => Math.max(0, current - 1));
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [notificationId] }),
    });
    const data = await response.json().catch(() => null);
    if (response.ok) {
      setUnreadCount(Number(data?.unread_count || 0));
      window.dispatchEvent(new Event("oneclyq:notifications-read"));
    }
  };

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-10 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Activity center</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="mt-2 text-sm font-medium text-base-content/70">
              {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You are all caught up."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-base-300 bg-base-100 p-1 text-sm">
              {(["all", "unread"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold capitalize transition ${
                    filter === item ? "bg-primary text-primary-content" : "text-base-content/70 hover:text-primary"
                  }`}
                >
                  {item === "unread" && <Filter size={14} />}
                  {item}
                </button>
              ))}
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
              <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-base-content/70">
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
                      <div className="flex min-w-0 items-center gap-2">
                        {!notification.is_read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-secondary" aria-label="Unread" />
                        )}
                        <p className="font-medium">{notification.title}</p>
                      </div>
                      <span className="text-xs font-medium text-base-content/70">
                        {formatNotificationDate(notification.created_at)}
                      </span>
                    </div>
                    {notification.body && (
                      <p className="mt-1 text-sm font-medium leading-6 text-base-content/70">{notification.body}</p>
                    )}
                  </div>
                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void markOneRead(notification.id);
                      }}
                      className="hidden h-9 shrink-0 items-center gap-1.5 rounded-full border border-base-300 px-3 text-xs font-semibold text-base-content/70 transition hover:border-primary/40 hover:text-primary sm:inline-flex"
                    >
                      <MailOpen size={14} />
                      Read
                    </button>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
