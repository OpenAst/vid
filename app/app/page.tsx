'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import LoginPage from '@/app/(auth)/login/page';
import { fetchUser } from '@/app/store/authSlice';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';

function HomePage() {
  const { isAuthenticated, isLoading, isError } = useSelector((state: RootState) => state.auth);
  const dispatch: AppDispatch = useDispatch();

  const [userDetails, setUserDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });


  useEffect(() => {
    const fetchData = async () => {
      try {
        const resultAction = await dispatch(fetchUser());
        if (fetchUser.fulfilled.match(resultAction)) {
          const userData = resultAction.payload;
          setUserDetails({
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.email || '',
          });
        }
      } catch (error) {
        console.error('Error loading user details', error);
      }
    };
    fetchData();
  }, [dispatch]);

  if (isLoading) return <p className='loading-sm'>Loading...</p>;

  if (isError) {
    return (
      <div>
        <p className="text-red-500 text-center">Error loading user details</p>
        <LoginPage />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start h-screen pt-6 space-y-6">
      {isAuthenticated ? (
        <div className="text-center">
          <p>
            Hello,{' '}
            <span className="font-bold">
              {userDetails.firstName} {userDetails.lastName}
            </span> !
          </p>
          <p>Email: {userDetails.email}</p>
        </div>
        ) : (
          <p className="text-center">
            Please log in to view your profile.
          </p>
        )}
      <div className="mb-6 space-y-2 justify-start items-start">
        <nav className='space-y-2'>
          <Link href="/about" className="text-blue-500">About</Link>
          <br />
          <Link href="/dashboard" className="text-blue-500">Dashboard</Link>
          <br />
          <Link href="/profile" className="text-blue-500">Profile</Link>
          <br />
          <Link href="/login" className="text-blue-500">Login</Link>
          <br />
          <Link href="/register" className="text-blue-500">Register</Link>
        </nav>
      </div>

    </div>
  );
}

export default HomePage;
