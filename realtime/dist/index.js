import { createRealtimeServer } from "./server.js";
import { runtimeConfig } from "./config.js";
const realtimeServer = await createRealtimeServer();
await realtimeServer.listen(runtimeConfig.port);
console.log(`[realtime] listening on port ${runtimeConfig.port}`);
async function shutdown(signal) {
    console.log(`[realtime] received ${signal}, shutting down`);
    try {
        await realtimeServer.close();
    }
    catch (error) {
        console.error("[realtime] shutdown error:", error);
    }
    finally {
        process.exit(0);
    }
}
process.on("SIGINT", () => {
    void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});
process.on("unhandledRejection", (error) => {
    console.error("[realtime] unhandled rejection:", error);
});
process.on("uncaughtException", (error) => {
    console.error("[realtime] uncaught exception:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map