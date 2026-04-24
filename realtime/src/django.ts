import { runtimeConfig } from "./config.js";

export type RealtimeUser = {
  id: string;
  username: string | null;
  first_name: string;
  last_name: string;
  profile?: {
    avatar?: string | null;
    bio?: string | null;
    followers?: unknown;
  };
};

export type CommentHistoryResponse = {
  comments: unknown[];
};

export type CommentCreateResponse = {
  comment: unknown;
};

export type ReplyCreateResponse = {
  parentId: string;
  reply: unknown;
};

export type CommentVoteToggleResponse = {
  commentId: string;
  roomId: string;
  likes: number;
  liked: boolean;
};

export type VideoVoteToggleResponse = {
  videoId: string;
  likes: number;
  liked: boolean;
};

function buildHeaders(headers: HeadersInit | undefined, hasBody: boolean) {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("accept", "application/json");

  if (hasBody && !nextHeaders.has("content-type")) {
    nextHeaders.set("content-type", "application/json");
  }

  return nextHeaders;
}

function getErrorMessage(body: unknown, fallback: string) {
  if (typeof body === "string" && body.trim()) {
    return body;
  }

  if (body && typeof body === "object") {
    const candidate = (body as { detail?: unknown; error?: unknown; message?: unknown }).detail
      ?? (body as { detail?: unknown; error?: unknown; message?: unknown }).error
      ?? (body as { detail?: unknown; error?: unknown; message?: unknown }).message;

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return fallback;
}

async function requestJson<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${runtimeConfig.djangoApiUrl}${path}`, {
    ...init,
    headers: buildHeaders(init.headers, Boolean(init.body)),
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return { response, body: body as T | string };
}

export async function authenticateUser(token: string) {
  const { response, body } = await requestJson<RealtimeUser>("/api/realtime/auth/me/", {
    method: "GET",
    headers: {
      Authorization: `JWT ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Authentication failed"));
  }

  return body as RealtimeUser;
}

export async function fetchCommentHistory(token: string, roomId: string) {
  const { response, body } = await requestJson<CommentHistoryResponse>(
    `/api/realtime/comments/${roomId}/history/`,
    {
      method: "GET",
      headers: {
        Authorization: `JWT ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Unable to load comment history"));
  }

  return body as CommentHistoryResponse;
}

export async function createComment(token: string, roomId: string, text: string) {
  const { response, body } = await requestJson<CommentCreateResponse>(
    `/api/realtime/comments/${roomId}/messages/`,
    {
      method: "POST",
      headers: {
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({ text }),
    }
  );

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Unable to create comment"));
  }

  return body as CommentCreateResponse;
}

export async function createReply(token: string, roomId: string, parentId: string, text: string) {
  const { response, body } = await requestJson<ReplyCreateResponse>(
    `/api/realtime/comments/${roomId}/replies/`,
    {
      method: "POST",
      headers: {
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({ parentId, text }),
    }
  );

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Unable to create reply"));
  }

  return body as ReplyCreateResponse;
}

export async function toggleCommentVote(token: string, commentId: string) {
  const { response, body } = await requestJson<CommentVoteToggleResponse>(
    "/api/realtime/comments/vote/toggle/",
    {
      method: "POST",
      headers: {
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({ commentId }),
    }
  );

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Unable to toggle comment vote"));
  }

  return body as CommentVoteToggleResponse;
}

export async function toggleVideoVote(token: string, videoId: string) {
  const { response, body } = await requestJson<VideoVoteToggleResponse>(
    "/api/realtime/videos/vote/toggle/",
    {
      method: "POST",
      headers: {
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({ videoId }),
    }
  );

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Unable to toggle video vote"));
  }

  return body as VideoVoteToggleResponse;
}
