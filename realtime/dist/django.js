import { runtimeConfig } from "./config.js";
function buildHeaders(headers, hasBody) {
    const nextHeaders = new Headers(headers);
    nextHeaders.set("accept", "application/json");
    if (hasBody && !nextHeaders.has("content-type")) {
        nextHeaders.set("content-type", "application/json");
    }
    return nextHeaders;
}
function getErrorMessage(body, fallback) {
    if (typeof body === "string" && body.trim()) {
        return body;
    }
    if (body && typeof body === "object") {
        const candidate = body.detail
            ?? body.error
            ?? body.message;
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate;
        }
    }
    return fallback;
}
async function requestJson(path, init = {}) {
    const response = await fetch(`${runtimeConfig.djangoApiUrl}${path}`, {
        ...init,
        headers: buildHeaders(init.headers, Boolean(init.body)),
    });
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
    return { response, body: body };
}
export async function authenticateUser(token) {
    const { response, body } = await requestJson("/api/realtime/auth/me/", {
        method: "GET",
        headers: {
            Authorization: `JWT ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error(getErrorMessage(body, "Authentication failed"));
    }
    return body;
}
export async function fetchCommentHistory(token, roomId) {
    const { response, body } = await requestJson(`/api/realtime/comments/${roomId}/history/`, {
        method: "GET",
        headers: {
            Authorization: `JWT ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error(getErrorMessage(body, "Unable to load comment history"));
    }
    return body;
}
export async function createComment(token, roomId, text) {
    const { response, body } = await requestJson(`/api/realtime/comments/${roomId}/messages/`, {
        method: "POST",
        headers: {
            Authorization: `JWT ${token}`,
        },
        body: JSON.stringify({ text }),
    });
    if (!response.ok) {
        throw new Error(getErrorMessage(body, "Unable to create comment"));
    }
    return body;
}
export async function createReply(token, roomId, parentId, text) {
    const { response, body } = await requestJson(`/api/realtime/comments/${roomId}/replies/`, {
        method: "POST",
        headers: {
            Authorization: `JWT ${token}`,
        },
        body: JSON.stringify({ parentId, text }),
    });
    if (!response.ok) {
        throw new Error(getErrorMessage(body, "Unable to create reply"));
    }
    return body;
}
export async function toggleCommentVote(token, commentId) {
    const { response, body } = await requestJson("/api/realtime/comments/vote/toggle/", {
        method: "POST",
        headers: {
            Authorization: `JWT ${token}`,
        },
        body: JSON.stringify({ commentId }),
    });
    if (!response.ok) {
        throw new Error(getErrorMessage(body, "Unable to toggle comment vote"));
    }
    return body;
}
export async function toggleVideoVote(token, videoId) {
    const { response, body } = await requestJson("/api/realtime/videos/vote/toggle/", {
        method: "POST",
        headers: {
            Authorization: `JWT ${token}`,
        },
        body: JSON.stringify({ videoId }),
    });
    if (!response.ok) {
        throw new Error(getErrorMessage(body, "Unable to toggle video vote"));
    }
    return body;
}
//# sourceMappingURL=django.js.map