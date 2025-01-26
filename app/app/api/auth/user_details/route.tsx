import { cookies } from "next/headers";

export async function GET() {
  const cookiesStore = await cookies();
  const token = cookiesStore.get('access')?.value;
  
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/me/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `JWT ${token}`
      }
    });

    const data = await apiRes.json();

    if (apiRes.ok) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(
        JSON.stringify({ error: data.error || 'Failed to fetch user details' }),
        { status: apiRes.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    console.error('Fetch user details error:', err);
    return new Response(
      JSON.stringify({ error: 'Something went wrong when fetching user details' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}