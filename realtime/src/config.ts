export type RuntimeConfig = {
  port: number;
  djangoApiUrl: string;
  redisUrl: string;
  realtimeInternalSecret: string;
  corsOrigins: string[];
};

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function parseCsv(value: string | undefined, fallback: string[]) {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePort(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const runtimeConfig: RuntimeConfig = {
  port: parsePort(process.env.PORT, 4000),
  djangoApiUrl: normalizeUrl(process.env.DJANGO_API_URL || "http://localhost:8000"),
  redisUrl: process.env.REDIS_URL?.trim() || "",
  realtimeInternalSecret: process.env.REALTIME_INTERNAL_SECRET?.trim() || "",
  corsOrigins: parseCsv(
    process.env.FRONTEND_ORIGINS || process.env.CORS_ORIGINS,
    ["http://localhost:3000", "http://127.0.0.1:3000"]
  ),
};

export { normalizeUrl, parseCsv };
