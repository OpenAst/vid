import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function middleware(req: NextRequest) {
  const cookiesStore = await cookies()
  const token = cookiesStore.get('access')?.value
  console.log("Token is being sent", token);
  const protectedRoutes = ['/dashboard', '/profile'];

  if (!token && protectedRoutes.includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();

}

export const config = {
  matcher: ['/dashboard', '/profile'],
}