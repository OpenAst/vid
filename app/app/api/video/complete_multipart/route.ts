import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  const csrfToken = req.cookies.get("csrftoken")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { object_key, upload_id, parts } = await req.json();

  const completeRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/videos/complete_multipart_upload/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `JWT ${accessToken}`,
        ...(csrfToken && { "X-CSRFToken": csrfToken }),
      },
      body: JSON.stringify({ object_key, upload_id, parts }),
    }
  );

  if (!completeRes.ok) {
    const errorText = await completeRes.text();
    return NextResponse.json({ error: errorText }, { status: 400 });
  }

  const completeData = await completeRes.json();
  return NextResponse.json(completeData, { status: 200 });
}
