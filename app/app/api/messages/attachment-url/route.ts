import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/messages/attachment-url/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `JWT ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({ detail: "Unable to prepare attachment" }));
  return NextResponse.json(data, { status: response.status });
}
