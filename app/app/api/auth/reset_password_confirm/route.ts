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

  const data = await res.json();

  if (!res.ok) {
    // Forward the specific error from Django if possible
    throw new Error(JSON.stringify(data) || 'Failed to verify account');
  }

  return NextResponse.json(data);
}