'use client' 
import React, { useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const ResetPasswordConfirm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState('');
  const [reNewPassword, setReNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("api/auth/reset_password_confirm/", {
        method: 'POST',
        headers: { 'Content-Type': 'applicaton/json'},
        body: JSON.stringify({
          uid,
          token, 
          new_password: newPassword,
          re_new_password: reNewPassword,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset password. Check your email for the link');
      }

      setSuccess("Password reset successful. Redirecting to login...")
      setTimeout(() => router.push('/login'), 3000);
    } catch (error: unknown) {
      const errMessage = (error as Error).message || 'Failed to reset password';
      setError(errMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-3/4 max-w-md 
        bg-white p-8 rounded-lg shadow-inner">
          <h2 className="text-center p-4">Reset your password</h2>
          {error && (
            <div className="text-red-500 text-center">
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="text-green-5000 text-center">
              <p>{success}</p>
            </div>
          )}
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='form-control'>
            <label htmlFor='new_password' className='block text-sm font-medium'>
              New Password
            </label>
            <input
              id='new_password'
              type='password'
              placeholder='Enter your new_password'
              className='input input-bordered w-full mt-2'
              value={newPassword}
              required
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className='form-control'>
            <label htmlFor='password' className='block text-sm font-medium'>
              Confirm Password
            </label>
            <input
              id='password'
              type='password'
              placeholder='Confirm password'
              className='input input-bordered w-full mt-2'
              value={reNewPassword}
              required
              onChange={(e) => setReNewPassword(e.target.value)}
            />
          </div> 
            <button
              type="submit"
              className='w-full p-2 rounded-lg bg-gray-400'>
                Confirm Reset
            </button>  

            <p className='text-center mt-4'>
              Remembered your Password?{' '}
              <Link className='text-blue-500 hover:underline' href="/login">
                Login
              </Link>
            </p>
        </form>
      </div>
    </div>
  )
};
export default ResetPasswordConfirm;
