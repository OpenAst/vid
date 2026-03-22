import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { uid, token, new_password, re_new_password } = await req.json();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/reset_password_confirm/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      token,
      new_password,
      re_new_password
    }),
  });

  // Django returns 204 No Content on success — don't try to parse an empty body
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.detail || data?.token?.[0] || JSON.stringify(data) || 'Failed to reset password' },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}