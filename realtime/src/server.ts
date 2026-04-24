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
  "realtime:error": (payload: { message: string }) => void;
};

type InterServerEvents = Record<string, never>;

type SocketData = {
  user: RealtimeUser;
  token: string;
  connectionId: string;
};

type RealtimeSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type RealtimeIO = SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function commentsRoom(roomId: string) {
  return `comments:${roomId}`;
}

function videoLikesRoom() {
  return "video-likes";
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
    return async () => {};
  }

  const pubClient = createClient({ url: runtimeConfig.redisUrl });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (error) => {
    console.warn("[realtime] Redis publisher error:", error);
  });

  subClient.on("error", (error) => {
    console.warn("[realtime] Redis subscriber error:", error);
  });

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));

    return async () => {
      await Promise.allSettled([Promise.resolve(pubClient.quit()), Promise.resolve(subClient.quit())]);
    };
  } catch (error) {
    console.warn("[realtime] Redis adapter disabled:", getErrorMessage(error, "Unable to connect to Redis"));
    await Promise.allSettled([
      Promise.resolve(pubClient.disconnect()),
      Promise.resolve(subClient.disconnect()),
    ]);
    return async () => {};
  }
}

async function handleHttpRequest(req: IncomingMessage, res: ServerResponse, io: RealtimeIO) {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(res, 200, { ok: true, service: "realtime" });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/internal/events") {
    const authHeader = req.headers.authorization || "";
    const expectedAuth = runtimeConfig.realtimeInternalSecret
      ? `Bearer ${runtimeConfig.realtimeInternalSecret}`
      : "";

    if (!expectedAuth || authHeader !== expectedAuth) {
      sendJson(res, 403, { detail: "Forbidden" });
      return;
    }

    const body = await readJsonBody(req);

    if (
      body?.type === "video_view_updated" &&
      typeof body.videoId === "string" &&
      typeof body.views === "number" &&
      isUuid(body.videoId)
    ) {
      io.to(videoLikesRoom()).emit("video_view_updated", {
        videoId: body.videoId,
        views: body.views,
      });
    }

    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { detail: "Not found" });
}

function emitError(socket: RealtimeSocket, message: string) {
  socket.emit("realtime:error", { message });
}

async function handleCommentsJoin(socket: RealtimeSocket, roomId: string) {
  if (!isUuid(roomId)) {
    emitError(socket, "Invalid comment room id");
    return;
  }

  const room = commentsRoom(roomId);
  socket.join(room);

  try {
    const history = await fetchCommentHistory(socket.data.token, roomId);
    socket.emit("comments.history", {
      roomId,
      comments: history.comments,
    });
  } catch (error) {
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
    const response = await createComment(socket.data.token, roomId, content);
    socket.to(commentsRoom(roomId)).emit("new_comment", {
      roomId,
      comment: response.comment,
    });
    socket.emit("new_comment", {
      roomId,
      comment: response.comment,
    });
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    emitError(socket, getErrorMessage(error, "Unable to toggle comment vote"));
  }
}

async function handleLikeVideo(socket: RealtimeSocket, videoId: string) {
  if (!isUuid(videoId)) {
    emitError(socket, "Invalid video id");
    return;
  }

  try {
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
  } catch (error) {
    emitError(socket, getErrorMessage(error, "Unable to toggle video vote"));
  }
}

export async function createRealtimeServer() {
  let io!: RealtimeIO;
  let cleanupRedis: () => Promise<void> = async () => {};

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
        next(new Error("Authentication required"));
        return;
      }

      const user = await authenticateUser(token);
      socket.data.user = user;
      socket.data.token = token;
      socket.data.connectionId = uuidv4();
      next();
    } catch (error) {
      next(new Error(getErrorMessage(error, "Authentication failed")));
    }
  });

  io.on("connection", (socket) => {
    socket.emit("connected", {
      connectionId: socket.data.connectionId,
      user: socket.data.user,
    });

    socket.on("comments:join", async ({ roomId }) => {
      await handleCommentsJoin(socket, roomId);
    });

    socket.on("comments:send_comment", async ({ roomId, text }) => {
      await handleSendComment(socket, roomId, text);
    });

    socket.on("comments:send_reply", async ({ roomId, parentId, text }) => {
      await handleSendReply(socket, roomId, parentId, text);
    });

    socket.on("comments:vote_comment", async ({ roomId, commentId }) => {
      await handleVoteComment(socket, roomId, commentId);
    });

    socket.on("video-likes:join", () => {
      socket.join(videoLikesRoom());
    });

    socket.on("video-likes:like_video", async ({ videoId }) => {
      await handleLikeVideo(socket, videoId);
    });
  });

  return {
    httpServer,
    io,
    listen: (port: number) =>
      new Promise<void>((resolve) => {
        httpServer.listen(port, resolve);
      }),
    close: async () => {
      await new Promise<void>((resolve) => {
        io.close(() => resolve());
      });

      await cleanupRedis();
    },
  };
}
