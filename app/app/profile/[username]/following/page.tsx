'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import UserAvatar from '@/app/components/common/UserAvatar';

function FollowingPage() {
  const { username } = useParams();
  const safeUsername = Array.isArray(username) ? username[0] : username || '';
  const router = useRouter();
  const [following, setFollowing] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!safeUsername) {
      router.push('/profile');
      return;
    }

    const loadFollowing = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const profileRes = await fetch(`/api/auth/profile?username=${encodeURIComponent(safeUsername)}`);
        if (!profileRes.ok) {
          throw new Error('Profile not found');
        }
        const profileData = await profileRes.json();
        const userId = profileData.id;

        const followingRes = await fetch(`/api/auth/users/${userId}/following/`);
        if (!followingRes.ok) {
          throw new Error('Unable to load following list');
        }
        const data = await followingRes.json();
        setFollowing(data.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load following list');
      } finally {
        setIsLoading(false);
      }
    };

    void loadFollowing();
  }, [safeUsername, router]);

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-10 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Following</h1>
            <p className="mt-1 text-sm font-medium text-base-content/70">People @{safeUsername} is following</p>
          </div>
          <Link href={`/profile/${safeUsername}`} className="btn btn-ghost btn-sm">
            Back to profile
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="animate-pulse rounded-3xl border border-base-300 bg-base-200/60 p-4" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        ) : following.length === 0 ? (
          <div className="rounded-3xl border border-base-300 bg-base-200/60 p-6 text-base-content/70">
            <p className="text-lg font-semibold">Not following anyone yet</p>
            <p className="mt-2">This creator can start discovering peers and collaborators by following other creators.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {following.map((profile) => (
              <Link
                key={profile.id}
                href={`/profile/${profile.username}`}
                className="group flex items-center gap-4 overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-4 transition hover:border-primary/80 hover:bg-base-200"
              >
                <UserAvatar
                  user={{ username: profile.username, first_name: profile.first_name, last_name: profile.last_name }}
                  size={56}
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-base-content">{profile.first_name} {profile.last_name}</p>
                  <p className="truncate text-sm font-medium text-base-content/70">@{profile.username}</p>
                  {profile.profile?.bio && <p className="mt-2 line-clamp-2 text-sm font-medium text-base-content/70">{profile.profile.bio}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default FollowingPage;
