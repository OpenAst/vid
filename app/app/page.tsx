'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchUser } from '@/app/store/authSlice';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import Feed from './components/video/Feed';
import LoginPage from './(auth)/login/page';


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

  if (isLoading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
    </div>
  );
  
  if (isError) {
    return <LoginPage />
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col items-center">
        {isAuthenticated && (
          <div className="w-full max-w-4xl mx-auto">
            <div className="text-center items-center fixed top-0 left-0 right-0 z-20 bg-white py-4">
              <p className="text-md">
                Hello, 
                <span className="text-xl font-semibold text-center bg-gray-20 ">
                {userDetails.firstName}, {userDetails.lastName}
                </span> 
              </p>
              <p className='text-center'>You are welcome to this amazing platform</p>
            </div>

            <div className="mt-12 h-[calc(100vh-4rem)]">
              <Feed jwtToken={token}/>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage;
