import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accessToken = req.cookies.get("access")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.text();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/${id}/progress/`, {
    method: "POST",
    headers: {
      Authorization: `JWT ${accessToken}`,
      "Content-Type": "application/json",
    },
    body,
  });
  const data = await response.json().catch(() => ({ detail: "Unable to update watch progress" }));
  return NextResponse.json(data, { status: response.status });
}
