import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  
  const { first_name, last_name, email, password, re_password } = await req.json();

  const body = JSON.stringify({
      first_name,
      last_name,
      email,
      password,
      re_password,
  });

  try {
    const apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/`, {
      method: 'POST',
      headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
      },
      body: body,
    });
    const data = await apiRes.json();

    if(apiRes.ok) {
      return new Response(JSON.stringify({
        success: data.success
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(
        JSON.stringify({
          error: data.error || 'Registration failed'
        }),
        { status: apiRes.status, headers: { 'Content-Type': 'application/json' }}
      );
    }
  } catch (err) {
    console.error('Registration error:', err);
    return new Response(
      JSON.stringify({
        error: 'Something went wrong when registering for an account',
      }),
      { status: 500, headers: {'Content-Type': 'application/json'}}
    );
  } 

}
