'use client';

import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import { fetchUser } from '../store/authSlice';
import router from 'next/router';


function AboutPage() {

  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);
  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    if (!user) {
      dispatch(fetchUser())
        .unwrap()
        .catch((err) => {
          console.error('Error fetching user: ', err);
          router.push("/login")
        })
    }
  }, [dispatch, user]);

  if (isLoading) return <p className='text-center'>Loading...</p>;

  return ( isAuthenticated && <div className='flex flex-col items-center justify-center'>
    <p className=' mt-20 font-semibold'>We provide secure streaming services</p>
    <span className='mt-20'>Watch from anywhere anytime !</span>
  </div>
  )
}

export default AboutPage