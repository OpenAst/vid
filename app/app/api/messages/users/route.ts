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
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/messages/users/`, {
      method: "GET",
      headers: buildHeaders(req),
      credentials: "include",
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({ detail: "Unable to load people" }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to load people" },
      { status: 500 }
    );
  }
}
