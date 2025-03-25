'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchUser } from '@/app/store/authSlice';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import Feed from './components/video/Feed';

function HomePage() {
  const { isAuthenticated, isLoading, isError } = useSelector((state: RootState) => state.auth);
  const dispatch: AppDispatch = useDispatch();

  console.log("Isauthenticated", isAuthenticated)
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

  if (isLoading) return <div className="flex justify-center items-center h-screen">🔄 Loading...</div>;

  if (isError) {
    return (
      <div className="text-center">
        <p className="text-red-500">Error loading user details</p>
        <p>Please login or sign up</p>
        <Link  href="/login">Login</Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/8 pt-4 border-r">
        <nav className="space-y-2 p-2">
          {!isAuthenticated && (
            <>
              <Link href="/login" className="block text-sm">Login</Link>
              <Link href="/register" className="block text-sm">Register</Link>
            </>
          )}
          <Link href="/" className="block text-sm">Home</Link>
          <Link href="/about" className="block text-sm">About</Link>
          <Link href="/upload" className="block text-sm">Upload</Link>
          <Link href="/profile" className="block text-sm">Profile</Link>
        </nav>
      </div>
  
      
      <div className="flex-1 flex items-start justify-center">
        {isAuthenticated ? (
          <>
            <div className="text-center">
              <p>
                Hello,{' '}
                <span className="font-bold">
                  {userDetails.firstName}, {userDetails.lastName}
                </span> !
              </p>
              <p className="text-center">You are welcome to this amazing platform!</p>
            </div>
            <Feed />
          </>
        ) : (
          <p>Please log in to view your profile.</p>
        )}
      </div>
    </div>
  );
  
}

export default HomePage;