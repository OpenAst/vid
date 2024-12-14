'use client';

import React, { useState } from 'react';
import { useGoogleLoginMutation, useLoginMutation } from '../apiAuth';
import { useRouter } from 'next/navigation'; // Next.js 15's router hook
import Link from 'next/link'; // Next.js's Link component
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const LoginPage = () => {
  const [login, { isLoading, isError }] = useLoginMutation();
  const [googleLogin, { isLoading: isGoogleLoading, error: googleError }] = useGoogleLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter(); // Using Next.js router for navigation
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login({ email, password }).unwrap();
      console.log('Login successful:', result);
      setTimeout(() => router.push('/dashboard'), 3000); // Navigate to dashboard after successful login
    } catch (error) {
      console.log(isError);
    }
  };

  const continueWithGoogle = async () => {
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=YOUR_GOOGLE_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=token&scope=email%20profile`;
    window.location.href = authUrl;

    const token = new URLSearchParams(window.location.hash.substring(1)).get('access_token');
    if (token) {
      try {
        await googleLogin({ token }).unwrap();
        console.log('Google login successful');
        router.push('/dashboard');
      } catch (error) {
        console.error('Error with Google login:', error);
      }
    }
  };

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Sign In</h1>
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

          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
          >
            Login
          </button>
        </form>

        <button
          className="w-full bg-red-500 text-white p-2 rounded-lg mt-4 hover:bg-red-600"
          onClick={continueWithGoogle}
        >
          Continue with Google
        </button>

        <p className="text-center mt-4">
          Don't have an account?{' '}
          <Link className="text-blue-500 hover:underline" href="/register">
            Sign Up
          </Link>
        </p>
        <p className="text-center mt-2">
          Forgot your password?{' '}
          <Link className="text-blue-500 hover:underline" href="/reset-password">
            Reset Password
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;