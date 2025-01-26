import { NextRequest } from "next/server";
import cookie from 'cookie';

export async function POST(req: NextRequest) {
  const cookies = cookie.parse(req.headers.get('Cookie') || '');
  const refresh = cookies.refresh;

  if (!refresh) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/jwt/refresh/`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refresh }),
    });

    const data = await res.json();

    if (res.ok) {
      const headers = new Headers();
      headers.append(
        'Set-Cookie',
        cookie.serialize('access', data.access, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development',
          maxAge: 60 * 60,
          sameSite: 'strict',
          path: '/',
        })
      );
      
      return new Response(
        JSON.stringify({
          access: data.access,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          error: data.error || 'Failed to refresh token',
        }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    console.error('Token refresh error:', err);
    return new Response(
      JSON.stringify({
        error: 'Something went wrong while refreshing the token',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
