'use client';

import React, { useState } from 'react';
import { useGoogleLoginMutation, useLoginMutation } from './(auth)/apiAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import AuthLayout from './components/AuthLayout';

const LoginPage = () => {
  const [login, { isLoading, isError }] = useLoginMutation();
  const [googleLogin, { isLoading: isGoogleLoading, error: googleError }] = useGoogleLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login({ email, password }).unwrap();
      console.log('Login successful:', result);
      setTimeout(() => router.push('/dashboard'), 3000);
    } catch (error) {
      console.log(isError);
    }
  };

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="container mx-auto flex flex-col lg:flex-row items-center lg:items-start space-y-8 lg:space-y-0 lg:space-x-16">
        {/* Caption Section */}
        <div className=" flex flex-col text-center lg:text-left max-w-lg mt-8 ">
          <h1 className="text-4xl font-bold text-primary-blue mb-4">Welcome Back!</h1>
          <p className="text-gray-600 text-lg">
            Join our community to explore exciting content, connect with friends, and much more.
          </p>
          <p className="text-gray-600 text-lg mt-2">
            Experience the best video streaming and collaboration tools tailored just for you.
          </p>
        </div>

        {/* Login Form Section */}
        <AuthLayout title="Sign In">
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
                className="absolute right-3 top-3 text-gray-500 cursor-pointer"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            <button
              type="submit"
              className="w-full bg-primary-blue text-white p-2 rounded-lg hover:bg-blue-600"
            >
              {isLoading ? 'Loading...' : 'Login'}
            </button>
          </form>

          <button
            className="w-full bg-accent-green text-white p-2 rounded-lg mt-4 hover:bg-green-400"
            onClick={() => console.log('Google login')}
          >
            Continue with Google
          </button>

          <p className="text-center mt-4">
            Don't have an account?{' '}
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
      </div>
    </div>
  );
};

export default LoginPage;
