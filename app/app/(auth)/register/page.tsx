'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import { register } from '@/app/store/authSlice';
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
  
  const { isLoading, isError } = useSelector((state: RootState) => state.auth);
  
  const togglePassword = () => setShowPassword(!showPassword);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
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
      console.error('Registration failed:', error);
    }
  };

  return (
    <AuthLayout title="Sign Up">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md mx-auto p-4 sm:p-6"
      >
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
              className="input input-bordered w-full"
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
              className="input input-bordered w-full"
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
              className="input input-bordered w-full"
              required
            />
          </div>

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
              className="input input-bordered w-full"
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
                className="input input-bordered w-full pr-10"
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
              className="input input-bordered w-full"
              minLength={6}
              required
            />
          </div>
        </div>

        {isError && (
          <div className="alert alert-error mt-4">
            <span>An error occurred. Please try again.</span>
          </div>
        )}

        <div className="mt-6">
          <button
            type="submit"
            className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              'Register'
            )}
          </button>
        </div>

        <p className="text-center mt-4 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;