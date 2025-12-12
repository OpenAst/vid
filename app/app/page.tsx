'use client';

import React, { useEffect, useState } from 'react';
import { fetchUser } from '@/app/store/authSlice';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import Feed from './components/video/Feed';
import { usePathname, useRouter } from 'next/navigation';
import { setUnAuthenticated } from '@/app/store/authSlice';
import { Plus } from "lucide-react";
import Header from './components/layout/Header';


function HomePage() {
  const { isAuthenticated, isLoading, token } = useSelector((state: RootState) => state.auth);
  const dispatch: AppDispatch = useDispatch();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

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
        setAuthChecked(true)
      } catch (error) {
        console.error('Error loading user details', error);
      }
    };
    fetchData();
  }, [dispatch]);
  
  if (!authChecked || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen sm:h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!isLoading && !isAuthenticated && pathname === '/') {
    dispatch(setUnAuthenticated());
    router.replace('/login')

    return null;
  }

  return (
      <div className="flex flex-col items-center justify-center">
        <Header />

        <div className="mt-20 h-[calc(100vh-5rem)]">
          <Feed jwtToken={token} />

          <button
            onClick={() => router.push("/upload")}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 border-0 w-12 bg-black/60 rounded-full flex items-center transition z-30"
          >
            <Plus className="w-80 h-12 rounded-full text-white" fill="currentColor" />
          </button>
        </div>
      </div>
    )
}

export default HomePage;
