function normalizeUrl(value) {
    return value.replace(/\/+$/, "");
}
function parseCsv(value, fallback) {
    if (!value) {
        return fallback;
    }
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}
function parsePort(value, fallback) {
    if (!value) {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
export const runtimeConfig = {
    port: parsePort(process.env.PORT, 4000),
    djangoApiUrl: normalizeUrl(process.env.DJANGO_API_URL || "http://localhost:8000"),
    redisUrl: process.env.REDIS_URL?.trim() || "",
    commentHistoryCacheTtlSeconds: parsePort(process.env.COMMENT_HISTORY_CACHE_TTL_SECONDS, 30),
    realtimeInternalSecret: process.env.REALTIME_INTERNAL_SECRET?.trim() || "",
    corsOrigins: parseCsv(process.env.FRONTEND_ORIGINS || process.env.CORS_ORIGINS, ["http://localhost:3000", "http://127.0.0.1:3000"]),
};
export { normalizeUrl, parseCsv };
//# sourceMappingURL=config.js.map