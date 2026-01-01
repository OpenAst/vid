import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  const csrfToken = req.cookies.get("csrftoken")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { file_name, file_type } = body;

    if (!file_name || !file_type) {
      return NextResponse.json({ error: "Missing file metadata" }, { status: 400 });
    }

    // Ask Django for presigned URL
    const presignedRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/profile/get_avatar_url/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `JWT ${accessToken}`,
          ...(csrfToken && { "X-CSRFToken": csrfToken }),
        },
        body: JSON.stringify({ file_name, file_type }),
      }
    );

    if (!presignedRes.ok) {
      const errorText = await presignedRes.text();
      throw new Error(`Failed to get presigned URL: ${errorText}`);
    }

    const { upload_url, public_url } = await presignedRes.json();

    return NextResponse.json(
      { upload_url, avatar_url: public_url },
      { status: 200 }
    );
  } catch (err) {
    console.error("Presigned URL error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Something went wrong" },
      { status: 500 }
    );
  }
}
