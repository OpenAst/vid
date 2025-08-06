import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  const csrfToken = req.cookies.get('csrftoken')?.value;
  const accessToken = req.cookies.get('access')?.value;

  if (!accessToken) {
    return NextResponse.json(
    { error: "Authentication failed"},
    { status: 401 }
    )
  }

  const { title, description, file_url } = await req.json();

  const body = JSON.stringify({
    title,
    description,
    file_url
  });

  
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/save-metadata/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `JWT ${accessToken}`,
        ...(csrfToken && { 'X-CSRFToken': csrfToken}),
      },
      body: body,
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Metadata upload failed', 
        details: data}, 
        {status: res.status });
    }
    console.log('Upload response', data);

    return NextResponse.json(data, { status: 201 });
  } catch (err ) {
    const errorMessage = typeof err === "object" && err !== null && "message" in err
      ? (err as { message?: string }).message
      : "Internal server error";
    return NextResponse.json(
      { error: errorMessage || "Internal server error" },
      { status: 500 }
    );
  }
}