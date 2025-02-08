'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation'; 
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import { verify } from '@/app/store/authSlice';

const VerifyPage = () => {
  const router = useRouter();

  const [verify, { isLoading, isError, isSuccess }] = useVerifyMutation();

  const handleVerification = async () => {
    if (!uid || !token) {
      alert("Invalid verification link!");
      return;
    }

    try {
      await verify({ uid, token }).unwrap();
      alert("Account activated successfully !");
      
      router.push('/login');
    } catch (error) {
      console.error('Verification failed:', error);
      alert('Activation failed. Please try again later.');
    }
  };

  return (
    <div>
      <h1>Verify Your Account</h1>
      {isLoading ? (
        <p>Verifying...</p>
      ) : isSuccess ? (
        <p>Account successfully activated! Redirecting...</p>
      ) : (
        <button onClick={handleVerification}>Activate Account</button>
      )}
      {isError && <p>There was an error activating your account.</p>}
    </div>
  )
}

export default VerifyPage;