import { NextRequest, NextResponse } from "next/server";

async function forwardNotificationsRequest(req: NextRequest, method: "GET" | "PATCH") {
  const accessToken = req.cookies.get("access")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/auth/notifications/`);
  if (method === "GET" && req.nextUrl.searchParams.get("summary") === "true") {
    url.searchParams.set("summary", "true");
  }
  if (method === "GET" && req.nextUrl.searchParams.get("unread") === "true") {
    url.searchParams.set("unread", "true");
  }
  if (method === "GET" && req.nextUrl.searchParams.get("limit")) {
    url.searchParams.set("limit", req.nextUrl.searchParams.get("limit") || "");
  }

  const body = method === "PATCH" ? await req.text() : undefined;

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `JWT ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body || undefined,
  });

  const data = await response.json().catch(() => ({ detail: "Notification request failed" }));
  return NextResponse.json(data, { status: response.status });
}

export async function GET(req: NextRequest) {
  return forwardNotificationsRequest(req, "GET");
}

export async function PATCH(req: NextRequest) {
  return forwardNotificationsRequest(req, "PATCH");
}
