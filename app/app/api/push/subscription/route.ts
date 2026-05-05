import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  const csrfToken = req.cookies.get("csrftoken")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/push/subscription/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `JWT ${accessToken}`,
      ...(csrfToken && { "X-CSRFToken": csrfToken }),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({ detail: "Push subscription failed" }));
  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  const csrfToken = req.cookies.get("csrftoken")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/push/subscription/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `JWT ${accessToken}`,
      ...(csrfToken && { "X-CSRFToken": csrfToken }),
    },
    body: JSON.stringify(body),
  });

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await response.json().catch(() => ({ detail: "Push unsubscription failed" }));
  return NextResponse.json(data, { status: response.status });
}
