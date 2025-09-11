'use client';

import React, { useState } from 'react';
import { login } from '@/app/store/authSlice';
import { useRouter } from 'next/navigation'; 
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import Link from 'next/link';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import AuthLayout from '../../components/layout/AuthLayout';
import { ToastContainer, toast } from 'react-toastify';

const LoginPage = () => {
  
  interface ApiError {
    status?: number;
    message?: string;
  }
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  

  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, isError } = useSelector((state: RootState) => state.auth);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); 
  const router = useRouter();

  interface AuthErrorResponse {
    email?: string;
    username?: string;
    detail?: string;
    error?: string;
    status?: number;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null); 

    try {
      const res = await dispatch(login({ email, password, username })).unwrap();
      console.log('Login successful:', res);


      window.history.replaceState(null, '/');
      router.replace('/');
      toast.success('Login successful.');

    } catch (err: unknown) {
      console.log("Error during login:", err);

      const defaultMsg = 'Your login credentials are incorrect. Please try again.';

      if (typeof err === 'object' && typeof err !== null) {
        const e = err as AuthErrorResponse;
        console.log(e);


        if (e.email) {
          setErrorMessage(`Email Error: ${e.email}`);
        } else if (e.username) {
          setErrorMessage(`Username Error: ${e.username}`);
        } else if (e.detail) {
          setErrorMessage(e.detail)
        } else {
          setErrorMessage(defaultMsg);
        }
      } else {
        setErrorMessage(defaultMsg);
      }

      
      if (typeof e === 'object' && e !== null && 'error' in e) {
        setErrorMessage(e.error as string);
      } else {
        setErrorMessage('Your login credentials are incorrect. Please try again.');
      }


      if ((e as ApiError).status === 401) {
        try {
          console.log('Attempting token refresh...');
          const res = await fetch('/api/auth/refresh/', {
            method: 'POST',
            credentials: 'include',
          });

          if (res.ok) {
            const data = await res.json();
            console.log('Token refresh successful:', data);
          } else {
            console.log('Token refresh failed:', await res.text());
          }
        } catch (refreshError) {
          console.log('Token refresh request failed:', refreshError);
        }
      }
    }
  };

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <AuthLayout title="Sign In">
      <div className='max-w-md mx-auto p-8 bg-white/10 backdrop-blur-lg rounded border border-white/20 shadow-xl'>

      </div>
      <p className="text-center mb-6 text-white">Sign into your Account</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="form-control">
          <input
            className="input input-bordered w-full bg-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-blue"
            type="email"
            placeholder="Email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-control">
          <input
            className="input input-bordered w-full bg-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-blue"
            type="text"
            placeholder="Username"
            name="username"  
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        <div className="form-control relative">
          <input
            className="input w-full bg-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-blue"
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
            className="absolute right-3 top-4 text-gray-500 cursor-pointer"
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        {isError && errorMessage && (
          <div className="bg-red-500/80 backdrop-blur-sm text-white text-sm text-center p-2 rounded-md">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          className={`btn btn-primary hover:opacity-75 w-full flex items-center justify-center ${isLoading ? 'opacity-75' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-sm">Signing in</span>
          ) : ( 
            'Login'
          )}
        </button>
      </form>
      <ToastContainer />
      <p className="text-center mt-4">
      Don&apos;t have an account?{' '}
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
