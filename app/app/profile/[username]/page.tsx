'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPublicUser, updateProfile } from '@/app/store/authSlice';
import { RootState, AppDispatch } from '@/app/store/store';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

function ProfilePage() {
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const { username } = useParams(); 
  const safeUsername = Array.isArray(username) ? username[0]: username || '';

  const { isAuthenticated, isLoading, isError, user } = useSelector(
    (state: RootState) => state.auth
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    profile_picture: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && typeof user !== 'string') {
      setUserDetails({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        username: user.username || '',
        profile_picture: user.profile_picture || '',
      });
    } else if (safeUsername) {
      dispatch(fetchPublicUser(safeUsername))
        .unwrap()
        .then((userData) => {
          setUserDetails({
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.email || '',
            username: userData.username || '',
            profile_picture: userData.profile_picture || '',
          });
        })
        .catch((error) => console.error('Error fetching user:', error));
    }
  }, [dispatch, isAuthenticated, router, user, safeUsername ]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setPreviewImage(URL.createObjectURL(event.target.files[0]));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile && !userDetails.firstName && !userDetails.lastName) return;

    const formData = new FormData();
    if (selectedFile) {
      formData.append('profile_picture', selectedFile);
    }
    formData.append('first_name', userDetails.firstName);
    formData.append('last_name', userDetails.lastName);

    dispatch(updateProfile(formData))
      .unwrap()
      .then(() => alert('Profile updated successfully!'))
      .catch((err) => console.error('Update failed:', err));
  };

  if (isLoading) return <p className='text-center'>Loading...</p>;
  if (isError) return <p className='text-center text-red-500'>Error loading profile</p>;

  return (
    <div className='flex flex-col items-center mt-10'>
      <div className='relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-300'>
        <Image
          src={previewImage || userDetails.profile_picture || '/default-avatar.png'}
          alt='Profile'
          width={128}
          height={128}
          className='w-full h-full object-cover'
        />
      </div>

      {isAuthenticated && (
        <>
          <input type='file' accept='image/*' onChange={handleFileChange} className='mt-4' />
          <button
            onClick={handleUpload}
            className='mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
          >
            Upload Picture
          </button>
        </>
      )}

      <div className='mt-6 text-center'>
        <p className='text-xl font-bold'>{userDetails.firstName} {userDetails.lastName}</p>
        <p className='text-gray-600'>{userDetails.email}</p>
        <p className='text-gray-600'>{userDetails.username}</p>
      </div>
    </div>
  );
}

export default ProfilePage;
