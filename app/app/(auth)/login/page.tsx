'use client';

import React, { useEffect, useState } from 'react';
import { fetchUser, login } from '@/app/store/authSlice';
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
  const { isLoading, isError, isAuthenticated, isBootstrapped } = useSelector((state: RootState) => state.auth);
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

      await dispatch(fetchUser()).unwrap();

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
    if (mounted && isBootstrapped && isAuthenticated) {
      router.replace('/');
    }
  }, [mounted, isBootstrapped, isAuthenticated, router]);

  if (!mounted || !isBootstrapped || isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-slate-950">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-950 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
      <section className="relative overflow-hidden bg-[#05070d] px-5 py-8 text-white sm:px-8 lg:min-h-screen lg:px-14 lg:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(68,13,156,0.38),transparent_34%),radial-gradient(circle_at_78%_32%,rgba(0,255,64,0.16),transparent_32%)]" />

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
              <p className="mt-1 text-sm font-medium text-purple-100/80">Watch. Discover. Connect.</p>
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:mt-auto lg:grid-cols-[0.78fr_1fr] lg:items-center">
            <div>
              <h1 className="text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
                Find
                <span className="block">the clips</span>
                <span className="block bg-gradient-to-r from-green-300 via-purple-300 to-[rgb(68,13,156)] bg-clip-text text-transparent">
                  you love.
                </span>
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300 sm:text-base">
                Sign in to catch fresh videos, follow creators, and keep your favorite moments close.
              </p>
            </div>

            <div className="relative hidden min-h-[500px] lg:block">
              <div className="absolute left-12 top-4 h-[440px] w-[250px] overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950 shadow-2xl shadow-purple-950/40">
                <Image
                  src="/auth-hero-creators.jpg"
                  alt="People smiling together on OneClyq"
                  fill
                  sizes="250px"
                  priority
                  className="object-cover object-center"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-100/80">Featured creator</p>
                  <p className="mt-1 text-2xl font-bold">Real moments</p>
                  <p className="mt-1 text-sm text-white/75">Watch people share what they love.</p>
                </div>
              </div>

              <div className="absolute left-0 top-36 w-44 rounded-[1.75rem] border border-white/20 bg-white/[0.14] p-3 shadow-2xl shadow-black/35 backdrop-blur-2xl ring-1 ring-white/10">
                <div className="flex items-center gap-2">
                  <Image
                    src="/user_icon.png"
                    alt=""
                    width={34}
                    height={34}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">@creator</p>
                    <p className="text-xs text-white/60">Active now</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-purple-300/20 px-2 py-1 text-[11px] font-medium text-purple-100">dance</span>
                  <span className="rounded-full bg-green-300/20 px-2 py-1 text-[11px] font-medium text-green-100">style</span>
                </div>
              </div>

              <div className="absolute right-8 bottom-24 flex h-16 w-16 items-center justify-center rounded-full bg-green-400 text-3xl text-slate-950 shadow-xl shadow-green-950/30">♥</div>
              <div className="absolute bottom-8 left-36 rounded-[1.5rem] border border-white/20 bg-white/[0.14] px-4 py-3 shadow-2xl shadow-black/35 backdrop-blur-2xl ring-1 ring-white/10">
                <p className="text-sm font-semibold">12k clips shared</p>
                <p className="mt-1 text-xs text-white/60">Find someone worth following.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-[58vh] items-center justify-center overflow-hidden bg-[linear-gradient(135deg,rgba(68,13,156,0.08),rgba(0,255,64,0.06),rgba(255,255,255,0.96))] px-5 py-10 sm:px-8 lg:min-h-screen lg:px-12">
        <div className="absolute inset-8 rounded-[3rem] border border-white/70 bg-white/35 shadow-2xl shadow-purple-950/10 backdrop-blur-3xl" aria-hidden="true" />
        <div className="relative w-full max-w-md rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-2xl shadow-purple-950/10 backdrop-blur-2xl ring-1 ring-purple-950/5 sm:p-7">
          <div className="mb-8 lg:hidden">
            <p className="text-sm font-medium text-[rgb(68,13,156)]">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold">Log in to OneClyq</h2>
          </div>

          <div className="hidden lg:block">
            <p className="text-sm font-medium text-[rgb(68,13,156)]">Welcome back</p>
            <h2 className="mt-3 text-3xl font-bold">Log in to OneClyq</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Your feed, creator circle, and conversations are waiting.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-base outline-none transition focus:border-[rgb(68,13,156)] focus:ring-4 focus:ring-purple-100"
              type="email"
              placeholder="Email address"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-base outline-none transition focus:border-[rgb(68,13,156)] focus:ring-4 focus:ring-purple-100"
              type="text"
              placeholder="Username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <div className="relative">
              <input
                className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 pr-12 text-base outline-none transition focus:border-[rgb(68,13,156)] focus:ring-4 focus:ring-purple-100"
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
              className={`h-14 w-full rounded-full bg-[rgb(68,13,156)] text-base font-bold text-white shadow-lg shadow-purple-900/25 transition hover:bg-[rgb(84,22,180)] active:scale-[0.99] ${isLoadingUi ? 'opacity-75' : ''}`}
              disabled={isLoadingUi}
            >
              {isLoadingUi ? (
                <span className="loading loading-spinner loading-sm">Signing in</span>
              ) : (
                'Log in'
              )}
            </button>

            <div className="flex items-center gap-4 rounded-2xl border border-white/70 bg-white/45 px-3 py-2 text-sm font-medium text-slate-400 backdrop-blur-xl">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgb(68,13,156)]/25 to-slate-200" />
              or
              <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[rgb(0,255,64)]/35 to-slate-200" />
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
              <Link className="font-bold text-[rgb(68,13,156)] hover:underline" href="/register">
                Sign up
              </Link>
            </p>
            <p>
              Forgot your password?{' '}
              <Link className="font-bold text-[rgb(68,13,156)] hover:underline" href="/password-reset">
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
