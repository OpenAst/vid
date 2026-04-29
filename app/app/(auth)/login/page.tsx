'use client';

import React, { useEffect, useState } from 'react';
import { login } from '@/app/store/authSlice';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import Link from 'next/link';
import Image from 'next/image';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import SocialButton from '../../components/auth/SocialButton';

const LoginPage = () => {

  interface ApiError {
    status?: number;
    message?: string;
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);


  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, isError, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const isLoadingUi = mounted ? isLoading : false;

  interface AuthErrorResponse {
    email?: string;
    username?: string;
    password?: string;
    detail?: string;
    error?: string;
    status?: number;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const res = await dispatch(login({ email, password, username })).unwrap();
      console.log('Login successful:', res);


      window.history.replaceState(null, '/');
      router.replace('/');
      toast.success('Login successful.');

    } catch (err: unknown) {
      console.log("Error during login:", err);

      const defaultMsg = 'Your login credentials are incorrect. Please try again.';

      if (typeof err === 'object' && err !== null) {
        const e = err as AuthErrorResponse;
        console.log(e);

        if (e.email) {
          setErrorMessage(`Email Error: ${e.email}`);
        } else if (e.username) {
          setErrorMessage(`Username Error: ${e.username}`);
        } else if (e.password) {
          setErrorMessage(`Password Error: ${e.password}`);
        } else if (e.detail) {
          setErrorMessage(e.detail);
        } else if ('error' in e) {
          setErrorMessage(e.error as string);
        } else {
          setErrorMessage(defaultMsg);
        }
      } else {
        setErrorMessage(defaultMsg);
      }

      const apiErr = (typeof err === 'object' && err !== null) ? err as ApiError : null;

      if (apiErr?.status === 401) {
        try {
          console.log('Attempting token refresh...');
          const res = await fetch('/api/auth/refresh/', {
            method: 'POST',
            credentials: 'include',
          });

          if (res.ok) {
            const data = await res.json();
            console.log('Token refresh successful:', data);
          } else {
            console.log('Token refresh failed:', await res.text());
          }
        } catch (refreshError) {
          console.log('Token refresh request failed:', refreshError);
        }
      }
    }
  };

  const togglePassword = () => setShowPassword(!showPassword);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      router.replace('/');
    }
  }, [mounted, isAuthenticated, router]);

  return (
    <main className="min-h-screen bg-white text-slate-950 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
      <section className="relative overflow-hidden bg-[#05070d] px-5 py-8 text-white sm:px-8 lg:min-h-screen lg:px-14 lg:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(44,189,255,0.18),transparent_34%),radial-gradient(circle_at_78%_32%,rgba(199,42,255,0.22),transparent_32%)]" />

        <div className="relative mx-auto flex max-w-xl flex-col lg:h-full lg:max-w-none">
          <div className="flex items-center gap-3">
            <Image
              src="/oneclyq.png"
              alt="OneClyq"
              width={72}
              height={72}
              priority
              className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16"
            />
            <div>
              <p className="text-xl font-bold leading-none sm:text-2xl">OneClyq</p>
              <p className="mt-1 text-sm font-medium text-cyan-100/80">Watch. Discover. Connect.</p>
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:mt-auto lg:grid-cols-[0.78fr_1fr] lg:items-center">
            <div>
              <h1 className="text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
                Find
                <span className="block">the clips</span>
                <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
                  you love.
                </span>
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300 sm:text-base">
                Sign in to catch fresh videos, follow creators, and keep your favorite moments close.
              </p>
            </div>

            <div className="relative hidden min-h-[470px] lg:block">
              <div className="absolute left-16 top-8 h-80 w-56 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl shadow-cyan-950/40">
                <div className="h-full bg-gradient-to-br from-fuchsia-500 via-blue-500 to-cyan-300 p-4">
                  <div className="h-1.5 w-20 rounded-full bg-white/75" />
                  <div className="mt-24 rounded-2xl bg-black/30 p-4 backdrop-blur-md">
                    <p className="text-sm font-medium text-white/75">Now playing</p>
                    <p className="mt-2 text-2xl font-bold">Creator stories</p>
                  </div>
                </div>
              </div>

              <div className="absolute left-0 top-40 h-44 w-64 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-xl backdrop-blur-xl">
                <div className="h-28 rounded-2xl bg-gradient-to-br from-slate-200 via-cyan-200 to-fuchsia-300" />
                <div className="mt-3 h-2 w-32 rounded-full bg-white/50" />
                <div className="mt-2 h-2 w-20 rounded-full bg-white/25" />
              </div>

              <div className="absolute bottom-10 left-36 h-28 w-28 rounded-full border-4 border-cyan-300 bg-gradient-to-br from-cyan-300 to-fuchsia-500 shadow-xl shadow-fuchsia-950/50" />
              <div className="absolute right-3 top-32 rounded-2xl bg-fuchsia-500 px-4 py-3 text-sm font-bold shadow-xl">16:45</div>
              <div className="absolute right-8 bottom-28 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-3xl shadow-xl">♥</div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-[58vh] items-center justify-center px-5 py-10 sm:px-8 lg:min-h-screen lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="text-sm font-medium text-blue-600">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold">Log in to OneClyq</h2>
          </div>

          <div className="hidden lg:block">
            <p className="text-sm font-medium text-blue-600">Welcome back</p>
            <h2 className="mt-3 text-3xl font-bold">Log in to OneClyq</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Your feed, creator circle, and conversations are waiting.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              type="email"
              placeholder="Email address"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              type="text"
              placeholder="Username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <div className="relative">
              <input
                className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 pr-12 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={togglePassword}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-900"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {isError && errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className={`h-14 w-full rounded-full bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.99] ${isLoadingUi ? 'opacity-75' : ''}`}
              disabled={isLoadingUi}
            >
              {isLoadingUi ? (
                <span className="loading loading-spinner loading-sm">Signing in</span>
              ) : (
                'Log in'
              )}
            </button>

            <div className="flex items-center gap-4 py-2 text-sm font-medium text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <SocialButton
              provider="google"
              onClick={async () => {
                try {
                  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/google/start/`;

                  window.location.href = backendUrl;
                } catch (err) {
                  console.error(err);
                  toast.error("An error occurred");
                }
              }}
            />
          </form>

          <div className="mt-8 space-y-3 text-center text-sm">
            <p>
              Don&apos;t have an account?{' '}
              <Link className="font-bold text-blue-600 hover:underline" href="/register">
                Sign up
              </Link>
            </p>
            <p>
              Forgot your password?{' '}
              <Link className="font-bold text-blue-600 hover:underline" href="/password-reset">
                Reset password
              </Link>
            </p>
          </div>
        </div>
      </section>

      <ToastContainer />
    </main>
  );
}

export default LoginPage;
