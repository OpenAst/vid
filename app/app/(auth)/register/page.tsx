'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import { register, resetError } from '@/app/store/authSlice';
import Link from 'next/link';
import AuthLayout from '../../components/layout/AuthLayout';
import { toast, ToastContainer } from 'react-toastify';
import { DjoserErrorResponse } from '@/app/store/authSlice';


const RegisterPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    dispatch(resetError());
  }, [dispatch]);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/auth/check_email/?email=${formData.email}`);
      const data = await res.json();

      if (res.ok) {
        if (data.exists) {
          console.log('Response', data);
          toast.error('Email is already registered.');
        } else {
          setStep(2);
        }
      } else {
        toast.error("Failed to validate email.")
      }
    } catch (err) {
      toast.error('Failed to validate email. Please try again later.');
      console.error('Email check error:', err);
    }

  }
  
  const { isLoading, isError } = useSelector((state: RootState) => state.auth);
  
  const togglePassword = () => setShowPassword(!showPassword);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    };

    try {
      await dispatch(
        register({
          first_name: formData.firstname,
          last_name: formData.lastname,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          re_password: formData.confirmPassword,
        })
      ).unwrap();

      router.push('/check-email'); 
    } catch (error) {
       const isDjoserError = (err: unknown): err is DjoserErrorResponse =>
    typeof err === 'object' && err !== null;

  if (isDjoserError(error)) {
    if (error.username) toast.error(error.username[0]);
    if (error.email) toast.error(error.email[0]);
    if (error.password) toast.error(error.password[0]);
    if (error.detail) toast.error(error.detail);
  } else if (typeof error === 'string') {
    toast.error(error);
  } else {
    toast.error('An unexpected error occurred.');
  }
    }
  };

  return (
    <AuthLayout title="Sign Up">
      <form
        onSubmit={step === 1 ? handleNext : handleSubmit}
        className="w-full max-w-md mx-auto p-4 sm:p-6"
      >
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Firstname</span>
              </label>
              <input
                type="text"
                name="firstname"
                placeholder="Firstname"
                value={formData.firstname}
                onChange={handleChange}
                className="input input-bordered focus:outline-none focus:ring-2 focus:ring-primary-blue w-full"
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Lastname</span>
              </label>
              <input
                type="text"
                name="lastname"
                placeholder="Lastname"
                value={formData.lastname}
                onChange={handleChange}
                className="input input-bordered focus:outline-none focus:ring-2 focus:ring-primary-blue w-full"
                required
              />
            </div>

            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="input input-bordered focus:outline-none focus:ring-2 focus:ring-primary-blue w-full"
                required
              />
            </div>
            <div className="flex flex-col items-center justify-center mt-8 space-y-4">
            <button
              type="submit"
              className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-700 text-white hover:bg-purple-600 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="flex gap-4">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="h-2 w-2 rounded-full bg-gray-300" />
            </div>
          </div>

          </div>
        )}

        {step === 2 && (
          <>
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">Username</span>
              </label>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                className="input input-bordered focus:outline-none focus:ring-2 focus:ring-primary-blue w-full"
                required
              />
            </div>

            <div className="form-control md:col-span-2 relative">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input input-bordered focus:outline-none focus:ring-2 focus:ring-primary-blue w-full pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input input-bordered focus:outline-none focus:ring-2 focus:ring-primary-blue w-full"
                minLength={6}
                required
              />
            </div>
          </>
        )}

        {isError && (
          <div className="alert alert-error mt-4">
            <span>An error occurred. Please try again.</span>
          </div>
        )}

        <div className="mt-6">
          <button
            type="submit"
            className= 'btn btn-primary w-full hover:opacity-75'
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm">
                Signing in
              </span>
            ) : ( 
              'Register'
            )}
          </button>
        </div>

        <p className="text-center mt-4 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-500 hover:underline">
            Login
          </Link>``
        </p>
      </form>
      <ToastContainer />
    </AuthLayout>
  );
};

export default RegisterPage;