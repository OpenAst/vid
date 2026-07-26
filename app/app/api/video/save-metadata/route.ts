import { NextRequest, NextResponse } from "next/server";

function extractErrorMessage(payload: unknown): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (typeof record.detail === "string" && record.detail.trim()) {
      return record.detail;
    }

    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }

    if (typeof record.details === "string" && record.details.trim()) {
      return record.details;
    }

    for (const value of Object.values(record)) {
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === "string" && first.trim()) {
          return first;
        }
      }
    }
  }

  return "Metadata upload failed";
}

export async function POST(req: NextRequest) {
  const csrfToken = req.cookies.get('csrftoken')?.value;
  const accessToken = req.cookies.get('access')?.value;

  if (!accessToken) {
    return NextResponse.json(
    { error: "Authentication failed"},
    { status: 401 }
    )
  }

  const { title, description, file_url, music_url, skill_category, media_type, file_type } = await req.json();

  const body = JSON.stringify({
    title,
    description,
    skill_category: skill_category || "general",
    media_type: media_type || "video",
    file_url,
    music_url,
    file_type,
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
      const errorMessage = extractErrorMessage(data);
      return NextResponse.json(
        {
          error: errorMessage,
          details: data,
        },
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
