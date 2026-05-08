'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPublicUser } from '@/app/store/authSlice';
import { RootState, AppDispatch } from '@/app/store/store';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import CallButton from '@/app/components/calls/CallButton';
import VideoGridSkeleton from '@/app/components/video/VideoGridSkeleton';


function PublicProfilePage() {
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const { username } = useParams();
  const safeUsername = Array.isArray(username) ? username[0] : username || '';

  const { isLoading, isError, user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const isOwnProfile = user && isAuthenticated && user.username === safeUsername;

  const [userDetails, setUserDetails] = useState({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    avatar: '',
    followers: '',
  });
  const [videos, setVideos] = useState<any[]>([]);
  const [isVideosLoading, setIsVideosLoading] = useState(false);

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
            id: userData.id || '',
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: '', 
            username: userData.username || '',
            avatar: userData.profile?.avatar || '',
            followers: String(userData.profile?.followers) || '0',
          });
          fetchPublicVideos(userData.username);
        })
        .catch((error) => console.error('Error fetching user:', error));
    }
  }, [dispatch, safeUsername]);

  const fetchPublicVideos = async (username: string) => {
    setIsVideosLoading(true);
    try {
      const res = await fetch(`/api/video/fetch?username=${username}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.results || []);
      }
    } catch (err) {
      console.error("Failed to fetch public videos", err);
    } finally {
      setIsVideosLoading(false);
    }
  };



  if (isLoading) return (
    <div className="mx-auto mt-10 w-full max-w-4xl px-4">
      <div className="mx-auto h-32 w-32 rounded-full bg-base-300 animate-pulse" />
      <div className="mx-auto mt-6 h-5 w-40 rounded-full bg-base-300 animate-pulse" />
      <div className="mx-auto mt-3 h-4 w-28 rounded-full bg-base-300 animate-pulse" />
      <div className="mt-12">
        <div className="mb-6 h-8 w-28 rounded-full bg-base-300 animate-pulse" />
        <VideoGridSkeleton count={8} />
      </div>
    </div>
  );
  if (isError) return <p className='text-center text-red-500'>Error loading profile</p>;

  return (
    <div className='flex flex-col items-center mt-10 text-base-content'>
      <div className='relative w-32 h-32 rounded-full overflow-hidden border-4 border-base-300 shadow-lg'>
        <Image
          src={userDetails.avatar || '/user_icon.png'}
          alt='Profile'
          width={128}
          height={128}
          className='w-full h-full object-cover'
        />
      </div>

      <div className='mt-6 text-center'>
        <p className='text-xl font-bold text-base-content'>
          {userDetails.firstName} {userDetails.lastName}
        </p>
        <p className='text-base-content/60'>@{userDetails.username}</p>
        <p className='text-base-content/70'>{userDetails.followers} followers</p>
        {isAuthenticated && userDetails.id && !isOwnProfile && (
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/messages?user=${userDetails.id}`)}
              className="btn btn-sm gap-2"
            >
              Message
            </button>
            <CallButton
              peer={{
                id: userDetails.id,
                username: userDetails.username,
                first_name: userDetails.firstName,
                last_name: userDetails.lastName,
              }}
              type="audio"
            />
            <CallButton
              peer={{
                id: userDetails.id,
                username: userDetails.username,
                first_name: userDetails.firstName,
                last_name: userDetails.lastName,
              }}
              type="video"
            />
          </div>
        )}
      </div>

      {/* Videos Section */}
      <div className="w-full max-w-4xl mt-12 px-4 mb-10">
        <h2 className="text-2xl font-bold mb-6 text-base-content border-b border-base-300 pb-2">Videos</h2>
        {isVideosLoading ? (
          <VideoGridSkeleton count={8} />
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="group relative aspect-[9/16] bg-base-300 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-md"
                onClick={() => router.push(`/?videoId=${video.id}`)}
              >
                {video.thumbnail_url ? (
                  <Image
                    src={video.thumbnail_url}
                    alt={video.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <video
                    src={video.file_url}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    preload="metadata"
                    muted
                    playsInline
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <p className="text-white text-xs font-semibold truncate">{video.title}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-base-100 rounded-2xl border-2 border-dashed border-base-300">
            <p className="text-base-content/50">This user hasn't uploaded any videos yet.</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default PublicProfilePage;
