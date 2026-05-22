import { createServer, IncomingMessage, Server as HttpServer, ServerResponse } from "node:http";
import { v4 as uuidv4, validate as isUuid } from "uuid";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { runtimeConfig } from "./config.js";
import { authenticateUser, createComment, createReply, fetchCommentHistory, toggleCommentVote, toggleVideoVote, } from "./django.js";
const COMMENT_HISTORY_CACHE_PREFIX = "comments:history";
let commentHistoryCache = createMemoryCommentHistoryCache(0);
function logInfo(message, details) {
    if (details) {
        console.log(`[realtime] ${message}`, details);
        return;
    }
    console.log(`[realtime] ${message}`);
}
function logWarn(message, details) {
    if (details) {
        console.warn(`[realtime] ${message}`, details);
        return;
    }
    console.warn(`[realtime] ${message}`);
}
function logError(message, details) {
    if (details) {
        console.error(`[realtime] ${message}`, details);
        return;
    }
    console.error(`[realtime] ${message}`);
}
function commentsRoom(roomId) {
    return `comments:${roomId}`;
}
function commentHistoryCacheKey(roomId) {
    return `${COMMENT_HISTORY_CACHE_PREFIX}:${roomId}`;
}
function videoLikesRoom() {
    return "video-likes";
}
function userRoom(userId) {
    return `user:${userId}`;
}
async function isUserOnline(io, userId) {
    const sockets = await io.in(userRoom(userId)).fetchSockets();
    return sockets.length > 0;
}
async function emitPresenceChange(io, userId) {
    io.emit("presence:changed", {
        userId,
        isOnline: await isUserOnline(io, userId),
    });
}
function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        "content-type": "application/json",
    });
    res.end(JSON.stringify(payload));
}
function getAuthToken(socket) {
    const authToken = socket.handshake.auth?.token;
    const queryToken = socket.handshake.query.token;
    if (typeof authToken === "string" && authToken.trim()) {
        return authToken.trim();
    }
    if (typeof queryToken === "string" && queryToken.trim()) {
        return queryToken.trim();
    }
    return "";
}
function getErrorMessage(error, fallback) {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    if (typeof error === "string" && error.trim()) {
        return error;
    }
    return fallback;
}
async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (!chunks.length) {
        return null;
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    }
    catch {
        return null;
    }
}
async function setupRedisAdapter(io) {
    if (!runtimeConfig.redisUrl) {
        logInfo("Redis adapter disabled: REDIS_URL is empty");
        return async () => { };
    }
    const pubClient = createClient({ url: runtimeConfig.redisUrl });
    const subClient = pubClient.duplicate();
    pubClient.on("error", (error) => {
        logWarn("Redis publisher error", { error: getErrorMessage(error, "Unknown Redis publisher error") });
    });
    subClient.on("error", (error) => {
        logWarn("Redis subscriber error", { error: getErrorMessage(error, "Unknown Redis subscriber error") });
    });
    try {
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        logInfo("Redis adapter connected");
        return async () => {
            await Promise.allSettled([Promise.resolve(pubClient.quit()), Promise.resolve(subClient.quit())]);
            logInfo("Redis adapter closed");
        };
    }
    catch (error) {
        logWarn("Redis adapter disabled", { error: getErrorMessage(error, "Unable to connect to Redis") });
        await Promise.allSettled([
            Promise.resolve(pubClient.destroy()),
            Promise.resolve(subClient.destroy()),
        ]);
        return async () => { };
    }
}
function createMemoryCommentHistoryCache(ttlSeconds) {
    const items = new Map();
    return {
        get: async (roomId) => {
            if (ttlSeconds <= 0)
                return null;
            const item = items.get(roomId);
            if (!item)
                return null;
            if (Date.now() >= item.expiresAt) {
                items.delete(roomId);
                return null;
            }
            return item.history;
        },
        set: async (roomId, history) => {
            if (ttlSeconds <= 0)
                return;
            items.set(roomId, {
                expiresAt: Date.now() + ttlSeconds * 1000,
                history,
            });
        },
        del: async (roomId) => {
            items.delete(roomId);
        },
        close: async () => {
            items.clear();
        },
    };
}
async function setupCommentHistoryCache() {
    const ttlSeconds = runtimeConfig.commentHistoryCacheTtlSeconds;
    const memoryCache = createMemoryCommentHistoryCache(ttlSeconds);
    if (ttlSeconds <= 0) {
        logInfo("Comment history cache disabled: ttl is 0");
        return memoryCache;
    }
    if (!runtimeConfig.redisUrl) {
        logInfo("Comment history cache using memory fallback: REDIS_URL is empty");
        return memoryCache;
    }
    const cacheClient = createClient({ url: runtimeConfig.redisUrl });
    cacheClient.on("error", (error) => {
        logWarn("Comment history cache Redis error", { error: getErrorMessage(error, "Unknown Redis cache error") });
    });
    try {
        await cacheClient.connect();
        logInfo("Comment history cache connected", { ttlSeconds });
        return {
            get: async (roomId) => {
                const cached = await cacheClient.get(commentHistoryCacheKey(roomId));
                if (!cached)
                    return null;
                try {
                    return JSON.parse(cached);
                }
                catch (error) {
                    logWarn("Invalid cached comment history payload", {
                        roomId,
                        error: getErrorMessage(error, "Unable to parse cached comments"),
                    });
                    await cacheClient.del(commentHistoryCacheKey(roomId));
                    return null;
                }
            },
            set: async (roomId, history) => {
                await cacheClient.setEx(commentHistoryCacheKey(roomId), ttlSeconds, JSON.stringify(history));
            },
            del: async (roomId) => {
                await cacheClient.del(commentHistoryCacheKey(roomId));
            },
            close: async () => {
                await Promise.resolve(cacheClient.quit());
            },
        };
    }
    catch (error) {
        logWarn("Comment history cache using memory fallback", {
            error: getErrorMessage(error, "Unable to connect comment cache"),
        });
        await Promise.resolve(cacheClient.destroy());
        return memoryCache;
    }
}
async function handleHttpRequest(req, res, io) {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && requestUrl.pathname === "/health") {
        logInfo("Health check requested");
        sendJson(res, 200, { ok: true, service: "realtime" });
        return;
    }
    if (req.method === "POST" && requestUrl.pathname === "/internal/events") {
        const authHeader = req.headers.authorization || "";
        const expectedAuth = runtimeConfig.realtimeInternalSecret
            ? `Bearer ${runtimeConfig.realtimeInternalSecret}`
            : "";
        if (!expectedAuth || authHeader !== expectedAuth) {
            logWarn("Internal event rejected: bad auth", {
                path: requestUrl.pathname,
                method: req.method,
            });
            sendJson(res, 403, { detail: "Forbidden" });
            return;
        }
        const body = await readJsonBody(req);
        if (!body) {
            logWarn("Internal event rejected: invalid JSON body");
            sendJson(res, 400, { detail: "Invalid JSON body" });
            return;
        }
        if (body?.type === "video_view_updated" &&
            typeof body.videoId === "string" &&
            typeof body.views === "number" &&
            isUuid(body.videoId)) {
            logInfo("Internal video view update received", {
                videoId: body.videoId,
                views: body.views,
            });
            io.to(videoLikesRoom()).emit("video_view_updated", {
                videoId: body.videoId,
                views: body.views,
            });
            logInfo("Broadcasted video view update", {
                room: videoLikesRoom(),
                videoId: body.videoId,
                views: body.views,
            });
        }
        else if (body?.type === "messages_updated" &&
            typeof body.conversationId === "string" &&
            isUuid(body.conversationId) &&
            Array.isArray(body.userIds) &&
            body.message) {
            const userIds = body.userIds.filter((userId) => typeof userId === "string" && isUuid(userId));
            const payload = {
                conversationId: body.conversationId,
                message: body.message,
            };
            userIds.forEach((userId) => {
                io.to(userRoom(userId)).emit("messages:update", payload);
            });
            logInfo("Broadcasted message update", {
                conversationId: body.conversationId,
                userCount: userIds.length,
            });
        }
        else if (body?.type === "notifications:new" &&
            typeof body.recipientId === "string" &&
            isUuid(body.recipientId) &&
            body.notification &&
            typeof body.unreadCount === "number") {
            io.to(userRoom(body.recipientId)).emit("notifications:new", {
                notification: body.notification,
                unreadCount: body.unreadCount,
            });
            logInfo("Broadcasted notification", {
                recipientId: body.recipientId,
                unreadCount: body.unreadCount,
            });
        }
        else if (body?.type === "notifications:read" &&
            typeof body.recipientId === "string" &&
            isUuid(body.recipientId) &&
            typeof body.unreadCount === "number") {
            io.to(userRoom(body.recipientId)).emit("notifications:read", {
                unreadCount: body.unreadCount,
            });
            logInfo("Broadcasted notification read state", {
                recipientId: body.recipientId,
                unreadCount: body.unreadCount,
            });
        }
        else {
            logWarn("Internal event ignored: unsupported payload", {
                type: body?.type,
            });
        }
        sendJson(res, 200, { ok: true });
        return;
    }
    sendJson(res, 404, { detail: "Not found" });
}
function emitError(socket, message) {
    logWarn("Sending realtime error to client", {
        connectionId: socket.data.connectionId,
        userId: socket.data.user?.id,
        message,
    });
    socket.emit("realtime:error", { message });
}
async function handleCommentsJoin(socket, roomId) {
    if (!isUuid(roomId)) {
        emitError(socket, "Invalid comment room id");
        return;
    }
    const room = commentsRoom(roomId);
    socket.join(room);
    logInfo("Socket joined comments room", {
        connectionId: socket.data.connectionId,
        userId: socket.data.user.id,
        roomId,
        room,
    });
    try {
        const cachedHistory = await commentHistoryCache.get(roomId);
        if (cachedHistory) {
            logInfo("Served comment history from cache", {
                connectionId: socket.data.connectionId,
                userId: socket.data.user.id,
                roomId,
                count: cachedHistory.comments.length,
            });
            socket.emit("comments.history", {
                roomId,
                comments: cachedHistory.comments,
            });
            return;
        }
        const history = await fetchCommentHistory(socket.data.token, roomId);
        await commentHistoryCache.set(roomId, history);
        logInfo("Fetched comment history", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            roomId,
            count: history.comments.length,
            cached: true,
        });
        socket.emit("comments.history", {
            roomId,
            comments: history.comments,
        });
    }
    catch (error) {
        logError("Failed to load comment history", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            roomId,
            error: getErrorMessage(error, "Unable to load comment history"),
        });
        emitError(socket, getErrorMessage(error, "Unable to load comment history"));
    }
}
async function handleSendComment(socket, roomId, text, clientId) {
    if (!isUuid(roomId)) {
        emitError(socket, "Invalid comment room id");
        return;
    }
    const content = text.trim();
    if (!content) {
        emitError(socket, "Comment text is required");
        return;
    }
    try {
        logInfo("Creating comment", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            roomId,
        });
        const response = await createComment(socket.data.token, roomId, content);
        await commentHistoryCache.del(roomId);
        socket.to(commentsRoom(roomId)).emit("new_comment", {
            roomId,
            comment: response.comment,
        });
        socket.emit("new_comment", {
            roomId,
            comment: response.comment,
            ...(clientId ? { clientId } : {}),
        });
        logInfo("Comment created and broadcast", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            roomId,
        });
    }
    catch (error) {
        logError("Failed to create comment", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            roomId,
            error: getErrorMessage(error, "Unable to create comment"),
        });
        emitError(socket, getErrorMessage(error, "Unable to create comment"));
    }
}
async function handleSendReply(socket, roomId, parentId, text) {
    if (!isUuid(roomId)) {
        emitError(socket, "Invalid comment room id");
        return;
    }
    if (!isUuid(parentId)) {
        emitError(socket, "Invalid parent comment id");
        return;
    }
    const content = text.trim();
    if (!content) {
        emitError(socket, "Reply text is required");
        return;
    }
    try {
        logInfo("Creating reply", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            roomId,
            parentId,
        });
        const response = await createReply(socket.data.token, roomId, parentId, content);
        await commentHistoryCache.del(roomId);
        socket.to(commentsRoom(roomId)).emit("new_reply", {
            roomId,
            parentId: response.parentId,
            reply: response.reply,
        });
        socket.emit("new_reply", {
            roomId,
            parentId: response.parentId,
            reply: response.reply,
        });
        logInfo("Reply created and broadcast", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            roomId,
            parentId,
        });
    }
    catch (error) {
        logError("Failed to create reply", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            roomId,
            parentId,
            error: getErrorMessage(error, "Unable to create reply"),
        });
        emitError(socket, getErrorMessage(error, "Unable to create reply"));
    }
}
async function handleVoteComment(socket, roomId, commentId) {
    if (!isUuid(roomId)) {
        emitError(socket, "Invalid comment room id");
        return;
    }
    if (!isUuid(commentId)) {
        emitError(socket, "Invalid comment id");
        return;
    }
    try {
        logInfo("Toggling comment vote", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            roomId,
            commentId,
        });
        const response = await toggleCommentVote(socket.data.token, commentId);
        await commentHistoryCache.del(roomId);
        socket.to(commentsRoom(roomId)).emit("comment_liked", {
            roomId,
            commentId: response.commentId,
            likes: response.likes,
            liked: response.liked,
            actorUserId: socket.data.user.id,
        });
        socket.emit("comment_liked", {
            roomId,
            commentId: response.commentId,
            likes: response.likes,
            liked: response.liked,
            actorUserId: socket.data.user.id,
        });
        logInfo("Comment vote toggled and broadcast", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            roomId,
            commentId,
            likes: response.likes,
            liked: response.liked,
        });
    }
    catch (error) {
        logError("Failed to toggle comment vote", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            roomId,
            commentId,
            error: getErrorMessage(error, "Unable to toggle comment vote"),
        });
        emitError(socket, getErrorMessage(error, "Unable to toggle comment vote"));
    }
}
async function handleLikeVideo(socket, videoId) {
    if (!isUuid(videoId)) {
        emitError(socket, "Invalid video id");
        return;
    }
    try {
        logInfo("Toggling video vote", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            videoId,
        });
        const response = await toggleVideoVote(socket.data.token, videoId);
        socket.to(videoLikesRoom()).emit("video_vote_updated", {
            videoId: response.videoId,
            likes: response.likes,
            liked: response.liked,
            actorUserId: socket.data.user.id,
        });
        socket.emit("video_vote_updated", {
            videoId: response.videoId,
            likes: response.likes,
            liked: response.liked,
            actorUserId: socket.data.user.id,
        });
        logInfo("Video vote toggled and broadcast", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            videoId,
            likes: response.likes,
            liked: response.liked,
        });
    }
    catch (error) {
        logError("Failed to toggle video vote", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            videoId,
            error: getErrorMessage(error, "Unable to toggle video vote"),
        });
        emitError(socket, getErrorMessage(error, "Unable to toggle video vote"));
    }
}
function isValidCallType(callType) {
    return callType === "audio" || callType === "video";
}
function validateCallId(socket, callId) {
    if (!isUuid(callId)) {
        emitError(socket, "Invalid call id");
        return false;
    }
    return true;
}
function validateUserId(socket, userId) {
    if (!isUuid(userId)) {
        emitError(socket, "Invalid call user id");
        return false;
    }
    return true;
}
function handleCallInvite(socket, payload) {
    if (!validateCallId(socket, payload.callId) || !validateUserId(socket, payload.calleeId))
        return;
    if (!isValidCallType(payload.callType)) {
        emitError(socket, "Invalid call type");
        return;
    }
    socket.to(userRoom(payload.calleeId)).emit("call:incoming", {
        ...payload,
        caller: socket.data.user,
    });
    logInfo("Call invite relayed", {
        connectionId: socket.data.connectionId,
        callerId: socket.data.user.id,
        calleeId: payload.calleeId,
        callId: payload.callId,
        callType: payload.callType,
    });
}
function handleCallPeerEvent(socket, payload, eventName) {
    if (!validateCallId(socket, payload.callId) || !validateUserId(socket, payload.peerId))
        return;
    socket.to(userRoom(payload.peerId)).emit(eventName, {
        ...payload,
        actor: socket.data.user,
    });
    logInfo("Call peer event relayed", {
        connectionId: socket.data.connectionId,
        actorId: socket.data.user.id,
        peerId: payload.peerId,
        callId: payload.callId,
        eventName,
    });
}
async function handlePresenceSubscribe(socket, io, userIds) {
    const uniqueUserIds = [...new Set(userIds.filter((userId) => isUuid(userId)))];
    const onlineChecks = await Promise.all(uniqueUserIds.map(async (userId) => ({
        userId,
        isOnline: await isUserOnline(io, userId),
    })));
    socket.emit("presence:snapshot", {
        onlineUserIds: onlineChecks.filter((check) => check.isOnline).map((check) => check.userId),
    });
}
function handleCallSignal(socket, payload, eventName) {
    if (!validateCallId(socket, payload.callId) || !validateUserId(socket, payload.toUserId))
        return;
    socket.to(userRoom(payload.toUserId)).emit(eventName, {
        ...payload,
        fromUserId: socket.data.user.id,
    });
}
function handleDirectMessageRelay(socket, payload) {
    if (!isUuid(payload.conversationId)) {
        emitError(socket, "Invalid conversation id");
        return;
    }
    if (!validateUserId(socket, payload.toUserId)) {
        return;
    }
    const eventPayload = {
        ...payload,
        fromUserId: socket.data.user.id,
    };
    socket.to(userRoom(payload.toUserId)).emit("messages:new", eventPayload);
    socket.to(userRoom(socket.data.user.id)).emit("messages:new", eventPayload);
    logInfo("Direct message relayed", {
        connectionId: socket.data.connectionId,
        fromUserId: socket.data.user.id,
        toUserId: payload.toUserId,
        conversationId: payload.conversationId,
    });
}
function handleDirectMessageDelete(socket, payload) {
    if (!isUuid(payload.conversationId)) {
        emitError(socket, "Invalid conversation id");
        return;
    }
    if (!validateUserId(socket, payload.toUserId)) {
        return;
    }
    const eventPayload = {
        ...payload,
        fromUserId: socket.data.user.id,
    };
    socket.to(userRoom(payload.toUserId)).emit("messages:delete", eventPayload);
    socket.to(userRoom(socket.data.user.id)).emit("messages:delete", eventPayload);
    logInfo("Direct message delete relayed", {
        connectionId: socket.data.connectionId,
        fromUserId: socket.data.user.id,
        toUserId: payload.toUserId,
        conversationId: payload.conversationId,
    });
}
function handleDirectMessageRead(socket, payload) {
    if (!isUuid(payload.conversationId)) {
        emitError(socket, "Invalid conversation id");
        return;
    }
    if (!validateUserId(socket, payload.toUserId)) {
        return;
    }
    const messageIds = Array.isArray(payload.messageIds)
        ? payload.messageIds.filter((messageId) => isUuid(messageId))
        : [];
    if (messageIds.length === 0 || typeof payload.readAt !== "string") {
        return;
    }
    const eventPayload = {
        ...payload,
        messageIds,
        fromUserId: socket.data.user.id,
    };
    socket.to(userRoom(payload.toUserId)).emit("messages:read", eventPayload);
    socket.to(userRoom(socket.data.user.id)).emit("messages:read", eventPayload);
    logInfo("Direct message read receipt relayed", {
        connectionId: socket.data.connectionId,
        fromUserId: socket.data.user.id,
        toUserId: payload.toUserId,
        conversationId: payload.conversationId,
        count: messageIds.length,
    });
}
function handleDirectMessageTyping(socket, payload) {
    if (!isUuid(payload.conversationId)) {
        emitError(socket, "Invalid conversation id");
        return;
    }
    if (!validateUserId(socket, payload.toUserId)) {
        return;
    }
    const eventPayload = {
        conversationId: payload.conversationId,
        toUserId: payload.toUserId,
        isTyping: Boolean(payload.isTyping),
        fromUserId: socket.data.user.id,
    };
    socket.to(userRoom(payload.toUserId)).emit("messages:typing", eventPayload);
}
export async function createRealtimeServer() {
    let io;
    let cleanupRedis = async () => { };
    let cleanupCommentHistoryCache = async () => { };
    logInfo("Starting realtime server", {
        port: runtimeConfig.port,
        corsOrigins: runtimeConfig.corsOrigins,
        djangoApiUrl: runtimeConfig.djangoApiUrl,
        redisEnabled: Boolean(runtimeConfig.redisUrl),
        commentHistoryCacheTtlSeconds: runtimeConfig.commentHistoryCacheTtlSeconds,
    });
    const httpServer = createServer((req, res) => {
        void handleHttpRequest(req, res, io);
    });
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: runtimeConfig.corsOrigins,
            credentials: true,
        },
        transports: ["polling", "websocket"],
    });
    cleanupRedis = await setupRedisAdapter(io);
    commentHistoryCache = await setupCommentHistoryCache();
    cleanupCommentHistoryCache = commentHistoryCache.close;
    io.use(async (socket, next) => {
        try {
            const token = getAuthToken(socket);
            if (!token) {
                logWarn("Socket auth rejected: missing token", {
                    address: socket.handshake.address,
                });
                next(new Error("Authentication required"));
                return;
            }
            logInfo("Authenticating socket", {
                address: socket.handshake.address,
            });
            const user = await authenticateUser(token);
            socket.data.user = user;
            socket.data.token = token;
            socket.data.connectionId = uuidv4();
            logInfo("Socket authenticated", {
                connectionId: socket.data.connectionId,
                userId: user.id,
                username: user.username,
            });
            next();
        }
        catch (error) {
            logError("Socket authentication failed", {
                address: socket.handshake.address,
                error: getErrorMessage(error, "Authentication failed"),
            });
            next(new Error(getErrorMessage(error, "Authentication failed")));
        }
    });
    io.on("connection", (socket) => {
        logInfo("Socket connected", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
        });
        socket.join(userRoom(socket.data.user.id));
        logInfo("Socket joined user room", {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.id,
            room: userRoom(socket.data.user.id),
        });
        socket.emit("connected", {
            connectionId: socket.data.connectionId,
            user: socket.data.user,
        });
        void emitPresenceChange(io, socket.data.user.id);
        socket.on("comments:join", async ({ roomId }) => {
            logInfo("Received comments:join", {
                connectionId: socket.data.connectionId,
                userId: socket.data.user.id,
                roomId,
            });
            await handleCommentsJoin(socket, roomId);
        });
        socket.on("comments:send_comment", async ({ roomId, text, clientId }) => {
            logInfo("Received comments:send_comment", {
                connectionId: socket.data.connectionId,
                userId: socket.data.user.id,
                roomId,
            });
            await handleSendComment(socket, roomId, text, clientId);
        });
        socket.on("comments:send_reply", async ({ roomId, parentId, text }) => {
            logInfo("Received comments:send_reply", {
                connectionId: socket.data.connectionId,
                userId: socket.data.user.id,
                roomId,
                parentId,
            });
            await handleSendReply(socket, roomId, parentId, text);
        });
        socket.on("comments:vote_comment", async ({ roomId, commentId }) => {
            logInfo("Received comments:vote_comment", {
                connectionId: socket.data.connectionId,
                userId: socket.data.user.id,
                roomId,
                commentId,
            });
            await handleVoteComment(socket, roomId, commentId);
        });
        socket.on("video-likes:join", () => {
            logInfo("Received video-likes:join", {
                connectionId: socket.data.connectionId,
                userId: socket.data.user.id,
            });
            socket.join(videoLikesRoom());
            logInfo("Socket joined video likes room", {
                connectionId: socket.data.connectionId,
                userId: socket.data.user.id,
                room: videoLikesRoom(),
            });
        });
        socket.on("video-likes:like_video", async ({ videoId }) => {
            logInfo("Received video-likes:like_video", {
                connectionId: socket.data.connectionId,
                userId: socket.data.user.id,
                videoId,
            });
            await handleLikeVideo(socket, videoId);
        });
        socket.on("messages:send", (payload) => {
            handleDirectMessageRelay(socket, payload);
        });
        socket.on("messages:delete", (payload) => {
            handleDirectMessageDelete(socket, payload);
        });
        socket.on("messages:read", (payload) => {
            handleDirectMessageRead(socket, payload);
        });
        socket.on("messages:typing", (payload) => {
            handleDirectMessageTyping(socket, payload);
        });
        socket.on("presence:subscribe", ({ userIds }) => {
            void handlePresenceSubscribe(socket, io, Array.isArray(userIds) ? userIds : []);
        });
        socket.on("call:invite", (payload) => {
            handleCallInvite(socket, payload);
        });
        socket.on("call:accept", (payload) => {
            handleCallPeerEvent(socket, payload, "call:accepted");
        });
        socket.on("call:reject", (payload) => {
            handleCallPeerEvent(socket, payload, "call:rejected");
        });
        socket.on("call:missed", (payload) => {
            handleCallPeerEvent(socket, payload, "call:missed");
        });
        socket.on("call:end", (payload) => {
            handleCallPeerEvent(socket, payload, "call:ended");
        });
        socket.on("call:media-update", (payload) => {
            handleCallPeerEvent(socket, payload, "call:media-updated");
        });
        socket.on("call:offer", (payload) => {
            handleCallSignal(socket, payload, "call:offer");
        });
        socket.on("call:answer", (payload) => {
            handleCallSignal(socket, payload, "call:answer");
        });
        socket.on("call:ice-candidate", (payload) => {
            handleCallSignal(socket, payload, "call:ice-candidate");
        });
        socket.on("disconnect", (reason) => {
            logInfo("Socket disconnected", {
                connectionId: socket.data.connectionId,
                userId: socket.data.user.id,
                reason,
            });
            setTimeout(() => {
                void emitPresenceChange(io, socket.data.user.id);
            }, 0);
        });
    });
    logInfo("Realtime server ready");
    return {
        httpServer,
        io,
        listen: (port) => new Promise((resolve) => {
            httpServer.listen(port, resolve);
            logInfo("HTTP server listening", { port });
        }),
        close: async () => {
            logInfo("Shutting down realtime server");
            await new Promise((resolve) => {
                io.close(() => resolve());
            });
            await cleanupRedis();
            await cleanupCommentHistoryCache();
            logInfo("Realtime server stopped");
        },
    };
}
//# sourceMappingURL=server.js.map