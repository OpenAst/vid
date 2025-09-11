'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPublicUser } from '@/app/store/authSlice';
import { RootState, AppDispatch } from '@/app/store/store';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';


function PublicProfilePage() {
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const { username } = useParams(); 
  const safeUsername = Array.isArray(username) ? username[0]: username || '';

  const { isLoading, isError, user, isAuthenticated} = useSelector(
    (state: RootState) => state.auth
  );

  const isOwnProfile = user && isAuthenticated && user.username === safeUsername;

  const [userDetails, setUserDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    avatar: '',
    followers: '',
  });

  useEffect(() => {
    if (isOwnProfile) {
      router.push('/profile');
    }
  }, [isOwnProfile, router]);
  
  useEffect(() => {
    if (safeUsername) {
      dispatch(fetchPublicUser(safeUsername))
        .unwrap()
        .then((userData) => {
          setUserDetails({
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.email || '',
            username: userData.username || '',
            avatar: userData.avatar || '',
            followers:  String(userData.followers) || '0',
          });
        })
        .catch((error) => console.error('Error fetching user:', error));
    }
  }, [dispatch, safeUsername ]);

  

  if (isLoading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
    </div>
  );
  if (isError) return <p className='text-center text-red-500'>Error loading profile</p>;

  return (
    <div className='flex flex-col items-center mt-10'>
      <div className='relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-300'>
        <Image
          src={userDetails.avatar || '/default-avatar.png'}
          alt='Profile'
          width={128}
          height={128}
          className='w-full h-full object-cover'
        />
      </div>

      <div className='mt-6 text-center'>
        <p className='text-xl font-bold'>
          {userDetails.firstName} {userDetails.lastName}
        </p>
        <p className='text-gray-600'>@{userDetails.username}</p>
        <p className='text-gray-600'>{userDetails.followers} followers</p>
      </div>

    </div>
  );
}

export default PublicProfilePage;
