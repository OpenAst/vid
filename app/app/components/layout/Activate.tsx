'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import { activate } from '@/app/store/authSlice';
import toast from 'react-hot-toast';

const ActivatePage = () => {
  const { uid, token } = useParams() as { uid: string; token: string };
  const router = useRouter();
  const dispatch: AppDispatch = useDispatch();
  const { isLoading, isError } = useSelector((state: RootState) => state.auth);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    if (uid && token) {
      dispatch(activate({ uid, token }))
        .unwrap()
        .then(() => {
          setIsActivated(true);
          toast.success('Account activated! Redirecting to login...');
          setTimeout(() => router.push('/(auth)/login'), 2000);
        })
        .catch(() => {
          setIsActivated(false);
          toast.error('Verification failed. Token may be invalid or expired.');
        });
    }
  }, [uid, token, dispatch, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-xl font-semibold mb-4">Account Verification</h2>
      {isLoading && <p>Verifying...</p>}
      {!isLoading && isError && <p className="text-red-500">Verification failed. Try again.</p>}
      {!isLoading && !isError && isActivated && (
        <p className="text-green-600">Verification successful! Redirecting...</p>
      )}
    </div>
  );
};

export default ActivatePage;
