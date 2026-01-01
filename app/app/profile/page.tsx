'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUser, updateUser } from '@/app/store/authSlice';
import { RootState, AppDispatch } from '@/app/store/store';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ToastContainer, toast } from 'react-toastify';

function ProfilePage() {
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const { user, isLoading, isError } = useSelector((state: RootState) => state.auth);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    avatar: '',
    bio: '',
    followers: '',
  });

  useEffect(() => {
    if (user) {
      setUserDetails({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        email: user.email || '',
        avatar: user.profile?.avatar || '/dog5.jpg',
        bio: user.profile?.bio || '',
        followers: user.profile?.followers ? String(user.profile?.followers) : ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      dispatch(fetchUser()).unwrap().catch(() => {
        router.push('/login');
      })
    }
  }, [user, dispatch, router]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setPreviewImage(URL.createObjectURL(event.target.files[0]));
    }
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setUserDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async () => {
    try {
      let avatarUrl = userDetails.avatar;

      if (selectedFile) {
        // 1. Get Presigned URL
        const res = await fetch("/api/auth/get_avatar_url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_name: selectedFile.name,
            file_type: selectedFile.type
          }),
        });

        if (!res.ok) throw new Error("Failed to get upload URL");

        const { upload_url, avatar_url } = await res.json();

        // 2. Upload directly to S3/R2
        const uploadRes = await fetch(upload_url, {
          method: "PUT",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload image");

        avatarUrl = avatar_url;
      }

      console.log("The avatar_url", avatarUrl);

      const updatedRes = await dispatch(
        updateUser({
          first_name: userDetails.first_name,
          last_name: userDetails.last_name,
          avatar: avatarUrl,
          bio: userDetails.bio,
        })
      ).unwrap();

      await new Promise(r => setTimeout(r, 200));
      await dispatch(fetchUser()).unwrap();
      console.log('avatar url:', avatarUrl);

      toast.success("Profile updated successfully!");

      // Cache busting
      const newAvatar = updatedRes?.profile?.avatar || avatarUrl
      const cacheBustedAvatar = `${newAvatar}?t=${Date.now()}`;

      setUserDetails((prev) => ({ ...prev, avatar: cacheBustedAvatar }));
      setPreviewImage(null);
      setSelectedFile(null); // Clear file selection after upload

    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Profile update failed.");
    }
  };


  if (isLoading) return <p className="text-center">Loading...</p>;
  if (isError) return <p className="text-center text-red-500">Error loading profile</p>;

  const imageSrc: string = (previewImage && previewImage.trim() !== "") ? previewImage :
    (userDetails.avatar && userDetails.avatar.trim() !== "") ? userDetails.avatar : '/dog5.jpg';

  return (
    <div className="flex flex-col items-center mt-10">
      <div className="relative w-32 h-32 rounded-full justify-end items-end overflow-hidden border-4 border-gray-300">
        <Image
          src={imageSrc}
          alt="Profile"
          width={128}
          height={128}
          unoptimized={true}
          className="w-full h-full object-cover"
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
        name="first_name"
        placeholder="First Name"
        value={userDetails.first_name}
        onChange={handleInputChange}
        className="mt-4 p-2 border border-gray-300 rounded"
      />
      <input
        type="text"
        name="last_name"
        placeholder="Last Name"
        value={userDetails.last_name}
        onChange={handleInputChange}
        className="mt-2 p-2 border border-gray-300 rounded"
      />

      <textarea
        name="bio"
        placeholder="Bio"
        value={userDetails.bio}
        onChange={handleInputChange}
        className="mt-2 p-2 border border-gray-300 rounded w-64 h-32 resize-none"
      />

      <div className="mt-4">
        <p className="text-gray-600">Followers: {userDetails.followers}</p>
      </div>

      <button
        onClick={handleUpdateProfile}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Update Profile
      </button>
      <ToastContainer />
    </div>
  );
}

export default ProfilePage;
