import { NextRequest, NextResponse } from "next/server";

function buildHeaders(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  return {
    "Content-Type": "application/json",
    ...(accessToken && { Authorization: `JWT ${accessToken}` }),
  };
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams.toString();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/bookings/slots/${searchParams ? `?${searchParams}` : ""}`,
    { headers: buildHeaders(req), cache: "no-store" }
  );
  const data = await response.json().catch(() => ({ detail: "Unable to load booking slots" }));
  return NextResponse.json(data, { status: response.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/bookings/slots/`, {
    method: "POST",
    headers: buildHeaders(req),
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ detail: "Unable to create booking slot" }));
  return NextResponse.json(data, { status: response.status });
}
