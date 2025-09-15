import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  const csrfToken = req.cookies.get("csrftoken")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { object_key, file_type, upload_id, part_number } = await req.json();

  const presignedRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/videos/get_presigned_part_url/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `JWT ${accessToken}`,
        ...(csrfToken && { "X-CSRFToken": csrfToken }),
      },
      body: JSON.stringify({ object_key, file_type, upload_id, part_number }),
    }
  );

  if (!presignedRes.ok) {
    const errorText = await presignedRes.text();
    return NextResponse.json({ error: errorText }, { status: 400 });
  }

  const presignedData = await presignedRes.json();
  return NextResponse.json(presignedData, { status: 200 });
}
