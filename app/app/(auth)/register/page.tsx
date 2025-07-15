'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import { register, resetAuthState } from '@/app/store/authSlice';
import Link from 'next/link';
import AuthLayout from '../../components/layout/AuthLayout';

const RegisterPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const { isLoading, isError, errorMessage } = useSelector((state: RootState) => state.auth);
  
  useEffect(() => {
    dispatch(resetAuthState());
  }, [dispatch]);

  const togglePassword = () => setShowPassword(!showPassword);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (localError) setLocalError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    try {
      const result = await dispatch(
        register({
          first_name: formData.firstname,
          last_name: formData.lastname,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          re_password: formData.confirmPassword,
        })
      ).unwrap();

      if (result.success) {
        router.push('/check-email');
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const displayError = localError || (isError && errorMessage) || '';

  const getErrorMessage = () => {
    if (localError) return localError;
    if (!isError) return '';

    if (errorMessage?.includes('password')) {
      return 'Invalid password. Must be at least 6 characters';
    }
    if (errorMessage?.includes('email')) {
      return 'Invalid email address';
    }
    if (errorMessage?.includes('username')) {
      return 'Username already exists';
    }
    return 'Registration failed. Please try again';
  };
  
  return (
    <AuthLayout title="Sign Up">
      <form
        onSubmit={handleSubmit}
        className="grid gap-2 max-w-lg mx-auto md:mt-8"
      >
        <div className="form-control">
          <label className="label">
            <span className="label-text">Firstname</span>
          </label>
          <input
            type="text"
            name="firstname" 
            placeholder="Enter your firstname"
            value={formData.firstname}
            onChange={handleChange}
            className="input input-bordered"
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
            placeholder="Enter your lastname"
            value={formData.lastname}
            onChange={handleChange}
            className="input input-bordered"
            required
          />
        </div>

        <div className="form-control lg:col-span-2">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            className="input input-bordered"
            required
          />
        </div>

        <div className="form-control lg:col-span-2">
          <label className="label">
            <span className="label-text">Username</span>
          </label>
          <input
            type="text"
            name="username" 
            placeholder="Enter your username"
            value={formData.username}
            onChange={handleChange}
            className="input input-bordered"
            required
          />
        </div>

        <div className="form-control relative">
          <label className="label">
            <span className="label-text">Password</span>
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password" 
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            className="input input-bordered"
            minLength={6}
            required
          />
          <span
            onClick={togglePassword}
            className="absolute right-3 top-10 cursor-pointer text-gray-500"
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <div className="form-control relative">
          <label className="label">
            <span className="label-text">Confirm Password</span>
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="input input-bordered"
            minLength={6}
            required
          />
        </div>

        {(localError || isError) && (
          <div className="bg-red-100 text-red-700 p-2 rounded text-sm lg:col-span-2">
            <p>{getErrorMessage()}</p>
          </div>
        )}

        <div className="lg:col-span-2">
          <button
            type="submit"
            className={`btn bg-primary-blue w-full text-white
               flex items-center justify-center ${isLoading ? 
               'loading w-6 h-6 justify-center' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Register'}
          </button>
        </div>
      </form>

      <p className="text-center mt-4 text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-500 hover:underline">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
};

export default RegisterPage;