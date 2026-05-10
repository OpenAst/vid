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

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams.toString();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/collabs/requests/${searchParams ? `?${searchParams}` : ""}`,
    {
      method: "GET",
      headers: buildHeaders(req),
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => ({ detail: "Unable to load collab requests" }));
  return NextResponse.json(data, { status: response.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/collabs/requests/`, {
    method: "POST",
    headers: buildHeaders(req),
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({ detail: "Unable to post collab request" }));
  return NextResponse.json(data, { status: response.status });
}
