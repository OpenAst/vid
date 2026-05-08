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

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => ({ detail: "Unable to load messages" }))
      : { detail: await response.text().catch(() => "Unable to load messages") };
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

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => ({ detail: "Unable to send message" }))
      : { detail: await response.text().catch(() => "Unable to send message") };
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to send message" },
      { status: 500 }
    );
  }
}
