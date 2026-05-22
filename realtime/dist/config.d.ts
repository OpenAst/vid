export type RuntimeConfig = {
    port: number;
    djangoApiUrl: string;
    redisUrl: string;
    commentHistoryCacheTtlSeconds: number;
    realtimeInternalSecret: string;
    corsOrigins: string[];
};
declare function normalizeUrl(value: string): string;
declare function parseCsv(value: string | undefined, fallback: string[]): string[];
export declare const runtimeConfig: RuntimeConfig;
export { normalizeUrl, parseCsv };
//# sourceMappingURL=config.d.ts.map