'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';


const PasswordResetPage = () => {
  const [ email, setEmail ] = useState('');
  const [isLoading, setIsLoading ] = useState(false);
  const [isError, setIsError ] = useState(false);
  const [message, setMessage ] = useState('');
  const router = useRouter();
  
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("api/auth/change_password", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        console.log('Password reset successful', response);
        setIsLoading(false);
        setMessage('Redirecting to confirm page...');
        setTimeout(() => router.push('/password-confirm'), 3000);
      } else {
        const data = await response.json();
        setIsError(data.error || 'Failed to send password reset link');
      }
    } catch (error) {
      setIsLoading(false);
      setIsError(true);
      setMessage('Error working with password reset')
      console.error('Error working with password reset', error);
    };
  };

  return (
    <div className='min-h-screen flex
     items-center justify-center'>
      <div className='w-full max-w-md
       bg-white p-8 rounded-lg shadow-lg'>
        <h2 className='text-2xl font-semibold 
        text-center mb-6'>Reset Your Password
        </h2>
        {/* Error or sucess message */}
        {message && (
          <div className={`text-center mb-4 ${isError ? 'text-red-500': 'text-green-500'}`}>
            <p>{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='form-control'>
            <label htmlFor='email' className='block text-sm font-medium'>
              Email
            </label>
            <input
              id='email'
              type='email'
              placeholder='Enter your email'
              className='input input-bordered w-full mt-2'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              className={`w-full p-2 rounded-lg ${isLoading ? 'bg-gray-400' : 'bg-primary-blue'} text-white mt-2`}
              disabled={isLoading}>
                Reset
            </button>  

            <p className='text-center mt-4'>
              Remembered your Password?{' '}
              <Link className='text-blue-500 hover:underline' href="/login">
                Login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
export default PasswordResetPage;