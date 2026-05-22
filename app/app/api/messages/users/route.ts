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

async function readUpstreamJson(response: Response, fallbackDetail: string) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    console.error("Messages users upstream returned non-JSON:", text.slice(0, 300));
    return { detail: fallbackDetail };
  }
  return response.json().catch(() => ({ detail: fallbackDetail }));
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/auth/messages/users/`);
    const search = req.nextUrl.searchParams.get("search")?.trim();
    if (search) {
      url.searchParams.set("search", search);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: buildHeaders(req),
      credentials: "include",
      cache: "no-store",
    });

    const data = await readUpstreamJson(response, "Unable to load people");
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to load people" },
      { status: 500 }
    );
  }
}
