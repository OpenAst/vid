import { NextRequest, NextResponse } from "next/server";

function buildHeaders(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `JWT ${accessToken}`;
  }

  return headers;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/collabs/requests/${id}/applications/`, {
    method: "GET",
    headers: buildHeaders(req),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({ detail: "Unable to load applications" }));
  return NextResponse.json(data, { status: response.status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/collabs/requests/${id}/applications/`, {
    method: "POST",
    headers: buildHeaders(req),
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({ detail: "Unable to apply" }));
  return NextResponse.json(data, { status: response.status });
}
