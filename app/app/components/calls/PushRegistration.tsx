"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store/store";

function base64UrlToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export default function PushRegistration() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;

  const registerSubscription = async (askPermission: boolean) => {
    if (!vapidPublicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    let currentPermission = Notification.permission;

    if (askPermission && currentPermission === "default") {
      currentPermission = await Notification.requestPermission();
      setPermission(currentPermission);
    }

    if (currentPermission !== "granted") {
      return;
    }

    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription =
      existingSubscription ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
      }));

    await fetch("/api/push/subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });

    setIsSubscribed(true);
  };

  useEffect(() => {
    setIsSupported("serviceWorker" in navigator && "PushManager" in window);
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !vapidPublicKey || !isSupported) {
      return;
    }

    let cancelled = false;

    const registerPush = async () => {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existingSubscription = await registration.pushManager.getSubscription();
      if (cancelled) {
        return;
      }

      setIsSubscribed(Boolean(existingSubscription));
      if (Notification.permission === "granted") {
        await registerSubscription(false);
      }
    };

    void registerPush().catch((error) => {
      console.error("Push registration failed", error);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isSupported, vapidPublicKey]);

  if (!isAuthenticated || !isSupported || !vapidPublicKey || isSubscribed || permission === "denied") {
    return null;
  }

  const handleEnable = async () => {
    try {
      setIsSubmitting(true);
      await registerSubscription(true);
    } catch (error) {
      console.error("Push opt-in failed", error);
    } finally {
      setIsSubmitting(false);
      setPermission(Notification.permission);
    }
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-[95] mx-auto max-w-md rounded-2xl border border-base-300 bg-base-100/95 p-4 shadow-2xl backdrop-blur">
      <p className="text-sm font-semibold text-base-content">Enable call alerts</p>
      <p className="mt-1 text-sm text-base-content/70">
        Turn on browser notifications so incoming calls can reach you when the tab is in the background.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleEnable}
          disabled={isSubmitting}
          className="btn btn-primary btn-sm"
        >
          {isSubmitting ? "Enabling..." : "Enable alerts"}
        </button>
      </div>
    </div>
  );
}
