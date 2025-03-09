import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password, username } = await req.json();

  const body = JSON.stringify({
    email,
    password,
    username,
  });

  try {
    const apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/jwt/create/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: body,
    });

    const data = await apiRes.json();
    console.log('Response', data);

    if (apiRes.ok) {
      const headers = new Headers();

      headers.append(
        'Set-Cookie',
        `access=${data.access}; HttpOnly; Secure=${process.env.NODE_ENV !== 'development'}; Max-Age=3600; SameSite=Strict; Path=/`
      );

      headers.append(
        'Set-Cookie',
        `refresh=${data.refresh}; HttpOnly; Secure=${process.env.NODE_ENV !== 'development'}; Max-Age=${60 * 60 * 24 * 5}; SameSite=Strict; Path=/`
      );

      const csrfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/csrf/`, {
        method: 'GET', 
        credentials: 'include',
      });

      const csrfToken = csrfRes.headers.get('X-CSRFToken');
      if (csrfToken) {
        headers.append(
          'Set-Cookie',
          `csrftoken=${csrfToken}; Secure=${process.env.NODE_ENV !== 'development'}; SameSite=Strict; Path=/`
        );
      }

      headers.append('Content-Type', 'application/json');

      return new Response(
        JSON.stringify({
          success: 'Logged in successfully',
        }),
        {
          status: 200,
          headers: headers,
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          error: data.detail || 'Authentication failed',
        }),
        {
          status: apiRes.status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        error: 'Something went wrong',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
