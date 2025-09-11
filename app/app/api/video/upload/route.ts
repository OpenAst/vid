import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

  let object_key: string = "";
  let public_url: string = "";
  let upload_id: string = "";

  const accessToken = req.cookies.get('access')?.value;
  const csrfToken = req.cookies.get('csrftoken')?.value;

  try {

    if (!accessToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;

    if (!file || !title || !description) {
      return NextResponse.json(
        { error: "Missing required fields (file and title are mandatory)" },
        { status: 400 }
      );
    }

    // 1️ Initiate multipart upload
    const initRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/initiate_multipart_upload/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `JWT ${accessToken}`,
        ...(csrfToken && { 'X-CSRFToken': csrfToken }),
      },
      body: JSON.stringify({ file_name: file.name }),
    });

    if (!initRes.ok) {
      const errorText = await initRes.text();
      throw new Error(`Failed to initiate multipart upload: ${errorText}`);
    }

    const initData = await initRes.json();
    upload_id = initData.upload_id;
    object_key = initData.object_key;
    public_url = initData.public_url;

    // 2️⃣ Upload chunks
    let partNumber = 1;
    let start = 0;
    const parts: { ETag: string; PartNumber: number }[] = [];

    while (start < file.size) {
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      // 3️⃣ Get presigned URL for this chunk
      const presignedRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/get_presigned_part_url/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `JWT ${accessToken}`,
          ...(csrfToken && { 'X-CSRFToken': csrfToken }),
        },
        body: JSON.stringify({
          object_key,
          file_type: file.type,
          upload_id,
          part_number: partNumber,
        }),
      });

      if (!presignedRes.ok) {
        const errorText = await presignedRes.text();
        throw new Error(`Presigned URL failed: ${errorText}`);
      }

      const presignedData = await presignedRes.json();
      const uploadUrl = presignedData.url;

      // 4️⃣ Upload chunk to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: chunk,
      });

      if (!uploadRes.ok) {
        throw new Error(`R2 upload failed with status ${uploadRes.status}`);
      }

      const eTag = uploadRes.headers.get('ETag');
      if (!eTag) throw new Error('Missing ETag from upload response');

      parts.push({ ETag: eTag.replace(/"/g, ""), PartNumber: partNumber });

      partNumber += 1;
      start = end;
    }

    // 5️⃣ Complete multipart upload
    const completeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/complete_multipart_upload/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `JWT ${accessToken}`,
        ...(csrfToken && { 'X-CSRFToken': csrfToken }),
      },
      body: JSON.stringify({
        object_key,
        upload_id,
        parts,
      }),
    });

    if (!completeRes.ok) {
      const errorText = await completeRes.text();
      throw new Error(`Failed to complete multipart upload: ${errorText}`);
    }

    const completeData = await completeRes.json();
    public_url = completeData.public_url || public_url;

    return NextResponse.json(
      {
        message: "File uploaded successfully",
        file_url: public_url,
        object_key,
      },
      { status: 201 }
    );
  } catch (error) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/abort_multipart_upload/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `JWT ${accessToken}` },
      body: JSON.stringify({ object_key, upload_id })
    });
    throw error;
  }
}
