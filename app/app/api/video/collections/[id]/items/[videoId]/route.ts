import { NextRequest, NextResponse } from "next/server";

function getAuthHeaders(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  return accessToken ? { Authorization: `JWT ${accessToken}` } : null;
}

async function forwardCollectionItemRequest(
  req: NextRequest,
  id: string,
  videoId: string,
  method: "POST" | "DELETE"
) {
  const headers = getAuthHeaders(req);
  if (!headers) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/saved/collections/${id}/items/${videoId}/`, {
    method,
    headers,
  });
  const data = await response.json().catch(() => ({ detail: "Unable to update collection" }));
  return NextResponse.json(data, { status: response.status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; videoId: string }> }) {
  const { id, videoId } = await params;
  return forwardCollectionItemRequest(req, id, videoId, "POST");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; videoId: string }> }) {
  const { id, videoId } = await params;
  return forwardCollectionItemRequest(req, id, videoId, "DELETE");
}
