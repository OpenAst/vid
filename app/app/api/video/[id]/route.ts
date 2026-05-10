import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accessToken = req.cookies.get("access")?.value;

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/${id}/`, {
    method: "GET",
    headers: {
      ...(accessToken && { Authorization: `JWT ${accessToken}` }),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({ detail: "Unable to load video" }));
  return NextResponse.json(data, { status: response.status });
}
