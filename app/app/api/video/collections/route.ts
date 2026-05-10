import { NextRequest, NextResponse } from "next/server";

function getAuthHeaders(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  return accessToken ? { Authorization: `JWT ${accessToken}`, "Content-Type": "application/json" } : null;
}

export async function GET(req: NextRequest) {
  const headers = getAuthHeaders(req);
  if (!headers) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/saved/collections/`, {
    headers,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ detail: "Unable to load collections" }));
  return NextResponse.json(data, { status: response.status });
}

export async function POST(req: NextRequest) {
  const headers = getAuthHeaders(req);
  if (!headers) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await req.text();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/saved/collections/`, {
    method: "POST",
    headers,
    body,
  });
  const data = await response.json().catch(() => ({ detail: "Unable to create collection" }));
  return NextResponse.json(data, { status: response.status });
}
