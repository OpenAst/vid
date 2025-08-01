import { cookies }from 'next/headers';

export async function POST() {
  const cookiesStore = await cookies();
  const access = cookiesStore.get('access')?.value;
  
  if (!access) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized'
      }),
      {status: 401, headers: {'Content-Type': 'application/json'}}
    );
  }
  try {
    const apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/jwt/verify/`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `JWT ${access}`
      },
      body: JSON.stringify({ token: access})
    });

    const data = await apiRes.json();

    if (apiRes.ok) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(
        JSON.stringify({ error: data.error || 'Failed to verify account' }),
        { status: apiRes.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Fetch user details error:', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong when fetching user details' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}