'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setAuthenticated, fetchUser } from '@/app/store/authSlice';
import { AppDispatch } from '@/app/store/store';
import { toast } from 'react-toastify';

export default function GoogleAuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch<AppDispatch>();
    const attemptedRef = useRef(false);

    useEffect(() => {
        const state = searchParams.get('state');
        const code = searchParams.get('code');

        if (!state || !code) {
            router.push('/login');
            return;
        }

        if (attemptedRef.current) return;
        attemptedRef.current = true;

        const authenticate = async () => {
            try {
                const formData = new URLSearchParams();
                formData.append('state', state);
                formData.append('code', code);

                // Important: Djoser might expect format 'json' or 'form-data' depending on version, 
                // but standard Djoser uses form-data for social.
                // However, adding redirect_uri is safer.
                formData.append('redirect_uri', `${window.location.origin}/auth/google`);

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/o/google-oauth2/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    credentials: 'include',
                    body: formData.toString(),
                });

                if (res.ok) {
                    const data = await res.json();
                    // Data should contain access and refresh tokens
                    // dispatch(setCredentials({...})) 
                    // Note: configure setCredentials to accept payload or verify what data djoser returns (usually { access, refresh })

                    // Since setCredentials might expect a different format or handle storage, let's look at authSlice.
                    // For now, assuming standard Djoser JWT response

                    // But wait, Djoser social login usually sets cookies if configured, OR returns tokens. 

                    // 1. Send tokens to Next.js API to set cookies
                    const setCookieRes = await fetch('/api/auth/set-tokens', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            access: data.access,
                            refresh: data.refresh
                        })
                    });

                    if (setCookieRes.ok) {
                        dispatch(setAuthenticated(true));
                        dispatch(fetchUser());
                        router.push('/');
                        toast.success('Logged in with Google successfully!');
                    } else {
                        throw new Error('Failed to set session cookies');
                    }
                } else {
                    console.error('Social auth failed', await res.text());
                    toast.error('Failed to log in with Google.');
                    router.push('/login');
                }
            } catch (err) {
                console.error('Social auth error', err);
                toast.error('An error occurred during Google login.');
                router.push('/login');
            }
        };

        authenticate();
    }, [searchParams, router, dispatch]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-lg shadow-md">
                <div className="flex flex-col items-center">
                    <div className="loading loading-spinner loading-lg text-primary"></div>
                    <p className="mt-4 text-gray-600">Authenticating with Google...</p>
                </div>
            </div>
        </div>
    );
}
