import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const search = searchParams.get("search");
    const username = searchParams.get("username");
    const feed = searchParams.get("feed");
    const category = searchParams.get("category");

    const csrfToken = req.cookies.get('csrftoken')?.value;

    const searchStr = search ? `&search=${encodeURIComponent(search)}` : "";
    const usernameStr = username ? `&username=${encodeURIComponent(username)}` : "";
    const feedStr = feed ? `&feed=${encodeURIComponent(feed)}` : "";
    const categoryStr = category ? `&category=${encodeURIComponent(category)}` : "";
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/?page=${page}&limit=${limit}${searchStr}${usernameStr}${feedStr}${categoryStr}`, {
      method: "GET",
      headers: {
        ...(req.cookies.get('access')?.value && { Authorization: `JWT ${req.cookies.get('access')?.value}` }),
        ...(csrfToken && { 'X-CSRFToken': csrfToken }),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch video');
    }

    const data = await response.json();
    console.log("Videos fetched:", JSON.stringify(data, null, 2));


    return NextResponse.json(data);

  } catch (err) {
    console.log('Error working with fetching', err);
    return NextResponse.json(
      {
        error: 'Something went wrong when fetching video',
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
