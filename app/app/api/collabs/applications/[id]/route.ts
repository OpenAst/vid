import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accessToken = req.cookies.get("access")?.value;
  const body = await req.json();

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/collabs/applications/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `JWT ${accessToken}` }),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({ detail: "Unable to update application" }));
  return NextResponse.json(data, { status: response.status });
}
