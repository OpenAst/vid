import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      return NextResponse.json({ detail: "Unable to validate email right now." }, { status: 500 });
    }

    const res = await fetch(`${apiUrl}/auth/check_email/?email=${encodeURIComponent(email || "")}`);
    const contentType = res.headers.get("content-type");
    const data = contentType?.includes("application/json")
      ? await res.json()
      : { detail: "Unable to validate email right now." };

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Email check error:", error);
    return NextResponse.json({ detail: "Unable to validate email right now." }, { status: 500 });
  }
}
