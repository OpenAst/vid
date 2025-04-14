import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData(); 
    const csrfToken = req.cookies.get('csrftoken')?.value;

    if (!csrfToken) {
      throw new Error('CSRF token is missing');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/upload/`, {
      method: "POST",
      headers: {
        Authorization: `JWT ${req.cookies.get('access')?.value}`,
        'X-CSRFToken': csrfToken, 
      },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Upload Error:", errorText);
      throw new Error(`Failed to upload video: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

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
