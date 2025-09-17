// /api/auth/register.ts
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, DjoserErrorResponse, registerSuccessResponse } from "@/app/store/authSlice";

export async function POST(req: NextRequest) {
  try {
    const { first_name, last_name, username, email, password, re_password } = await req.json();

    const body = JSON.stringify({ first_name, last_name, username, email, password, re_password });

    const apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/`, {
      method: "POST",
      headers: { 
        "Accept": "application/json",
        "Content-Type": "application/json" 
      },
      body,
    });

    const contentType = apiRes.headers.get("content-type");
    let data: registerSuccessResponse | DjoserErrorResponse | string;

    if (contentType?.includes("application/json")) {
      data = await apiRes.json() as registerSuccessResponse | DjoserErrorResponse;
    } else {
      data = await apiRes.text();
    }

    if (apiRes.ok && typeof data !== "string") {
      const response: ApiResponse<registerSuccessResponse> = {
        success: true,
        data: data as registerSuccessResponse,
      };
      return NextResponse.json(response, { status: 201 });
    } else {
      const errorResponse: ApiResponse = {
        success: false,
        error: typeof data === "string"
          ? { detail: data }
          : ("email" in data || "username" in data || "password" in data)
            ? data as DjoserErrorResponse
            : { detail: "Unknown error occurred" }
      };

      return NextResponse.json(errorResponse, { status: apiRes.status });
    }
  } catch (err: unknown) {
    console.error("Registration error:", err);

    const errorResponse: ApiResponse = {
      success: false,
      error: "Something went wrong when registering for an account"
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
