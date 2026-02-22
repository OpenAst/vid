import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { access, refresh } = await req.json();

    if (!access || !refresh) {
        return NextResponse.json({ error: 'Tokens missing' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });

    // Set Access Token
    response.cookies.set('access', access, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: 60 * 60 * 24, // 1 day
        sameSite: 'strict',
        path: '/',
    });

    // Set Refresh Token
    response.cookies.set('refresh', refresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'strict',
        path: '/',
    });

    try {
        const csrfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/csrf/`, {
            method: 'GET',
            credentials: 'include',
        });

        const setCookieHeaders = csrfRes.headers.getSetCookie?.() || csrfRes.headers.get('Set-Cookie');
        if (setCookieHeaders) {
            const cookieString = Array.isArray(setCookieHeaders) ?
                setCookieHeaders.find(cookie => cookie.startsWith('csrftoken=')) : setCookieHeaders;

            if (cookieString) {
                const tokenMatch = cookieString.match(/csrftoken=([^;]+)/);
                const csrfToken = tokenMatch?.[1];

                if (csrfToken) {
                    response.cookies.set('csrftoken', csrfToken, {
                        httpOnly: false,
                        secure: process.env.NODE_ENV !== 'development',
                        sameSite: 'strict',
                        path: '/',
                    });
                }
            }
        }
    } catch (err) {
        console.warn("Failed to set CSRF token", err);
    }

    return response;
}
