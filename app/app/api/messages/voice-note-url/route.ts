import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access")?.value;
    const csrfToken = cookieStore.get("csrftoken")?.value;

    if (!accessToken) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/messages/voice-note-url/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `JWT ${accessToken}`,
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({ detail: "Unable to prepare voice note" }));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Unable to prepare voice note" },
      { status: 500 }
    );
  }
}
