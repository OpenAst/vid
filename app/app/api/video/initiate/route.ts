import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {

  const accessToken = req.cookies.get('access')?.value;
  const csrfToken = req.cookies.get('csrftoken')?.value;


  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { file_name, file_type } = await req.json()

  // 1️ Initiate multipart upload
  const initRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/initiate_multipart_upload/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `JWT ${accessToken}`,
      ...(csrfToken && { 'X-CSRFToken': csrfToken }),
    },
    body: JSON.stringify({ file_name, file_type }),
  });

  if (!initRes.ok) {
  const errorText = await initRes.text();
  return NextResponse.json({ error: errorText }, { status: 400 });
  }


  const initData = await initRes.json();
  return NextResponse.json(initData, { status: 200 });

}
