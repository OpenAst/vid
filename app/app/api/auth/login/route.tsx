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

    let data;
    try {
      data = await apiRes.json();
    } catch (err) {
      console.log("Error", err);
      const text = await apiRes.text();
      console.error('Non-JSON error response from backend:', text);
      return new Response(
        JSON.stringify({ error: 'Unexpected server response', detail: text }),
        {
          status: apiRes.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (apiRes.ok) {
      const headers = new Headers();

      headers.append(
        'Set-Cookie',
        `access=${data.access}; HttpOnly; Secure=${process.env.NODE_ENV !== 'development'}; Max-Age=${60 * 60 * 2}; SameSite=Strict; Path=/`
      );

      headers.append(
        'Set-Cookie',
        `refresh=${data.refresh}; HttpOnly; Secure=${process.env.NODE_ENV !== 'development'}; Max-Age=${60 * 60 * 24 * 5}; SameSite=Strict; Path=/`
      );

      try {
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
      } catch (e) {
        console.warn('CSRF token fetch failed:', e);
      }

      headers.append('Content-Type', 'application/json');

      return new Response(
        JSON.stringify({ success: 'Logged in successfully' }),
        { status: 200, headers }
      );
    } else {
      let errorMessage = 'Authentication failed.';

      if (data.detail) {
        errorMessage = data.detail;
      } else if (data.error) {
        errorMessage = data.error;
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: apiRes.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Fetch error:', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Server is unreachable.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
