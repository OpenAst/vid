'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchUser } from '@/app/store/authSlice';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import Feed from './components/video/Feed';



function HomePage() {
  const { isAuthenticated, isLoading, isError, token } = useSelector((state: RootState) => state.auth);
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
          const userData = resultAction.payload
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

  if (isLoading) return <div className="flex justify-center items-center h-screen">🔄 Loading...</div>

  if (isError) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-red-500 text-lg font-semibold mb-5">Unauthorized !</p>
        <p>Please login or sign up</p>
        <Link href="/login" className="text-blue-500 underline mt-5">Please Login</Link>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col items-center p-4">
        {isAuthenticated && (
          <div className="w-full max-w-4xl">
            <div className="text-center fixed top-0 left-0 right-0 z-10 bg-white shadow-sm py-8 px-6">
              <p className="text-lg ">
                Hello,{' '}
                <span className="text-xl font-semibold text-center bg-gray-50">
                  {userDetails.firstName}, {userDetails.lastName}
                </span> !
              </p>
              <p className="text-center">You are welcome to this amazing platform!</p>
            </div>

            <div className="mt-32">
              <Feed jwtToken={token}/>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage;