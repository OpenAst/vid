import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access')?.value;
    const csrfToken = req.cookies.get('csrftoken')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
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

    // 4. Get presigned URL from Django
    const presignedRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/videos/get_presigned_url/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `JWT ${accessToken}`, 
          ...(csrfToken && {'X-CSRFToken': csrfToken}),
        },
        body: JSON.stringify({
          file_name: file.name,
          file_type: file.type,
        }),
      }
    );

    if (!presignedRes.ok) {
      const errorText = await presignedRes.text();
      throw new Error(`Presigned URL failed: ${errorText}`);
    }
    const { url, object_key, public_url } = await presignedRes.json();
    console.log("Presigned URL, object_key and public_url:", url, object_key, public_url);

    // 5. Upload to R2
    const uploadRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'x-amz-acl': 'public-read',
      },
      body: file,
    });
    
    if (!uploadRes.ok) {
      throw new Error(`R2 upload failed with status ${uploadRes.status}`);
    }
    console.log("The response from R2:", uploadRes);

    return NextResponse.json({ 
      message: "File uploaded successfully",
      file_url: public_url,
      object_key,
      },
      {status: 201}
    );
    
  } catch (error) {
    const errorMessage = typeof error === "object" && error !== null && "message" in error
    ? (error as { message?: string }).message 
    : "Internal error";
    console.error('Upload error:', error);
    return NextResponse.json(
      {error: errorMessage || "Internal error"},
      { status: 500 }
    );
  };
}