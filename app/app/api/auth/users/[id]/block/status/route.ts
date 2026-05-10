import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accessToken = req.cookies.get("access")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/${id}/block/status/`, {
    headers: {
      Authorization: `JWT ${accessToken}`,
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({ detail: "Block status failed" }));
  return NextResponse.json(data, { status: response.status });
}
