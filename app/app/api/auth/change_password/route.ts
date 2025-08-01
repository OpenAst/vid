import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  const body = JSON.stringify({ email })
  
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/reset_password/`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body,
    });
    
    if (res.status === 204) {
      return new NextResponse(
        null,
        { status: 204}
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Error ${res.statusText}: ${res.status}` },
        { status: res.status}
      );
    }

  } catch (error) {
    console.error('Password change error:', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong changing password' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}