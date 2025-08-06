'use client'

import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";

interface Props {
  params: {
    uid: string;
    token: string;
  }
}

const ResetPasswordConfirm = async ({
  params }: Props) => {
  const router = useRouter();

  const {uid, token} = params;

  const [newPassword, setNewPassword] = useState('');
  const [reNewPassword, setReNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uid || !token) {
      setError("Invalid reset link. Missing token or uid.");
      return;
    }

    try {
      const response = await fetch("/api/auth/reset_password_confirm/", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          token,
          new_password: newPassword,
          re_new_password: reNewPassword,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset password. Check the link again.');
      }

      setSuccess("Password reset successful. Redirecting to login...");
      toast.success('Password reset successful');
      setTimeout(() => router.push('/login'), 3000);
    } catch (error) {
      const errMessage = (error as Error).message || 'Failed to reset password';
      setError(errMessage);
    }
  };

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-3/4 max-w-md bg-white p-8 rounded-lg shadow-inner relative">
        <h2 className="text-center p-4">Reset your password</h2>
        {error && <div className="text-red-500 text-center">{error}</div>}
        {success && <div className="text-green-500 text-center">{success}</div>}

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='form-control relative'>
            <label htmlFor='new_password'>New Password</label>
            <input
              id='new_password'
              type={showPassword ? 'text' : 'password'}
              className='input input-bordered w-full mt-2'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <span
              onClick={togglePassword}
              className="absolute right-3 top-[48px] text-gray-500 cursor-pointer"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <div className='form-control'>
            <label htmlFor='password'>Confirm Password</label>
            <input
              id='password'
              type={showPassword ? 'text' : 'password'}
              className='input input-bordered w-full mt-2'
              value={reNewPassword}
              onChange={(e) => setReNewPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className='w-full p-2 rounded-lg bg-gray-400'>
            Confirm Reset
          </button>

          <ToastContainer />

          <p className='text-center mt-4'>
            Remembered your password?{' '}
            <Link href="/login" className='text-blue-500 hover:underline'>
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
};

export default ResetPasswordConfirm;
