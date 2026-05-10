import { NextRequest, NextResponse } from "next/server";

function buildHeaders(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  return {
    "Content-Type": "application/json",
    ...(accessToken && { Authorization: `JWT ${accessToken}` }),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/bookings/slots/${id}/requests/`, {
    headers: buildHeaders(req),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ detail: "Unable to load booking requests" }));
  return NextResponse.json(data, { status: response.status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/bookings/slots/${id}/requests/`, {
    method: "POST",
    headers: buildHeaders(req),
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ detail: "Unable to request booking" }));
  return NextResponse.json(data, { status: response.status });
}
