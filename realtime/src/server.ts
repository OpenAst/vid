import { createServer, IncomingMessage, Server as HttpServer, ServerResponse } from "node:http";
import { v4 as uuidv4, validate as isUuid } from "uuid";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { runtimeConfig } from "./config.js";
import {
  authenticateUser,
  createComment,
  createReply,
  fetchCommentHistory,
  toggleCommentVote,
  toggleVideoVote,
  type RealtimeUser,
} from "./django.js";

type ClientToServerEvents = {
  "comments:join": (payload: { roomId: string }) => void;
  "comments:send_comment": (payload: { roomId: string; text: string }) => void;
  "comments:send_reply": (payload: { roomId: string; parentId: string; text: string }) => void;
  "comments:vote_comment": (payload: { roomId: string; commentId: string }) => void;
  "video-likes:join": () => void;
  "video-likes:like_video": (payload: { videoId: string }) => void;
  "messages:send": (payload: DirectMessageRelayPayload) => void;
  "call:invite": (payload: CallInvitePayload) => void;
  "call:accept": (payload: CallPeerPayload) => void;
  "call:reject": (payload: CallPeerPayload) => void;
  "call:end": (payload: CallPeerPayload) => void;
  "call:media-update": (payload: CallPeerPayload & { callType: CallType }) => void;
  "call:offer": (payload: CallSignalPayload) => void;
  "call:answer": (payload: CallSignalPayload) => void;
  "call:ice-candidate": (payload: CallSignalPayload) => void;
};

type ServerToClientEvents = {
  connected: (payload: { connectionId: string; user: RealtimeUser }) => void;
  "comments.history": (payload: { roomId: string; comments: unknown[] }) => void;
  new_comment: (payload: { roomId: string; comment: unknown }) => void;
  new_reply: (payload: { roomId: string; parentId: string; reply: unknown }) => void;
  comment_liked: (payload: {
    roomId: string;
    commentId: string;
    likes: number;
    liked: boolean;
    actorUserId: string;
  }) => void;
  video_vote_updated: (payload: {
    videoId: string;
    likes: number;
    liked: boolean;
    actorUserId: string;
  }) => void;
  video_view_updated: (payload: { videoId: string; views: number }) => void;
  "messages:new": (payload: DirectMessageRelayPayload & { fromUserId: string }) => void;
  "call:incoming": (payload: CallInvitePayload & { caller: RealtimeUser }) => void;
  "call:accepted": (payload: CallPeerPayload & { actor: RealtimeUser }) => void;
  "call:rejected": (payload: CallPeerPayload & { actor: RealtimeUser }) => void;
  "call:ended": (payload: CallPeerPayload & { actor: RealtimeUser }) => void;
  "call:media-updated": (payload: CallPeerPayload & { actor: RealtimeUser; callType: CallType }) => void;
  "call:offer": (payload: CallSignalPayload & { fromUserId: string }) => void;
  "call:answer": (payload: CallSignalPayload & { fromUserId: string }) => void;
  "call:ice-candidate": (payload: CallSignalPayload & { fromUserId: string }) => void;
  "realtime:error": (payload: { message: string }) => void;
};

type CallType = "audio" | "video";

type CallInvitePayload = {
  callId: string;
  calleeId: string;
  callType: CallType;
};

type CallPeerPayload = {
  callId: string;
  peerId: string;
  callType?: CallType;
};

type CallSignalPayload = {
  callId: string;
  toUserId: string;
  signal: unknown;
};

type DirectMessageRelayPayload = {
  conversationId: string;
  toUserId: string;
  message: unknown;
};

type InterServerEvents = Record<string, never>;

type SocketData = {
  user: RealtimeUser;
  token: string;
  connectionId: string;
};

type RealtimeSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type RealtimeIO = SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function logInfo(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.log(`[realtime] ${message}`, details);
    return;
  }

  console.log(`[realtime] ${message}`);
}

function logWarn(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.warn(`[realtime] ${message}`, details);
    return;
  }

  console.warn(`[realtime] ${message}`);
}

function logError(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.error(`[realtime] ${message}`, details);
    return;
  }

  console.error(`[realtime] ${message}`);
}

function commentsRoom(roomId: string) {
  return `comments:${roomId}`;
}

function videoLikesRoom() {
  return "video-likes";
}

function userRoom(userId: string) {
  return `user:${userId}`;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, {
    "content-type": "application/json",
  });
  res.end(JSON.stringify(payload));
}

function getAuthToken(socket: RealtimeSocket) {
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) {
    return null;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function setupRedisAdapter(io: RealtimeIO): Promise<() => Promise<void>> {
  if (!runtimeConfig.redisUrl) {
    logInfo("Redis adapter disabled: REDIS_URL is empty");
    return async () => {};
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
  } catch (error) {
    logWarn("Redis adapter disabled", { error: getErrorMessage(error, "Unable to connect to Redis") });
    await Promise.allSettled([
      Promise.resolve(pubClient.destroy()),
      Promise.resolve(subClient.destroy()),
    ]);
    return async () => {};
  }
}

async function handleHttpRequest(req: IncomingMessage, res: ServerResponse, io: RealtimeIO) {
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

    if (
      body?.type === "video_view_updated" &&
      typeof body.videoId === "string" &&
      typeof body.views === "number" &&
      isUuid(body.videoId)
    ) {
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
    } else {
      logWarn("Internal event ignored: unsupported payload", {
        type: body?.type,
      });
    }

    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { detail: "Not found" });
}

function emitError(socket: RealtimeSocket, message: string) {
  logWarn("Sending realtime error to client", {
    connectionId: socket.data.connectionId,
    userId: socket.data.user?.id,
    message,
  });
  socket.emit("realtime:error", { message });
}

async function handleCommentsJoin(socket: RealtimeSocket, roomId: string) {
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
    const history = await fetchCommentHistory(socket.data.token, roomId);
    logInfo("Fetched comment history", {
      connectionId: socket.data.connectionId,
      userId: socket.data.user.id,
      roomId,
      count: history.comments.length,
    });
    socket.emit("comments.history", {
      roomId,
      comments: history.comments,
    });
  } catch (error) {
    logError("Failed to load comment history", {
      connectionId: socket.data.connectionId,
      userId: socket.data.user.id,
      roomId,
      error: getErrorMessage(error, "Unable to load comment history"),
    });
    emitError(socket, getErrorMessage(error, "Unable to load comment history"));
  }
}

async function handleSendComment(socket: RealtimeSocket, roomId: string, text: string) {
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
    socket.to(commentsRoom(roomId)).emit("new_comment", {
      roomId,
      comment: response.comment,
    });
    socket.emit("new_comment", {
      roomId,
      comment: response.comment,
    });
    logInfo("Comment created and broadcast", {
      connectionId: socket.data.connectionId,
      userId: socket.data.user.id,
      roomId,
    });
  } catch (error) {
    logError("Failed to create comment", {
      connectionId: socket.data.connectionId,
      userId: socket.data.user.id,
      roomId,
      error: getErrorMessage(error, "Unable to create comment"),
    });
    emitError(socket, getErrorMessage(error, "Unable to create comment"));
  }
}

async function handleSendReply(
  socket: RealtimeSocket,
  roomId: string,
  parentId: string,
  text: string
) {
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
  } catch (error) {
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

async function handleVoteComment(socket: RealtimeSocket, roomId: string, commentId: string) {
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
  } catch (error) {
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

async function handleLikeVideo(socket: RealtimeSocket, videoId: string) {
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
  } catch (error) {
    logError("Failed to toggle video vote", {
      connectionId: socket.data.connectionId,
      userId: socket.data.user.id,
      videoId,
      error: getErrorMessage(error, "Unable to toggle video vote"),
    });
    emitError(socket, getErrorMessage(error, "Unable to toggle video vote"));
  }
}

function isValidCallType(callType: unknown): callType is CallType {
  return callType === "audio" || callType === "video";
}

function validateCallId(socket: RealtimeSocket, callId: string) {
  if (!isUuid(callId)) {
    emitError(socket, "Invalid call id");
    return false;
  }

  return true;
}

function validateUserId(socket: RealtimeSocket, userId: string) {
  if (!isUuid(userId)) {
    emitError(socket, "Invalid call user id");
    return false;
  }

  return true;
}

function handleCallInvite(socket: RealtimeSocket, payload: CallInvitePayload) {
  if (!validateCallId(socket, payload.callId) || !validateUserId(socket, payload.calleeId)) return;

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

function handleCallPeerEvent(
  socket: RealtimeSocket,
  payload: CallPeerPayload,
  eventName: "call:accepted" | "call:rejected" | "call:ended" | "call:media-updated"
) {
  if (!validateCallId(socket, payload.callId) || !validateUserId(socket, payload.peerId)) return;

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

function handleCallSignal(
  socket: RealtimeSocket,
  payload: CallSignalPayload,
  eventName: "call:offer" | "call:answer" | "call:ice-candidate"
) {
  if (!validateCallId(socket, payload.callId) || !validateUserId(socket, payload.toUserId)) return;

  socket.to(userRoom(payload.toUserId)).emit(eventName, {
    ...payload,
    fromUserId: socket.data.user.id,
  });
}

function handleDirectMessageRelay(socket: RealtimeSocket, payload: DirectMessageRelayPayload) {
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

export async function createRealtimeServer() {
  let io!: RealtimeIO;
  let cleanupRedis: () => Promise<void> = async () => {};

  logInfo("Starting realtime server", {
    port: runtimeConfig.port,
    corsOrigins: runtimeConfig.corsOrigins,
    djangoApiUrl: runtimeConfig.djangoApiUrl,
    redisEnabled: Boolean(runtimeConfig.redisUrl),
  });

  const httpServer: HttpServer = createServer((req, res) => {
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
    } catch (error) {
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

    socket.on("comments:join", async ({ roomId }) => {
      logInfo("Received comments:join", {
        connectionId: socket.data.connectionId,
        userId: socket.data.user.id,
        roomId,
      });
      await handleCommentsJoin(socket, roomId);
    });

    socket.on("comments:send_comment", async ({ roomId, text }) => {
      logInfo("Received comments:send_comment", {
        connectionId: socket.data.connectionId,
        userId: socket.data.user.id,
        roomId,
      });
      await handleSendComment(socket, roomId, text);
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

    socket.on("call:invite", (payload) => {
      handleCallInvite(socket, payload);
    });

    socket.on("call:accept", (payload) => {
      handleCallPeerEvent(socket, payload, "call:accepted");
    });

    socket.on("call:reject", (payload) => {
      handleCallPeerEvent(socket, payload, "call:rejected");
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
    });
  });

  logInfo("Realtime server ready");

  return {
    httpServer,
    io,
    listen: (port: number) =>
      new Promise<void>((resolve) => {
        httpServer.listen(port, resolve);
        logInfo("HTTP server listening", { port });
      }),
    close: async () => {
      logInfo("Shutting down realtime server");
      await new Promise<void>((resolve) => {
        io.close(() => resolve());
      });

      await cleanupRedis();
      logInfo("Realtime server stopped");
    },
  };
}
