'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import { verify } from '@/app/store/authSlice';

const VerifyPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch: AppDispatch = useDispatch();
  const { isLoading, isError } = useSelector((state: RootState) => state.auth);
  const [isVerified, setIsVerified] = useState(false);

  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  useEffect(() => {
    if (uid && token) {
      dispatch(verify({ uid, token }))
        .unwrap()
        .then(() => {
          setIsVerified(true);
          setTimeout(() => router.push('/login'), 2000);
        })
        .catch(() => setIsVerified(false));
    }
  }, [uid, token, dispatch, router]);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen mt-4">
      <h2 className="text-xl font-semibold mb-4 justify-start ">Account Verification</h2>
      {isLoading && <p>Verifying...</p>}
      {!isLoading && isError && <p className="text-red-500">Verification failed. Try again.</p>}
      {!isLoading && !isError && isVerified && (
        <p className="text-green-600">Verification successful! Redirecting...</p>
      )}
    </div>
  );
};

export default VerifyPage;
