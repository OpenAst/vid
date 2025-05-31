import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData(); 
    const csrfToken = req.cookies.get('csrftoken')?.value;
    const accessToken = req.cookies.get("access")?.value;

    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;


    if (!csrfToken || !title || !accessToken || !file || !description) {
      throw new Error('Missing required fields or authentication.');
    }

    const presignedRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/videos/get_presigned_url/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
          Authorization: `JWT ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify({
          file_name: file.name,
          file_type: file.type,
        }),
      }
    );

    if (!presignedRes.ok) {
      const error = await presignedRes.text();
      throw new Error(`Presigned URL error: ${error}`);
    }

    const { url, fields, file_key } = await presignedRes.json();

    const uploadFormData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      uploadFormData.append(key, value as string);
    });
    uploadFormData.append("file", file);

    const uploadRes = await fetch(url, {
      method: "POST",
      body: uploadFormData,
    });

    if (!uploadRes.ok) {
      const error = await uploadRes.text();
      throw new Error(`R2 upload failed: ${error}`);
    }

    const saveRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/upload/`, {
      method: "POST",
      headers: {
        Authorization: `JWT ${req.cookies.get('access')?.value}`,
        'X-CSRFToken': csrfToken, 
      },
      credentials: 'include',
      body: JSON.stringify({
        title,
        description,
        video_url: `${process.env.NEXT_PUBLIC_R2_URL}/${file_key}}`,
      }),
    });

    if (!saveRes.ok) {
      const error = await saveRes.text();
      throw new Error(`Saving metadata failed: ${error}`);
    }

    const finalData = await saveRes.json();
    return NextResponse.json(finalData);
  } catch (err) {
    console.log('Error working upload', err);
    return NextResponse.json(
      {
        error: 'Something went wrong uploading video',
      },
      { status: 500, headers: {'Content-Type': 'application/json'}}
    );
  }
}
