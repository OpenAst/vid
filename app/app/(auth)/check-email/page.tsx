'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CheckEmailPage = () => {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => router.push('/login'), 5000);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-xl font-semibold">Check Your Email</h2>
      <p className="mt-2 text-gray-600">
        A verification email has been sent to your inbox. Please click the link to activate your account.
      </p>
    </div>
  );
};

export default CheckEmailPage;
