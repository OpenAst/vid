import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;
  const csrfToken = req.cookies.get("csrftoken")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
        body: JSON.stringify({ file_name: file.name, file_type: file.type }),
      }
    );

    if (!presignedRes.ok) {
      const errorText = await presignedRes.text();
      throw new Error(`Failed to get presigned URL: ${errorText}`);
    }

    const { upload_url, public_url } = await presignedRes.json();

    if (!upload_url || !public_url) {
      throw new Error("Missing presigned URL or avatar_url from backend");
    }

    // Upload file directly to Cloudflare R2
    const uploadRes = await fetch(upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error('Failed to upload to R2: ${errorText}' + uploadRes.status);
    }

    console.log("Cloudflare upload status:", uploadRes.status);

    return NextResponse.json(
      { avatar_url: public_url },
      { status: 200 }
    );
  } catch (err) {
    console.error("Avatar upload error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Something went wrong" },
      { status: 500 }
    );
  }
}
