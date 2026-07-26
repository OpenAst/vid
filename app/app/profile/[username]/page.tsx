'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPublicUser } from '@/app/store/authSlice';
import { RootState, AppDispatch } from '@/app/store/store';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import CallButton from '@/app/components/calls/CallButton';
import UserAvatar from '@/app/components/common/UserAvatar';
import SupportCreatorButton from '@/app/components/creator/SupportCreatorButton';
import UserSafetyActions from '@/app/components/safety/UserSafetyActions';
import type { MembershipTier } from '@/app/store/authSlice';
import VideoGridSkeleton from '@/app/components/video/VideoGridSkeleton';
import toast from 'react-hot-toast';
import { Briefcase, CalendarDays, Check, ImageIcon, MessageCircle, Play, UserPlus, VideoIcon, ExternalLink, X } from 'lucide-react';


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
    followers: 0,
    following: 0,
    bio: '',
    skillTags: [] as string[],
    availabilityStatus: 'available',
    isFollowing: false,
    isPrivate: false,
    websiteUrl: '',
    twitterUrl: '',
    linkedinUrl: '',
    featuredVideoId: '',
    openToCollab: false,
    openToHire: false,
    openToMentor: false,
    membershipTiers: [] as MembershipTier[],
  });
  const [videos, setVideos] = useState<any[]>([]);
  const [isVideosLoading, setIsVideosLoading] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [bookingSlots, setBookingSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [bookingMessage, setBookingMessage] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);

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
            followers: Number(userData.follower_count ?? userData.profile?.followers ?? 0),
            following: Number(userData.following_count || 0),
            bio: userData.profile?.bio || '',
            skillTags: String(userData.profile?.skill_tags || '')
              .split(',')
              .map((skill) => skill.trim())
              .filter(Boolean)
              .slice(0, 8),
            availabilityStatus: userData.profile?.availability_status || 'available',
            websiteUrl: userData.profile?.website_url || '',
            twitterUrl: userData.profile?.twitter_url || '',
            linkedinUrl: userData.profile?.linkedin_url || '',
            featuredVideoId: userData.profile?.featured_video_id || '',
            openToCollab: Boolean(userData.profile?.open_to_collab),
            openToHire: Boolean(userData.profile?.open_to_hire),
            openToMentor: Boolean(userData.profile?.open_to_mentor),
            membershipTiers: Array.isArray(userData.profile?.membership_tiers) ? userData.profile.membership_tiers : [],
            isPrivate: Boolean(userData.profile?.is_private),
            isFollowing: Boolean(userData.is_following),
          });
          fetchPublicVideos(userData.username);
        })
        .catch((error) => console.error('Error fetching user:', error));
    }
  }, [dispatch, safeUsername]);

  useEffect(() => {
    const fetchBlockStatus = async () => {
      if (!isAuthenticated || !userDetails.id) return;
      try {
        const response = await fetch(`/api/auth/users/${userDetails.id}/block/status/`);
        if (response.ok) {
          const data = await response.json();
          setIsBlocked(Boolean(data.blocked));
          setIsBlockedBy(Boolean(data.blocked_by));
        }
      } catch (error) {
        console.error('Failed to fetch block status', error);
      }
    };
    fetchBlockStatus();
  }, [isAuthenticated, userDetails.id]);

  useEffect(() => {
    const loadBookingSlots = async () => {
      if (!userDetails.id || isOwnProfile) return;
      try {
        const response = await fetch(`/api/bookings/slots?creator=${userDetails.id}`, { cache: 'no-store' });
        const data = await response.json();
        if (response.ok) {
          setBookingSlots(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to load booking slots', error);
      }
    };
    void loadBookingSlots();
  }, [isOwnProfile, userDetails.id]);

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

  const handleFollowToggle = async () => {
    if (!userDetails.id || isFollowLoading) return;
    if (isBlockedBy) {
      toast.error('You cannot follow this user because they have blocked you.');
      return;
    }

    setIsFollowLoading(true);
    try {
      const response = await fetch(`/api/auth/follow/${userDetails.id}`, {
        method: userDetails.isFollowing ? 'DELETE' : 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || 'Unable to update follow');
      }

      setUserDetails((current) => ({
        ...current,
        followers: Number(data.followers ?? current.followers),
        isFollowing: Boolean(data.is_following),
      }));
      toast.success(data.is_following ? 'Following' : 'Unfollowed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update follow');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const requestBooking = async () => {
    if (!selectedSlot) return;
    setIsBooking(true);
    try {
      const response = await fetch(`/api/bookings/slots/${selectedSlot.id}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: bookingMessage }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to request booking');
      }
      setBookingSlots((current) => current.map((slot) => slot.id === selectedSlot.id ? { ...slot, my_request: data } : slot));
      setSelectedSlot(null);
      setBookingMessage('');
      toast.success('Booking requested');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to request booking');
    } finally {
      setIsBooking(false);
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

  const isProfileActive = userDetails.availabilityStatus === 'available';
  const presenceLabel = isProfileActive ? 'Active' : 'Inactive';
  const presenceClassName = isProfileActive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-rose-50 text-rose-700 border-rose-200';
  const displayName = `${userDetails.firstName} ${userDetails.lastName}`.trim() || userDetails.username || 'Creator';
  const hasOpportunityMode = Boolean(userDetails.openToCollab || userDetails.openToHire || userDetails.openToMentor);
  const primaryOpportunityMode = userDetails.openToHire ? 'hire' : userDetails.openToMentor ? 'mentor' : 'collab';

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-10 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto w-full max-w-6xl">
        <section className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
          <div className="h-24 bg-gradient-to-r from-base-200 via-primary/10 to-base-300 sm:h-32" />
          <div className="px-4 pb-5 sm:px-6">
            <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="rounded-full border-4 border-base-100 bg-base-100 shadow-lg">
                  <UserAvatar
                    user={{
                      username: userDetails.username,
                      first_name: userDetails.firstName,
                      last_name: userDetails.lastName,
                    }}
                    size={112}
                    showPresence
                    isOnline={isProfileActive}
                  />
                </div>
                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold">{displayName}</h1>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${presenceClassName}`}>
                      <span className={`h-2 w-2 rounded-full ${isProfileActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {presenceLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-base-content/70">@{userDetails.username}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium text-base-content/70">
                    <Link href={`/profile/${userDetails.username}/followers`} className="group inline-flex gap-1">
                      <span><strong className="text-base-content">{userDetails.followers}</strong> followers</span>
                      <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link href={`/profile/${userDetails.username}/following`} className="group inline-flex gap-1">
                      <span><strong className="text-base-content">{userDetails.following}</strong> following</span>
                      <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <span><strong className="text-base-content">{videos.length}</strong> posts</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-sm text-base-content/75">
                {userDetails.websiteUrl && (
                  <Link href={userDetails.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-base-300 px-3 py-1 transition hover:bg-base-200">
                    <ExternalLink className="h-4 w-4" /> Website
                  </Link>
                )}
                {userDetails.twitterUrl && (
                  <Link href={userDetails.twitterUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-base-300 px-3 py-1 transition hover:bg-base-200">
                    <ExternalLink className="h-4 w-4" /> Twitter
                  </Link>
                )}
                {userDetails.linkedinUrl && (
                  <Link href={userDetails.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-base-300 px-3 py-1 transition hover:bg-base-200">
                    <ExternalLink className="h-4 w-4" /> LinkedIn
                  </Link>
                )}
              </div>

              {userDetails.featuredVideoId && (
                <div className="mt-4 rounded-3xl bg-base-200/70 border border-base-300 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-base-content/70">Featured clip</p>
                  <Link href={`/video/${userDetails.featuredVideoId}`} className="mt-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary hover:text-primary-focus">
                    <Play className="h-4 w-4" />
                    View featured video
                  </Link>
                </div>
              )}

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {userDetails.openToCollab && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Open to collab</span>}
                {userDetails.openToHire && <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">Open to hire</span>}
                {userDetails.openToMentor && <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">Open to mentor</span>}
              </div>

              {isAuthenticated && userDetails.id && !isOwnProfile && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading || isBlockedBy}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      userDetails.isFollowing
                        ? 'border border-base-300 bg-base-100 hover:bg-base-200'
                        : 'bg-primary text-primary-content hover:opacity-90'
                    } ${isBlockedBy ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {userDetails.isFollowing ? <Check size={16} /> : <UserPlus size={16} />}
                    {isFollowLoading ? '...' : userDetails.isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/messages?user=${userDetails.id}`)}
                    disabled={isBlocked || isBlockedBy}
                    className={`inline-flex items-center gap-2 rounded-xl border border-base-300 px-4 py-2 text-sm font-semibold transition hover:bg-base-200 ${isBlocked || isBlockedBy ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <MessageCircle size={16} />
                    Message
                  </button>
                  {hasOpportunityMode && (
                    <button
                      type="button"
                      onClick={() => router.push(`/collabs?creator=${encodeURIComponent(userDetails.username)}&mode=${primaryOpportunityMode}`)}
                      disabled={isBlocked || isBlockedBy}
                      className={`inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-content transition hover:opacity-90 ${isBlocked || isBlockedBy ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Briefcase size={16} />
                      Work with me
                    </button>
                  )}
                  <SupportCreatorButton creatorId={userDetails.id} creatorName={displayName} tiers={userDetails.membershipTiers} />
                  <CallButton
                    peer={{
                      id: userDetails.id,
                      username: userDetails.username,
                      first_name: userDetails.firstName,
                      last_name: userDetails.lastName,
                    }}
                    type="audio"
                    availabilityStatus={userDetails.availabilityStatus}
                  />
                  <CallButton
                    peer={{
                      id: userDetails.id,
                      username: userDetails.username,
                      first_name: userDetails.firstName,
                      last_name: userDetails.lastName,
                    }}
                    type="video"
                    availabilityStatus={userDetails.availabilityStatus}
                  />
                  <UserSafetyActions
                    userId={userDetails.id}
                    userLabel={`@${userDetails.username || 'user'}`}
                    isBlocked={isBlocked}
                    onBlockChange={(nextBlocked) => {
                      setIsBlocked(nextBlocked);
                      setIsBlockedBy(false);
                      if (nextBlocked) {
                        setUserDetails((current) => ({ ...current, isFollowing: false }));
                      }
                    }}
                  />
                </div>
              )}
              {!isAuthenticated && userDetails.id && !isOwnProfile && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="min-w-0 flex-1 text-sm font-medium text-base-content/70">
                    Log in to follow, message, call, or support {displayName}.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-content transition hover:opacity-90"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/register')}
                    className="rounded-xl border border-base-300 px-4 py-2 text-sm font-semibold transition hover:bg-base-200"
                  >
                    Sign up
                  </button>
                </div>
              )}
              {isBlockedBy && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  This creator has blocked you. Messaging and follow actions are unavailable.
                </div>
              )}
              {isBlocked && !isBlockedBy && (
                <div className="mt-3 rounded-xl border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content">
                  You have blocked this creator. Unblock to restore interactions.
                </div>
              )}
            </div>

            {userDetails.membershipTiers.filter((tier) => tier.enabled).length > 0 && (
              <section className="mt-5 rounded-2xl border border-base-300 bg-base-100 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">Memberships</p>
                    <p className="mt-1 text-xs font-medium text-base-content/70">Support options coming soon.</p>
                  </div>
                  <SupportCreatorButton creatorId={userDetails.id} creatorName={displayName} tiers={userDetails.membershipTiers} variant="primary" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {userDetails.membershipTiers.filter((tier) => tier.enabled).map((tier) => (
                    <div key={tier.id} className="rounded-xl border border-base-300 bg-base-200/50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{tier.name}</p>
                        <p className="text-sm font-bold text-primary">{tier.price}</p>
                      </div>
                      <p className="mt-1 text-xs font-medium leading-5 text-base-content/70">{tier.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {bookingSlots.length > 0 && (
              <section className="mt-5 rounded-2xl border border-base-300 bg-base-100 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-bold">
                      <CalendarDays size={16} className="text-primary" />
                      Book a session
                    </p>
                    <p className="mt-1 text-xs font-medium text-base-content/70">Request a time for collabs, mentorship, or consults.</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {bookingSlots.slice(0, 4).map((slot) => (
                    <div key={slot.id} className="rounded-xl border border-base-300 bg-base-200/50 p-3">
                      <p className="font-semibold">{new Date(slot.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      <p className="mt-1 text-xs font-medium capitalize text-base-content/70">{slot.purpose} · {slot.duration_minutes} min</p>
                      {slot.note && <p className="mt-1 text-xs font-medium leading-5 text-base-content/70">{slot.note}</p>}
                      <button
                        type="button"
                        onClick={() => slot.my_request ? router.push(`/messages?user=${userDetails.id}`) : setSelectedSlot(slot)}
                        className={`mt-3 w-full rounded-xl px-3 py-2 text-sm font-bold transition ${
                          slot.my_request ? 'border border-base-300 hover:bg-base-100' : 'bg-primary text-primary-content hover:opacity-90'
                        }`}
                      >
                        {slot.my_request ? slot.my_request.status : 'Request booking'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                {userDetails.isPrivate && !userDetails.isFollowing && !isOwnProfile ? (
                  <div className="rounded-2xl border border-base-300 bg-base-200/60 p-5 text-sm text-base-content/75">
                    <p className="font-semibold text-base-content">Private account</p>
                    <p className="mt-2">This creator has chosen to keep their profile private. Follow to request access to their posts and details.</p>
                  </div>
                ) : userDetails.bio ? (
                  <p className="max-w-3xl whitespace-pre-wrap text-sm leading-6 text-base-content/75">
                    {userDetails.bio}
                  </p>
                ) : (
                  <p className="text-sm font-medium text-base-content/70">This creator has not added a bio yet.</p>
                )}
                {userDetails.skillTags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {userDetails.skillTags.map((skill) => (
                      <span key={skill} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-base-200/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/70">Creator signal</p>
                <p className="mt-2 text-sm font-semibold">{presenceLabel}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-base-content/70">
                  {isProfileActive
                    ? 'This is a good time to connect.'
                    : 'You can still message and they can respond later.'}
                </p>
              </div>
            </div>
          </div>
        </section>

      <section className="mt-8 w-full">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-base-300 pb-3">
          <div>
            <h2 className="text-xl font-bold text-base-content">Posts</h2>
            <p className="mt-1 text-sm font-medium text-base-content/70">Recent uploads from {displayName}</p>
          </div>
          <VideoIcon size={22} className="text-base-content/35" />
        </div>
        {isVideosLoading ? (
          <VideoGridSkeleton count={8} />
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {videos.map((video) => (
              <button
                key={video.id}
                type="button"
                className="group overflow-hidden rounded-2xl border border-base-300 bg-base-100 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => router.push(`/video/${video.id}`)}
              >
                <div className="relative aspect-[9/16] bg-base-200">
                  {video.media_type === "image" || video.thumbnail_url ? (
                    <Image
                      src={video.media_type === "image" ? video.file_url : video.thumbnail_url || video.file_url}
                      alt={video.title}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <video
                      src={video.file_url}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      preload="metadata"
                      muted
                      playsInline
                    />
                  )}
                  <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
                    {video.media_type === "image" ? <ImageIcon size={15} /> : <Play size={15} fill="currentColor" />}
                  </span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-semibold">{video.title || 'Untitled clip'}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-base-content/70">
                    <span>{video.likes || 0} likes</span>
                    <span>{video.timestamp}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : userDetails.isPrivate && !userDetails.isFollowing && !isOwnProfile ? (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-base-200 text-base-content">
              <VideoIcon size={24} />
            </div>
            <p className="font-semibold">Posts are private</p>
            <p className="mt-2 text-sm font-medium text-base-content/70">Follow to request access to this creator's posts.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <VideoIcon size={24} />
            </div>
            <p className="font-semibold">No posts yet</p>
            <p className="mt-2 text-sm font-medium text-base-content/70">When {displayName} uploads, their posts will appear here.</p>
          </div>
        )}
      </section>
      </div>
      {selectedSlot && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 px-4 pb-4 pt-16 backdrop-blur-sm sm:items-center sm:pb-0">
          <div className="w-full max-w-lg rounded-2xl border border-base-300 bg-base-100 p-5 text-base-content shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Booking request</p>
                <h2 className="mt-1 text-lg font-bold">{new Date(selectedSlot.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-base-content/70">Send a short note about what you want to discuss.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-base-200"
                aria-label="Close booking dialog"
              >
                <X size={18} />
              </button>
            </div>
            <textarea
              value={bookingMessage}
              onChange={(event) => setBookingMessage(event.target.value)}
              rows={4}
              placeholder="Tell them what you need help with."
              className="mt-5 w-full rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSelectedSlot(null)} className="rounded-xl border border-base-300 px-4 py-2 text-sm font-bold transition hover:bg-base-200">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void requestBooking()}
                disabled={isBooking}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-content transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {isBooking ? 'Sending...' : 'Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default PublicProfilePage;
