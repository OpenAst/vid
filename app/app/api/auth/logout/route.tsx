import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const refresh = req.cookies.get('refresh')?.value;

    if (!refresh) {
      const response = NextResponse.json(
        { error: 'No refresh token found' },
        { status: 400 }
      );

      response.cookies.set('access', '', {
        path: '/',
        httpOnly: true,
        expires: new Date(0),
      });
      response.cookies.set('refresh', '', {
        path: '/',
        httpOnly: true,
        expires: new Date(0),
      });

      return response;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    const data = await res.json();
    console.log('Response data', data);
    
    const response = NextResponse.json({ detail: 'Logged out' });

 
    response.cookies.set('access', '', {
      path: '/',
      httpOnly: true,
      expires: new Date(0),
    });
    response.cookies.set('refresh', '', {
      path: '/',
      httpOnly: true,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error('Logout Error:', error);

    const response = NextResponse.json(
      { error: 'Logout failed. Internal error.' },
      { status: 500 }
    );

    response.cookies.set('access', '', {
      path: '/',
      httpOnly: true,
      expires: new Date(0),
    });
    response.cookies.set('refresh', '', {
      path: '/',
      httpOnly: true,
      expires: new Date(0),
    });

    return response;
  }
}
