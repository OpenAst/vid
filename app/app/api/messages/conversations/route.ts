import { NextRequest, NextResponse } from "next/server";

function buildHeaders(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  const csrfToken = req.cookies.get("csrftoken")?.value;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `JWT ${accessToken}`;
  }

  if (csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }

  return headers;
}

async function readUpstreamJson(response: Response, fallbackDetail: string) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    console.error("Messages conversations upstream returned non-JSON:", text.slice(0, 300));
    return { detail: fallbackDetail };
  }
  return response.json().catch(() => ({ detail: fallbackDetail }));
}

export async function GET(req: NextRequest) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/messages/conversations/`, {
      method: "GET",
      headers: buildHeaders(req),
      credentials: "include",
      cache: "no-store",
    });

    const data = await readUpstreamJson(response, "Unable to load conversations");
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to load conversations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/messages/conversations/`, {
      method: "POST",
      headers: buildHeaders(req),
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await readUpstreamJson(response, "Unable to start conversation");
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to start conversation" },
      { status: 500 }
    );
  }
}
