'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUser, updateUser } from '@/app/store/authSlice';
import { RootState, AppDispatch } from '@/app/store/store';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ToastContainer, toast } from 'react-toastify';
import VideoGridSkeleton from '@/app/components/video/VideoGridSkeleton';
import { getProfileCompletion } from '@/app/lib/profileCompletion';

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Active' },
  { value: 'offline', label: 'Inactive' },
] as const;

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
    following: '',
    skill_tags: '',
    availability_status: 'available',
    website_url: '',
    twitter_url: '',
    linkedin_url: '',
    featured_video_id: '',
    open_to_collab: false,
    open_to_hire: false,
    open_to_mentor: false,
    is_private: false,
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
        followers: String(user.follower_count ?? user.profile?.followers ?? 0),
        following: String(user.following_count || 0),
        skill_tags: user.profile?.skill_tags || '',
        availability_status: user.profile?.availability_status || 'available',
        website_url: user.profile?.website_url || '',
        twitter_url: user.profile?.twitter_url || '',
        linkedin_url: user.profile?.linkedin_url || '',
        featured_video_id: user.profile?.featured_video_id || '',
        open_to_collab: Boolean(user.profile?.open_to_collab),
        open_to_hire: Boolean(user.profile?.open_to_hire),
        open_to_mentor: Boolean(user.profile?.open_to_mentor),
        is_private: Boolean(user.profile?.is_private),
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
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
          skill_tags: userDetails.skill_tags,
          availability_status: userDetails.availability_status,
          website_url: userDetails.website_url,
          twitter_url: userDetails.twitter_url,
          linkedin_url: userDetails.linkedin_url,
          featured_video_id: userDetails.featured_video_id || null,
          open_to_collab: userDetails.open_to_collab,
          open_to_hire: userDetails.open_to_hire,
          open_to_mentor: userDetails.open_to_mentor,
          is_private: userDetails.is_private,
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
  const skillTags = userDetails.skill_tags
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 8);
  const profileCompletion = getProfileCompletion(user);
  const nextMissingItem = profileCompletion.missingItems[0];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-10 text-base-content md:pl-[100px]">
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
      <div className="mt-5 text-center">
        <h1 className="text-2xl font-bold">{userDetails.first_name} {userDetails.last_name}</h1>
        <p className="text-sm font-medium text-base-content/70">@{userDetails.username}</p>
        <div className="mt-3 flex justify-center gap-5 text-sm">
          <span><strong className="text-base-content">{userDetails.followers}</strong> followers</span>
          <span><strong className="text-base-content">{userDetails.following}</strong> following</span>
        </div>
        <p className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium ${userDetails.availability_status === 'available' ? 'text-emerald-600' : 'text-rose-600'}`}>
          <span className={`h-2 w-2 rounded-full ${userDetails.availability_status === 'available' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {AVAILABILITY_OPTIONS.find((option) => option.value === userDetails.availability_status)?.label || 'Active'}
        </p>
        {skillTags.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {skillTags.map((skill) => (
              <span key={skill} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {nextMissingItem && (
        <div className="mt-5 w-full max-w-2xl rounded-xl border border-base-300 bg-base-200/50 px-4 py-3 text-sm">
          <p className="text-base-content/70">
            <span className="font-semibold text-base-content">{profileCompletion.percent}% complete.</span>{" "}
            {nextMissingItem.label} when you are ready.
          </p>
        </div>
      )}

      <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        <input
          type="text"
          name="first_name"
          placeholder="First Name"
          value={userDetails.first_name}
          onChange={handleInputChange}
          className="p-3 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base-content transition-all"
        />
        <input
          type="text"
          name="last_name"
          placeholder="Last Name"
          value={userDetails.last_name}
          onChange={handleInputChange}
          className="p-3 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base-content transition-all"
        />
        <select
          name="availability_status"
          value={userDetails.availability_status}
          onChange={(event) => setUserDetails((prev) => ({ ...prev, availability_status: event.target.value }))}
          className="p-3 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base-content transition-all sm:col-span-2"
        >
          {AVAILABILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <input
          type="text"
          name="skill_tags"
          placeholder="Skill tags, separated by commas"
          value={userDetails.skill_tags}
          onChange={handleInputChange}
          className="p-3 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base-content transition-all sm:col-span-2"
        />
        <input
          type="url"
          name="website_url"
          placeholder="Website URL"
          value={userDetails.website_url}
          onChange={handleInputChange}
          className="p-3 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base-content transition-all sm:col-span-2"
        />
        <input
          type="url"
          name="twitter_url"
          placeholder="Twitter URL"
          value={userDetails.twitter_url}
          onChange={handleInputChange}
          className="p-3 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base-content transition-all sm:col-span-2"
        />
        <input
          type="url"
          name="linkedin_url"
          placeholder="LinkedIn URL"
          value={userDetails.linkedin_url}
          onChange={handleInputChange}
          className="p-3 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base-content transition-all sm:col-span-2"
        />
        {videos.length > 0 && (
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-base-content mb-2">Featured clip</label>
            <select
              name="featured_video_id"
              value={userDetails.featured_video_id}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-base-300 bg-base-100 p-3 text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choose a featured clip</option>
              {videos.map((video) => (
                <option key={video.id} value={video.id}>{video.title || `Clip ${video.id.slice(0, 6)}`}</option>
              ))}
            </select>
          </div>
        )}
        <div className="sm:col-span-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="inline-flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-4 py-3 text-sm">
            <input
              type="checkbox"
              name="open_to_collab"
              checked={userDetails.open_to_collab}
              onChange={(event) => setUserDetails((prev) => ({ ...prev, open_to_collab: event.target.checked }))}
              className="h-4 w-4 rounded border-base-300 text-primary focus:ring-primary"
            />
            Open to collab
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-4 py-3 text-sm">
            <input
              type="checkbox"
              name="open_to_hire"
              checked={userDetails.open_to_hire}
              onChange={(event) => setUserDetails((prev) => ({ ...prev, open_to_hire: event.target.checked }))}
              className="h-4 w-4 rounded border-base-300 text-primary focus:ring-primary"
            />
            Open to hire
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-4 py-3 text-sm">
            <input
              type="checkbox"
              name="open_to_mentor"
              checked={userDetails.open_to_mentor}
              onChange={(event) => setUserDetails((prev) => ({ ...prev, open_to_mentor: event.target.checked }))}
              className="h-4 w-4 rounded border-base-300 text-primary focus:ring-primary"
            />
            Open to mentor
          </label>
        </div>
        <label className="inline-flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-4 py-3 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="is_private"
            checked={userDetails.is_private}
            onChange={(event) => setUserDetails((prev) => ({ ...prev, is_private: event.target.checked }))}
            className="h-4 w-4 rounded border-base-300 text-primary focus:ring-primary"
          />
          Private account
        </label>
        <p className="text-xs font-medium text-base-content/70 sm:col-span-2">When enabled, only approved followers can access your videos and profile details.</p>
        <textarea
          name="bio"
          placeholder="Bio"
          value={userDetails.bio}
          onChange={handleInputChange}
          className="h-32 resize-none p-3 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-base-content transition-all sm:col-span-2"
        />
      </div>

      <button
        onClick={handleUpdateProfile}
        className="mt-4 px-6 py-2 btn btn-primary rounded-lg shadow-lg hover:shadow-xl transition-all"
      >
        Update Profile
      </button>

      {/* Posts Section */}
      <div className="w-full max-w-4xl mt-12 px-4 mb-10">
        <h2 className="text-2xl font-bold mb-6 text-base-content border-b border-base-300 pb-2">My Posts</h2>
        {isVideosLoading ? (
          <VideoGridSkeleton count={10} />
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="group relative aspect-[9/16] bg-base-300 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-md max-h-[60vh]"
                onClick={() => router.push(`/?videoId=${video.id}`)}
              >
                {video.media_type === "image" || video.thumbnail_url ? (
                  <Image
                    src={video.media_type === "image" ? video.file_url : video.thumbnail_url || video.file_url}
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
            <p className="text-base-content/65">You haven't uploaded any videos yet.</p>
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
