'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store/store';
import { register, resetError } from '@/app/store/authSlice';
import Link from 'next/link';
import Image from 'next/image';
import { toast, ToastContainer } from 'react-toastify';
import { DjoserErrorResponse } from '@/app/store/authSlice';

const FALLBACK_REGISTER_ERROR = 'Unable to create account right now. Please try again.';

function cleanErrorMessage(message: string) {
  const trimmed = message.trim();
  const looksLikeDebugDump =
    trimmed.length > 240 ||
    trimmed.includes('CELERY_') ||
    trimmed.includes('CSRF_') ||
    trimmed.includes('Traceback') ||
    trimmed.includes('<html');

  return looksLikeDebugDump ? FALLBACK_REGISTER_ERROR : trimmed;
}

function getRegisterErrorMessages(error: unknown) {
  const isDjoserError = (err: unknown): err is DjoserErrorResponse =>
    typeof err === 'object' && err !== null;

  if (typeof error === 'string') {
    return [cleanErrorMessage(error)];
  }

  if (!isDjoserError(error)) {
    return ['An unexpected error occurred.'];
  }

  const messages: string[] = [];
  for (const key of ['username', 'email', 'password', 're_password', 'non_field_errors'] as const) {
    const value = error[key];
    if (Array.isArray(value) && typeof value[0] === 'string') {
      messages.push(cleanErrorMessage(value[0]));
    }
  }

  if (typeof error.detail === 'string') {
    messages.push(cleanErrorMessage(error.detail));
  }

  return messages.length > 0 ? messages : [FALLBACK_REGISTER_ERROR];
}

const RegisterPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(resetError());
  }, [dispatch]);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingEmail(true);

    try {
      const res = await fetch(`/api/auth/check_email/?email=${formData.email}`);
      const data = await res.json();

      if (res.ok) {
        if (data.exists) {
          console.log('Response', data);
          toast.error('Email is already registered.');
        } else {
          setStep(2);
        }
      } else {
        toast.error(data?.detail || "Failed to validate email.")
      }
    } catch (err) {
      toast.error('Failed to validate email. Please try again later.');
      console.error('Email check error:', err);
    } finally {
      setIsCheckingEmail(false);
    }

  }

  const isBusy = isCheckingEmail || isSubmitting;

  const togglePassword = () => setShowPassword(!showPassword);
  const inputClass = "h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[rgb(68,13,156)] focus:ring-4 focus:ring-purple-100";
  const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    };

    setIsSubmitting(true);

    try {
      await dispatch(
        register({
          first_name: formData.firstname,
          last_name: formData.lastname,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          re_password: formData.confirmPassword,
        })
      ).unwrap();

      router.push(`/check-email?email=${encodeURIComponent(formData.email)}`);
    } catch (error) {
      getRegisterErrorMessages(error).forEach((message) => toast.error(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-950 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
      <section className="relative overflow-hidden bg-[#05070d] px-5 py-8 text-white sm:px-8 lg:min-h-screen lg:px-14 lg:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_22%,rgba(68,13,156,0.4),transparent_34%),radial-gradient(circle_at_80%_36%,rgba(0,255,64,0.16),transparent_32%)]" />

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
                Join
                <span className="block">the circle</span>
                <span className="block bg-gradient-to-r from-green-300 via-purple-300 to-[rgb(68,13,156)] bg-clip-text text-transparent">
                  worth watching.
                </span>
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300 sm:text-base">
                Create your profile, follow creators, and save the moments that feel like you.
              </p>
            </div>

            <div className="relative hidden min-h-[500px] lg:block">
              <div className="absolute left-12 top-4 h-[440px] w-[250px] overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950 shadow-2xl shadow-purple-950/40">
                <Image
                  src="/auth-hero-creators.jpg"
                  alt="Creators sharing moments on OneClyq"
                  fill
                  sizes="250px"
                  priority
                  className="object-cover object-center"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-100/80">New creator</p>
                  <p className="mt-1 text-2xl font-bold">Your first clip</p>
                  <p className="mt-1 text-sm text-white/75">Build a space people remember.</p>
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
                    <p className="truncate text-sm font-semibold">@you</p>
                    <p className="text-xs text-white/60">Creator mode</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-purple-300/20 px-2 py-1 text-[11px] font-medium text-purple-100">music</span>
                  <span className="rounded-full bg-green-300/20 px-2 py-1 text-[11px] font-medium text-green-100">story</span>
                </div>
              </div>

              <div className="absolute right-8 bottom-24 flex h-16 w-16 items-center justify-center rounded-full bg-green-400 text-3xl text-slate-950 shadow-xl shadow-green-950/30">+</div>
              <div className="absolute bottom-8 left-36 rounded-[1.5rem] border border-white/20 bg-white/[0.14] px-4 py-3 shadow-2xl shadow-black/35 backdrop-blur-2xl ring-1 ring-white/10">
                <p className="text-sm font-semibold">Start with one moment</p>
                <p className="mt-1 text-xs text-white/60">Find your people from there.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-[58vh] items-center justify-center overflow-hidden bg-[linear-gradient(135deg,rgba(68,13,156,0.08),rgba(0,255,64,0.06),rgba(255,255,255,0.96))] px-5 py-10 sm:px-8 lg:min-h-screen lg:px-12">
        <div className="absolute inset-8 rounded-[3rem] border border-white/70 bg-white/35 shadow-2xl shadow-purple-950/10 backdrop-blur-3xl" aria-hidden="true" />
        <div className="relative w-full max-w-md rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-2xl shadow-purple-950/10 backdrop-blur-2xl ring-1 ring-purple-950/5 sm:p-7">
          <p className="text-sm font-medium text-[rgb(68,13,156)]">Create account</p>
          <h2 className="mt-3 text-3xl font-bold">Sign up for OneClyq</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Step {step} of 2. Activation email comes next, so use an inbox you can open.
          </p>

          <div className="mt-6 flex gap-2">
            <span className="h-2 flex-1 rounded-full bg-[rgb(68,13,156)]" />
            <span className={`h-2 flex-1 rounded-full ${step === 2 ? 'bg-[rgb(68,13,156)]' : 'bg-slate-200'}`} />
          </div>

          <form onSubmit={step === 1 ? handleNext : handleSubmit} className="mt-8 space-y-4">
            {step === 1 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>First name</label>
                  <input
                    type="text"
                    name="firstname"
                    placeholder="First name"
                    value={formData.firstname}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Last name</label>
                  <input
                    type="text"
                    name="lastname"
                    placeholder="Last name"
                    value={formData.lastname}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Email address</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Username</label>
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`${inputClass} pr-12`}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePassword}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-900"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Confirm password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={inputClass}
                    minLength={6}
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-14 rounded-full border border-slate-300 px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                className="h-14 flex-1 rounded-full bg-[rgb(68,13,156)] text-base font-bold text-white shadow-lg shadow-purple-900/25 transition hover:bg-[rgb(84,22,180)] active:scale-[0.99] disabled:opacity-75"
                disabled={isBusy}
              >
                {isBusy ? (
                  <span className="loading loading-spinner loading-sm">
                    {isCheckingEmail ? 'Checking email' : 'Creating account'}
                  </span>
                ) : step === 1 ? (
                  'Continue'
                ) : (
                  'Create account'
                )}
              </button>
            </div>

            <p className="pt-2 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-[rgb(68,13,156)] hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </section>
      <ToastContainer />
    </main>
  );
};

export default RegisterPage;
