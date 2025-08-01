import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData(); 
    const csrfToken = req.cookies.get('csrftoken')?.value;

    if (!csrfToken) {
      throw new Error('CSRF token is missing');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/profile/update/`, {
      method: "PUT",
      headers: {
        Authorization: `JWT ${req.cookies.get('access')?.value}`,
        'X-CSRFToken': csrfToken, 
      },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (err) {
    console.log('Error working with update', err);
    return NextResponse.json(
      {
        error: 'Something went wrong when updating the profile',
      },
      { status: 500, headers: {'Content-Type': 'application/json'}}
    );
  }
}
