import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    
    const url = new URL(req.url);
    const username = url.searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/${username}/`, {
      method: "GET",
      headers: {
        Authorization: `JWT ${req.cookies.get('access')?.value}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          error: "User not found"
        }, {
          status: 404
        });
      }
      throw new Error("Failed to fetch user profile");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return NextResponse.json(
      { error: "Something went wrong when fetching user profile" },
      { status: 500 }
    );
  }
}
