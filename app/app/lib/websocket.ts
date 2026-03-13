const FALLBACK_HTTP_URL = "http://localhost:8000";

export function buildWebSocketUrl(path: string, token: string) {
  const apiUrl =
    process.env.NEXT_PUBLIC_WS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    FALLBACK_HTTP_URL;

  const normalizedBase = apiUrl.replace(/\/$/, "");
  const wsBase = normalizedBase.replace(/^http/, "ws");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${wsBase}${normalizedPath}`);

  url.searchParams.set("token", token);

  return url.toString();
}
