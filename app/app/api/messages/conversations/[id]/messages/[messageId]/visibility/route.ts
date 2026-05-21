import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function buildHeaders() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access")?.value;
  const csrfToken = cookieStore.get("csrftoken")?.value;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (accessToken) headers.Authorization = `JWT ${accessToken}`;
  if (csrfToken) headers["X-CSRFToken"] = csrfToken;

  return headers;
}

async function readUpstreamJson(response: Response, fallbackDetail: string) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    console.error("Message visibility upstream returned non-JSON:", text.slice(0, 300));
    return { detail: fallbackDetail };
  }
  return response.json().catch(() => ({ detail: fallbackDetail }));
}

async function proxyVisibilityRequest(
  method: "DELETE" | "PATCH" | "POST",
  params: Promise<{ id: string; messageId: string }>
) {
  try {
    const { id, messageId } = await params;
    const headers = await buildHeaders();

    if (!headers.Authorization) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/messages/conversations/${id}/messages/${messageId}/visibility/`, {
      method,
      headers,
      credentials: "include",
    });

    const data = await readUpstreamJson(response, "Unable to update message");
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to update message" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  return proxyVisibilityRequest("DELETE", params);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  return proxyVisibilityRequest("POST", params);
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  return proxyVisibilityRequest("PATCH", params);
}
