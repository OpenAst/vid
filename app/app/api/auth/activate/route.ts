import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { uid, token } = await req.json();

  const body = JSON.stringify({ uid, token });

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/activation/`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body,
    });
    
    const data = await res.json();

    if (res.ok) {
      return new Response(JSON.stringify({ success: true, data }), 
        {
          status: res.status, 
          headers: { 'Content-Type': 'application/json'},
        }
    );
    }
  } catch (error) {
      console.log("Error:", error);
      return new Response(
        JSON.stringify({ success: false, error: 'Something went wrong on the server' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
  }
}