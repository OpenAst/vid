'use client';

import React from 'react';
import Link from 'next/link';
import LoginPage from './components/LoginPage';

import { useGetUserDetailsQuery } from '@/app/(auth)/apiAuth';

function HomePage() {

  const {data: UserDetails, isLoading, isError } = useGetUserDetailsQuery();


  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Error loading user details</p>;


  return (
    <div>
      {UserDetails ? (
      <h1 className='mb-3 text-center'>
        Welcome back <span className="font-bold text-pretty">
          {UserDetails.first_name} 
        </span> to endless streaming and videos !!
      </h1>
      ): (
        <p>Login to view user details.</p>
      )}
      {}
    </div>

  )
}

export default HomePage;