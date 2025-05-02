'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import { verify } from '@/app/store/authSlice';
import toast from 'react-hot-toast';

type Props = {
  params: {
    uid: string;
    token: string;
  };
};

const ActivatePage = ({ params }: Props) => {
  const { uid, token } = params;
  const router = useRouter();
  const dispatch: AppDispatch = useDispatch();
  const { isLoading, isError } = useSelector((state: RootState) => state.auth);
  const [isVerified, setIsVerified] = useState(false);
  
  useEffect(() => {
    if (uid && token) {
      dispatch(verify({ uid, token }))
        .unwrap()
        .then(() => {
          setIsVerified(true);
          toast.success('Account verified! Redirecting to login...')
          setTimeout(() => router.push('/(auth)/login'), 2000);
        })
        .catch(() => setIsVerified(false));
        toast.error('Verification failed. Token may be invalid or expired.');
    }
  }, [uid, token, dispatch, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-xl font-semibold mb-4">Account Verification</h2>
      {isLoading && <p>Verifying...</p>}
      {!isLoading && isError && <p className="text-red-500">Verification failed. Try again.</p>}
      {!isLoading && !isError && isVerified && (
        <p className="text-green-600">Verification successful! Redirecting...</p>
      )}
    </div>
  );
};

export default ActivatePage;
