'use client';

import React, { useState } from 'react';
import { useLoginMutation, useRefreshMutation } from '../apiAuth'
import { useRouter } from 'next/navigation'; // Next.js 15's router hook
import Link from 'next/link'; // Next.js's Link component
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import AuthLayout from '../../components/AuthLayout';

const LoginPage = () => {
  
  interface ApiError {
    status?: number;
    message?: string;
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter(); // Using Next.js router for navigation
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isError, isLoading}] = useLoginMutation();
  const [refresh] = useRefreshMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      

      const res = await login({ email, password }).unwrap();

      localStorage.setItem('ACCESS_TOKEN', res.access);
      localStorage.setItem('REFRESH_TOKEN', res.refresh);
      
      console.log('Login successful:', res);
      console.log('First name', res.first_name);
      
      setTimeout(() => router.push('/'), 3000);
    } catch (e: unknown) {
      console.log("Error working with login", e);

      if ((e as ApiError).status === 401) {
        const refreshToken = localStorage.getItem('REFRESH_TOKEN');
        if (refreshToken) {
          try {
            const refreshRes = await refresh({ refresh: refreshToken }).unwrap();
            localStorage.setItem('ACCESS_TOKEN', refreshRes.access);

            console.log('Token refreshed successfully');
          } catch (refreshError) {
              console.error('Error during token refresh:', refreshError);
          }
        }
      }
    }
  };

  

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    
    <AuthLayout title="Sign In">
      <p className="text-center mb-6">Sign into your Account</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <input
            className="input input-bordered w-full"
            type="email"
            placeholder="Email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-control relative">
          <input
            className="input input-bordered w-full"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
            <span
                onClick={togglePassword}
                className="absolute right-3 top-4  text-gray-500 cursor-pointer"
                >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
        </div>
         {isError && (
        <div className='bg-accent-green text-sm lg:col-span-2'>
            <p>An error occurred.</p>
        </div>)}
        <button
          type="submit"
           className={`btn bg-primary-blue w-full
             flex items-center justify-center ${isLoading ? 
             'loading w-6 h-6 justify-center' : ''}`}
        >
          Login
        </button>
      </form>


      <p className="text-center mt-4">
        Don&apos:t have an account?{' '}
        <Link className="text-primary-blue hover:underline" href="/register">
          Sign Up
        </Link>
      </p>
      <p className="text-center mt-2">
        Forgot your password?{' '}
        <Link className="text-primary-blue hover:underline" href="/password-reset">
          Reset Password
        </Link>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;
