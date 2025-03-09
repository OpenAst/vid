'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import { register } from '@/app/store/authSlice';
import Link from 'next/link';
import AuthLayout from '../../components/AuthLayout';

const RegisterPage = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { isLoading, isError } = useSelector((state: RootState) => state.auth);
  
  const togglePassword = () => setShowPassword(!showPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      await dispatch(
        register({
          first_name: firstname,
          last_name: lastname,
          email,
          username,
          password,
          re_password: confirmPassword,
        })
      ).unwrap();

      alert('Registration successful!');
      router.push('/check-email'); 
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <AuthLayout title="Sign Up">
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 w-full max-w-lg mx-auto"
      >
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">Firstname</span>
          </label>
          <input
            type="text"
            placeholder="Enter your firstname"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
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
            placeholder="Enter your lastname"
            value={lastname}
            onChange={(e) => setLastname(e.target.value)}
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
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input input-bordered"
            minLength={6}
            required
          />
        </div>

        {isError && (
          <div className="bg-accent-green text-sm lg:col-span-2">
            <p>An error occurred. Please try again.</p>
          </div>
        )}

        <div className="lg:col-span-2">
          <button
            type="submit"
            className={`btn bg-primary-blue w-full
               flex items-center justify-center ${isLoading ? 
               'loading w-6 h-6 justify-center' : ''}`}
          >
            Register
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
