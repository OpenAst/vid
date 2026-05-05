import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/calls/pending/`, {
    headers: {
      Authorization: `JWT ${accessToken}`,
    },
  });

  const data = await response.json().catch(() => ({ call: null }));
  return NextResponse.json(data, { status: response.status });
}
