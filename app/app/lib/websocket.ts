const FALLBACK_HTTP_URL = "http://localhost:8000";
const FALLBACK_REALTIME_URL = "http://localhost:4000";

export function buildWebSocketUrl(path: string, token: string) {
  let apiUrl =
    process.env.NEXT_PUBLIC_REALTIME_URL ||
    process.env.NEXT_PUBLIC_WS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    FALLBACK_REALTIME_URL;

  if (typeof window !== "undefined") {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (
      isLocalhost &&
      !process.env.NEXT_PUBLIC_REALTIME_URL &&
      !process.env.NEXT_PUBLIC_WS_URL
    ) {
      apiUrl = FALLBACK_REALTIME_URL;
    }
  }

  const normalizedBase = apiUrl.replace(/\/$/, "");
  const wsBase = normalizedBase.replace(/^http/, "ws");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${wsBase}${normalizedPath}`);

  url.searchParams.set("token", token);

  return url.toString();
}
