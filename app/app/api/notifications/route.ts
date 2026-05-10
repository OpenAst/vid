import { NextRequest, NextResponse } from "next/server";

async function forwardNotificationsRequest(req: NextRequest, method: "GET" | "PATCH") {
  const accessToken = req.cookies.get("access")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/notifications/`, {
    method,
    headers: {
      Authorization: `JWT ${accessToken}`,
    },
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
