'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUser, updateProfile } from '@/app/store/authSlice';
import { RootState, AppDispatch } from '@/app/store/store';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

function ProfilePage() {
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isError } = useSelector((state: RootState) => state.auth);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profile_picture: '',
    bio: '',
    followers: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user) {
      dispatch(fetchUser())
      .unwrap()
      .then((userData) => {
        setUserDetails({
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          email: userData.email || '',
          profile_picture: userData.profile_picture || '',
          bio: userData.bio || '',
          followers: userData.followers || '',
        });
      })
      .catch((error) => console.error('Error fetching user:', error));
  }
}, [dispatch, isAuthenticated, router, user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setPreviewImage(URL.createObjectURL(event.target.files[0]));
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setUserDetails((prev) => ({ ...prev, [name]: value }));
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
          src={previewImage || user?.profile_picture || '/dog5.jpg'}
          alt='Profile'
          width={128}
          height={128}
          className='w-full h-full object-cover'
        />
      </div>
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange} 
        className="mt-4"
      />
      <input 
        type="text" 
        name="firstName" 
        placeholder="First Name" 
        value={userDetails.firstName} 
        onChange={handleInputChange} 
        className="mt-4 p-2 border border-gray-300 rounded"
      />
      <input 
        type="text" 
        name="lastName" 
        placeholder="Last Name" 
        value={userDetails.lastName} 
        onChange={handleInputChange} 
        className="mt-2 p-2 border border-gray-300 rounded"
      />

      <input 
        type="text" 
        name="lastName" 
        placeholder="Last Name" 
        value={userDetails.lastName} 
        onChange={handleInputChange} 
        className="mt-2 p-2 border border-gray-300 rounded"
      />

      <button 
        onClick={handleUpload} 
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Update Profile
      </button>
    </div>
  );
}

export default ProfilePage;
