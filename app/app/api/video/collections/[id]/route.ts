import { NextRequest, NextResponse } from "next/server";

function getAuthHeaders(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  return accessToken ? { Authorization: `JWT ${accessToken}` } : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = getAuthHeaders(req);
  if (!headers) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/saved/collections/${id}/`, {
    headers,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ detail: "Unable to load collection" }));
  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = getAuthHeaders(req);
  if (!headers) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/saved/collections/${id}/`, {
    method: "DELETE",
    headers,
  });
  if (response.status === 204) return new NextResponse(null, { status: 204 });

  const data = await response.json().catch(() => ({ detail: "Unable to delete collection" }));
  return NextResponse.json(data, { status: response.status });
}
