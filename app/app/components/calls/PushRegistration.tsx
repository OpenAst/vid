"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    let cancelled = false;

    const registerPush = async () => {
      const registration = await navigator.serviceWorker.register("/sw.js");
      let permission = Notification.permission;

      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted" || cancelled) {
        return;
      }

      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
        }));

      if (cancelled) {
        return;
      }

      await fetch("/api/push/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
      });
    };

    void registerPush().catch((error) => {
      console.error("Push registration failed", error);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return null;
}
