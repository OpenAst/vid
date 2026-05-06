self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();
  const title = payload.title || "Incoming call";
  const options = {
    body: payload.body || "Someone is calling you on OneClyq",
    icon: "/user_icon.png",
    badge: "/user_icon.png",
    tag: payload.tag || "incoming-call",
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [200, 120, 200, 120, 450],
    data: {
      url: payload.url || "/",
      callId: payload.callId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
