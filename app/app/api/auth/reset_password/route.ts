import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {  

  const { current_password, new_password, re_new_password } = await req.json();

  const body = JSON.stringify({
    current_password, new_password, re_new_password
  });
  const cookiesStore = await cookies();
  const access = cookiesStore.get('access')?.value;

  if (!access) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  
  try {
    const apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/set_password/`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `JWT ${access}`
      },
      body: body,
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