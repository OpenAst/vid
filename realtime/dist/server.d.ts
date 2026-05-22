import { IncomingMessage, Server as HttpServer, ServerResponse } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { type RealtimeUser } from "./django.js";
type ClientToServerEvents = {
    "comments:join": (payload: {
        roomId: string;
    }) => void;
    "comments:send_comment": (payload: {
        roomId: string;
        text: string;
        clientId?: string;
    }) => void;
    "comments:send_reply": (payload: {
        roomId: string;
        parentId: string;
        text: string;
    }) => void;
    "comments:vote_comment": (payload: {
        roomId: string;
        commentId: string;
    }) => void;
    "video-likes:join": () => void;
    "video-likes:like_video": (payload: {
        videoId: string;
    }) => void;
    "messages:send": (payload: DirectMessageRelayPayload) => void;
    "messages:delete": (payload: DirectMessageRelayPayload) => void;
    "messages:read": (payload: DirectMessageReadPayload) => void;
    "messages:typing": (payload: DirectMessageTypingPayload) => void;
    "presence:subscribe": (payload: {
        userIds: string[];
    }) => void;
    "call:invite": (payload: CallInvitePayload) => void;
    "call:accept": (payload: CallPeerPayload) => void;
    "call:reject": (payload: CallPeerPayload) => void;
    "call:missed": (payload: CallPeerPayload) => void;
    "call:end": (payload: CallPeerPayload) => void;
    "call:media-update": (payload: CallPeerPayload & {
        callType: CallType;
    }) => void;
    "call:offer": (payload: CallSignalPayload) => void;
    "call:answer": (payload: CallSignalPayload) => void;
    "call:ice-candidate": (payload: CallSignalPayload) => void;
};
type ServerToClientEvents = {
    connected: (payload: {
        connectionId: string;
        user: RealtimeUser;
    }) => void;
    "comments.history": (payload: {
        roomId: string;
        comments: unknown[];
    }) => void;
    new_comment: (payload: {
        roomId: string;
        comment: unknown;
        clientId?: string;
    }) => void;
    new_reply: (payload: {
        roomId: string;
        parentId: string;
        reply: unknown;
    }) => void;
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
    video_view_updated: (payload: {
        videoId: string;
        views: number;
    }) => void;
    "messages:new": (payload: DirectMessageRelayPayload & {
        fromUserId: string;
    }) => void;
    "messages:delete": (payload: DirectMessageRelayPayload & {
        fromUserId: string;
    }) => void;
    "messages:update": (payload: DirectMessageUpdatePayload) => void;
    "messages:read": (payload: DirectMessageReadPayload & {
        fromUserId: string;
    }) => void;
    "messages:typing": (payload: DirectMessageTypingPayload & {
        fromUserId: string;
    }) => void;
    "presence:snapshot": (payload: {
        onlineUserIds: string[];
    }) => void;
    "presence:changed": (payload: {
        userId: string;
        isOnline: boolean;
    }) => void;
    "call:incoming": (payload: CallInvitePayload & {
        caller: RealtimeUser;
    }) => void;
    "call:accepted": (payload: CallPeerPayload & {
        actor: RealtimeUser;
    }) => void;
    "call:rejected": (payload: CallPeerPayload & {
        actor: RealtimeUser;
    }) => void;
    "call:missed": (payload: CallPeerPayload & {
        actor: RealtimeUser;
    }) => void;
    "call:ended": (payload: CallPeerPayload & {
        actor: RealtimeUser;
    }) => void;
    "call:media-updated": (payload: CallPeerPayload & {
        actor: RealtimeUser;
        callType: CallType;
    }) => void;
    "call:offer": (payload: CallSignalPayload & {
        fromUserId: string;
    }) => void;
    "call:answer": (payload: CallSignalPayload & {
        fromUserId: string;
    }) => void;
    "call:ice-candidate": (payload: CallSignalPayload & {
        fromUserId: string;
    }) => void;
    "notifications:new": (payload: NotificationRealtimePayload) => void;
    "notifications:read": (payload: NotificationReadRealtimePayload) => void;
    "realtime:error": (payload: {
        message: string;
    }) => void;
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
type DirectMessageUpdatePayload = {
    conversationId: string;
    message: unknown;
};
type DirectMessageReadPayload = {
    conversationId: string;
    toUserId: string;
    messageIds: string[];
    readAt: string;
};
type DirectMessageTypingPayload = {
    conversationId: string;
    toUserId: string;
    isTyping: boolean;
};
type NotificationRealtimePayload = {
    notification: unknown;
    unreadCount: number;
};
type NotificationReadRealtimePayload = {
    unreadCount: number;
};
type InterServerEvents = Record<string, never>;
type SocketData = {
    user: RealtimeUser;
    token: string;
    connectionId: string;
};
type RealtimeIO = SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export declare function createRealtimeServer(): Promise<{
    httpServer: HttpServer<typeof IncomingMessage, typeof ServerResponse>;
    io: RealtimeIO;
    listen: (port: number) => Promise<void>;
    close: () => Promise<void>;
}>;
export {};
//# sourceMappingURL=server.d.ts.map