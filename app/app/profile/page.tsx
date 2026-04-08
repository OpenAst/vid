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
  const [videos, setVideos] = useState<any[]>([]);
  const [isVideosLoading, setIsVideosLoading] = useState(false);

  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [viewImageOpen, setViewImageOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setUserDetails({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        email: user.email || '',
        avatar: user.profile?.avatar || '/user_icon.png',
        bio: user.profile?.bio || '',
        followers: user.profile?.followers ? String(user.profile?.followers) : ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      dispatch(fetchUser()).unwrap().then((u) => {
        fetchUserVideos(u.username);
      }).catch(() => {
        router.push('/login');
      })
    } else {
      fetchUserVideos(user.username);
    }
  }, [user, dispatch, router]);

  const fetchUserVideos = async (username: string) => {
    setIsVideosLoading(true);
    try {
      const res = await fetch(`/api/video/fetch?username=${username}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.results || []);
      }
    } catch (err) {
      console.error("Failed to fetch user videos", err);
    } finally {
      setIsVideosLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setPreviewImage(URL.createObjectURL(event.target.files[0]));
      setShowAvatarOptions(false); // Close menu
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
    (userDetails.avatar && userDetails.avatar.trim() !== "") ? userDetails.avatar : '/user_icon.png';

  return (
    <div className="flex flex-col items-center mt-10 relative">
      <div
        className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-base-300 cursor-pointer hover:opacity-80 transition"
        onClick={() => setShowAvatarOptions(!showAvatarOptions)}
      >
        <Image
          src={imageSrc}
          alt="Profile"
          width={128}
          height={128}
          unoptimized={true}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Avatar Options Menu */}
      {showAvatarOptions && (
        <div className="absolute top-36 bg-base-100 shadow-2xl rounded-xl p-2 flex flex-col space-y-2 z-10 border border-base-300">
          <button
            onClick={() => {
              setViewImageOpen(true);
              setShowAvatarOptions(false);
            }}
            className="text-sm px-4 py-2 hover:bg-base-200 rounded-lg text-left transition-colors text-base-content"
          >
            View Picture
          </button>
          <button
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="text-sm px-4 py-2 hover:bg-base-200 rounded-lg text-left transition-colors text-base-content"
          >
            Upload New Picture
          </button>
        </div>
      )}

      {/* Full Screen View Modal */}
      {viewImageOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setViewImageOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            Close
          </button>
          <div className="relative w-full max-w-2xl h-[80vh]">
            <Image
              src={imageSrc}
              alt="Full Profile"
              fill
              className="object-contain"
              unoptimized={true}
            />
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="text"
        name="first_name"
        placeholder="First Name"
        value={userDetails.first_name}
        onChange={handleInputChange}
        className="mt-4 p-2 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-64 text-base-content transition-all"
      />
      <input
        type="text"
        name="last_name"
        placeholder="Last Name"
        value={userDetails.last_name}
        onChange={handleInputChange}
        className="mt-2 p-2 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-64 text-base-content transition-all"
      />

      <textarea
        name="bio"
        placeholder="Bio"
        value={userDetails.bio}
        onChange={handleInputChange}
        className="mt-2 p-2 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-64 h-32 resize-none text-base-content transition-all"
      />

      <div className="mt-4">
        <p className="text-base-content/70">Followers: {userDetails.followers}</p>
      </div>

      <button
        onClick={handleUpdateProfile}
        className="mt-4 px-6 py-2 btn btn-primary rounded-lg shadow-lg hover:shadow-xl transition-all"
      >
        Update Profile
      </button>

      {/* Videos Section */}
      <div className="w-full max-w-4xl mt-12 px-4 mb-10">
        <h2 className="text-2xl font-bold mb-6 text-base-content border-b border-base-300 pb-2">My Videos</h2>
        {isVideosLoading ? (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="group relative aspect-[9/16] bg-base-300 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-md max-h-[60vh]"
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
            <p className="text-base-content/50">You haven't uploaded any videos yet.</p>
            <button
              onClick={() => router.push('/upload')}
              className="mt-4 btn btn-outline btn-sm"
            >
              Upload your first video
            </button>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

export default ProfilePage;
