export async function getTurnIceServers() {
  const response = await fetch("/api/calls/turn-credentials");
  if (!response.ok) return [];

  const data = await response.json();
  if (!Array.isArray(data.iceServers)) return [];

  return data.iceServers.filter((server: { urls?: unknown; username?: unknown; credential?: unknown }) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    const hasTurnUrl = urls.some((url) => typeof url === "string" && url.startsWith("turn:"));

    if (!hasTurnUrl) {
      return urls.some((url) => typeof url === "string" && url.startsWith("stun:"));
    }

    return typeof server.username === "string"
      && server.username.length > 0
      && typeof server.credential === "string"
      && server.credential.length > 0;
  });
}

