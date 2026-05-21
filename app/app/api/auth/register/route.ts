// /api/auth/register.ts
import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, DjoserErrorResponse, registerSuccessResponse } from "@/app/store/authSlice";

const GENERIC_REGISTRATION_ERROR = "Unable to create account right now. Please try again.";

function normalizeRegistrationError(data: DjoserErrorResponse | string): DjoserErrorResponse {
  if (typeof data === "string") {
    console.error("Registration backend returned non-JSON response:", data.slice(0, 500));
    return { detail: GENERIC_REGISTRATION_ERROR };
  }

  const allowedKeys = ["email", "username", "password", "re_password", "non_field_errors", "detail"] as const;
  const cleanError: Record<string, string | string[]> = {};

  for (const key of allowedKeys) {
    const value = data[key];
    if (Array.isArray(value)) {
      cleanError[key] = value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.slice(0, 240));
    } else if (typeof value === "string") {
      cleanError[key] = value.slice(0, 240);
    }
  }

  return Object.keys(cleanError).length > 0
    ? cleanError as DjoserErrorResponse
    : { detail: GENERIC_REGISTRATION_ERROR };
}

export async function POST(req: NextRequest) {
  try {
    const { first_name, last_name, username, email, password, re_password } = await req.json();

    const body = JSON.stringify({ first_name, last_name, username, email, password, re_password });
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      console.error("NEXT_PUBLIC_API_URL is not configured for registration.");
      return NextResponse.json(
        { success: false, error: { detail: GENERIC_REGISTRATION_ERROR } } satisfies ApiResponse,
        { status: 500 }
      );
    }

    const apiRes = await fetch(`${apiUrl}/auth/users/`, {
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
        error: normalizeRegistrationError(typeof data === "string" ? data : data as DjoserErrorResponse)
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
