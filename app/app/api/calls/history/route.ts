import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  const peerId = req.nextUrl.searchParams.get("peer_id");

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const params = new URLSearchParams();
  if (peerId) {
    params.set("peer_id", peerId);
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/calls/history/?${params.toString()}`, {
    headers: {
      Authorization: `JWT ${accessToken}`,
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({ detail: "Unable to load call history" }));
  return NextResponse.json(data, { status: response.status });
}
