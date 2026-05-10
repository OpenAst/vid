import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accessToken = req.cookies.get("access")?.value;
  const csrfToken = req.cookies.get("csrftoken")?.value;

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/${id}/watermark/`, {
    method: "POST",
    headers: {
      ...(accessToken && { Authorization: `JWT ${accessToken}` }),
      ...(csrfToken && { "X-CSRFToken": csrfToken }),
    },
  });

  const data = await response.json().catch(() => ({ detail: "Watermarked export failed" }));
  return NextResponse.json(data, { status: response.status });
}
