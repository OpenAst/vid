import { NextRequest } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/check_email/?email=${email}`)
  const data = await res.json();

  return new Response(JSON.stringify(data), {
    headers: {'Content-Type': 'application-json'},
    status: res.status,
  })
}