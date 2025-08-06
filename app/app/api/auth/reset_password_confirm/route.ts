import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {

  const {uid, token, newPassword, reNewPassword } = await req.json();

  const cookiesStore = await cookies()
  const accessToken = cookiesStore.get('access')?.value

  if (!accessToken) {
    return new Response(
      JSON.stringify({error: 'Unauthorized'}),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/reset_password_confirm/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      { uid, token, new_password: newPassword , 
        re_new_password: reNewPassword}
    ),
  });

  const data = res.json();
  if (!res.ok) {
    throw new Error('Failed to verify account');
  }
  return data;
}