import { NextRequest, NextResponse } from "next/server";

async function forwardSaveRequest(req: NextRequest, id: string, method: "POST" | "DELETE") {
  const accessToken = req.cookies.get("access")?.value;
  const csrfToken = req.cookies.get("csrftoken")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/${id}/save/`, {
    method,
    headers: {
      Authorization: `JWT ${accessToken}`,
      ...(csrfToken && { "X-CSRFToken": csrfToken }),
    },
  });

  const data = await response.json().catch(() => ({ detail: "Save action failed" }));
  return NextResponse.json(data, { status: response.status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardSaveRequest(req, id, "POST");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardSaveRequest(req, id, "DELETE");
}
