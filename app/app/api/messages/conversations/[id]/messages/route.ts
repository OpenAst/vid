import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function buildHeaders() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access")?.value;
  const csrfToken = cookieStore.get("csrftoken")?.value;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `JWT ${accessToken}`;
  }

  if (csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }

  return headers;
}

async function readUpstreamJson(response: Response, fallbackDetail: string) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    console.error("Conversation messages upstream returned non-JSON:", text.slice(0, 300));
    return { detail: fallbackDetail };
  }
  return response.json().catch(() => ({ detail: fallbackDetail }));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const headers = await buildHeaders();

    if (!headers.Authorization) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/messages/conversations/${id}/messages/`, {
      method: "GET",
      headers,
      credentials: "include",
      cache: "no-store",
    });

    const data = await readUpstreamJson(response, "Unable to load messages");
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to load messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const headers = await buildHeaders();

    if (!headers.Authorization) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/messages/conversations/${id}/messages/`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await readUpstreamJson(response, "Unable to send message");
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to send message" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const headers = await buildHeaders();

    if (!headers.Authorization) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/messages/conversations/${id}/messages/`, {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await readUpstreamJson(response, "Unable to update messages");
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to update messages" },
      { status: 500 }
    );
  }
}
