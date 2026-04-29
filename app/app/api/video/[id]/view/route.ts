import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: videoId } = await params;
        const accessToken = req.cookies.get('access')?.value;
        const csrfToken = req.cookies.get('csrftoken')?.value;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (accessToken) {
            headers.Authorization = `JWT ${accessToken}`;
        }

        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/${videoId}/view/`, {
            method: "POST",
            headers,
            credentials: 'include',
        });

        if (!response.ok) {
            const errText = await response.text();
            return NextResponse.json({ error: 'Backend error', detail: errText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (err) {
        console.error('[Proxy] Error in video view proxy:', err);
        return NextResponse.json(
            { error: 'Failed to record view', detail: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}
