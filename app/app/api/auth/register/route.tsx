import { NextRequest } from "next/server";
import type { ApiResponse, DjoserErrorResponse, registerSuccessResponse } from "@/app/store/authSlice";

export async function POST(req: NextRequest) {
  const { first_name, last_name, username, email, password, re_password } = await req.json();

  const body = JSON.stringify({
    first_name,
    last_name,
    username,
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

    const contentType = apiRes.headers.get('content-type');

    let data: registerSuccessResponse | DjoserErrorResponse | string;

    if (contentType?.includes('application/json')) {
      data = await apiRes.json() as registerSuccessResponse | DjoserErrorResponse;
    } else {
       data = await apiRes.text(); 
    }

    if (apiRes.ok) {
      const response: ApiResponse<registerSuccessResponse> = {
        success: true,
        data: data as registerSuccessResponse
      };
      return Response.json(response, { status: 201 });
    } else {
      const errorResponse: ApiResponse = {
        success: false,
        error: typeof data === 'string'
          ? { detail: data }
          : (data && 'email' in data && Array.isArray((data as DjoserErrorResponse).email))
            ? data as DjoserErrorResponse
            : { detail: 'Unknown error occurred' }
      };

      return Response.json(errorResponse, { status: apiRes.status });
    }
  } catch (err) {
    console.error('Registration error:', err);
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Something went wrong when registering for an account'
    };
    return Response.json(errorResponse, { status: 500 });
  }
}
