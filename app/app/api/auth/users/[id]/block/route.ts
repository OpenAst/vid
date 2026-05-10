import { NextRequest, NextResponse } from "next/server";

async function forwardBlockRequest(req: NextRequest, id: string, method: "POST" | "DELETE") {
  const accessToken = req.cookies.get("access")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/${id}/block/`, {
    method,
    headers: {
      Authorization: `JWT ${accessToken}`,
    },
  });

  const data = await response.json().catch(() => ({ detail: "Block action failed" }));
  return NextResponse.json(data, { status: response.status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardBlockRequest(req, id, "POST");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardBlockRequest(req, id, "DELETE");
}
