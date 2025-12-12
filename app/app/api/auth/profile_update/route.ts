import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;

  if (!accessToken) {
    return new Response(JSON.stringify({
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json'}
    });
  }

  try {
    const { avatar, first_name,last_name, bio } = await req.json();

    const apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/profile/update/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `JWT ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(
        { 
          avatar, first_name, last_name, bio 
        }),
    });

    const data = await apiRes.json();
    console.log("The updated profile", data);
    
    if (apiRes.ok) {
      return NextResponse.json(data, {
        status: 200,
      });
    } else {
      return new Response(JSON.stringify(data), {
        status: apiRes.status,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (err) {
      console.error("Update user error:", err);
      return new Response(
        JSON.stringify({ error: "Something went wrong while updating profile" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
  }
}