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

  if (accessToken) headers.Authorization = `JWT ${accessToken}`;
  if (csrfToken) headers["X-CSRFToken"] = csrfToken;

  return headers;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params;
    const body = await req.json();
    const headers = await buildHeaders();

    if (!headers.Authorization) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/messages/conversations/${id}/messages/${messageId}/reaction/`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({ detail: "Unable to update reaction" }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to update reaction" },
      { status: 500 }
    );
  }
}
