'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MailCheck } from 'lucide-react';

const CheckEmailContent = () => {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [statusMessage, setStatusMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  const resendActivation = async () => {
    if (!email || isResending) return;

    setIsResending(true);
    setStatusMessage('');
    try {
      const response = await fetch('/api/auth/resend-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null);
      setStatusMessage(data?.detail || (response.ok ? 'Activation email sent.' : 'Unable to resend activation email.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-100 px-4 py-10 text-base-content">
      <section className="w-full max-w-md rounded-2xl border border-base-300 bg-base-100 px-6 py-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-[rgb(68,13,156)]">
          <MailCheck size={30} />
        </div>

        <h1 className="mt-5 text-2xl font-bold">Check your email</h1>
        <p className="mt-3 text-sm leading-6 text-base-content/65">
          We sent an activation link{email ? ' to' : ' to your inbox'}. Open the email and click the link to activate your account before logging in.
        </p>

        {email && (
          <p className="mt-3 break-words rounded-xl bg-base-200 px-3 py-2 text-sm font-semibold text-base-content">
            {email}
          </p>
        )}

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm leading-6 text-amber-800">
          If you do not see it, check your spam or promotions folder. The link can take a minute to arrive and expires after 48 hours.
        </div>

        {statusMessage && (
          <p className="mt-4 rounded-xl bg-base-200 px-4 py-3 text-sm text-base-content/75">
            {statusMessage}
          </p>
        )}

        <div className="mt-6 grid gap-3">
          {email && (
            <button
              type="button"
              onClick={() => void resendActivation()}
              disabled={isResending}
              className="btn btn-outline w-full"
            >
              {isResending ? 'Sending...' : 'Resend activation email'}
            </button>
          )}
          <Link href="/login" className="w-full rounded-full bg-[rgb(68,13,156)] px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-purple-900/20 transition hover:bg-[rgb(84,22,180)]">
            Go to login
          </Link>
          <Link href="/register" className="btn btn-ghost w-full">
            Use a different email
          </Link>
        </div>
      </section>
    </main>
  );
};

const CheckEmailPage = () => (
  <Suspense fallback={null}>
    <CheckEmailContent />
  </Suspense>
);

export default CheckEmailPage;
