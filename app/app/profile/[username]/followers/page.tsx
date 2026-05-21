'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import UserAvatar from '@/app/components/common/UserAvatar';
import { UserPlus } from 'lucide-react';

function FollowersPage() {
  const { username } = useParams();
  const safeUsername = Array.isArray(username) ? username[0] : username || '';
  const router = useRouter();
  const [followers, setFollowers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!safeUsername) {
      router.push('/profile');
      return;
    }

    const loadFollowers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const profileRes = await fetch(`/api/auth/profile?username=${encodeURIComponent(safeUsername)}`);
        if (!profileRes.ok) {
          throw new Error('Profile not found');
        }
        const profileData = await profileRes.json();
        const userId = profileData.id;

        const followersRes = await fetch(`/api/auth/users/${userId}/followers/`);
        if (!followersRes.ok) {
          throw new Error('Unable to load followers');
        }
        const data = await followersRes.json();
        setFollowers(data.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load followers');
      } finally {
        setIsLoading(false);
      }
    };

    void loadFollowers();
  }, [safeUsername, router]);

  return (
    <main className="min-h-[100dvh] bg-base-100 px-4 pb-10 pt-[calc(var(--app-header-height)+18px)] text-base-content md:pl-[124px] md:pr-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Followers</h1>
            <p className="mt-1 text-sm font-medium text-base-content/70">People who follow @{safeUsername}</p>
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
        ) : followers.length === 0 ? (
          <div className="rounded-3xl border border-base-300 bg-base-200/60 p-6 text-base-content/70">
            <p className="text-lg font-semibold">No followers yet</p>
            <p className="mt-2">This creator is just getting started—share their profile to help them grow.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {followers.map((follower) => (
              <Link
                key={follower.id}
                href={`/profile/${follower.username}`}
                className="group flex items-center gap-4 overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-4 transition hover:border-primary/80 hover:bg-base-200"
              >
                <UserAvatar
                  user={{ username: follower.username, first_name: follower.first_name, last_name: follower.last_name }}
                  size={56}
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-base-content">{follower.first_name} {follower.last_name}</p>
                  <p className="truncate text-sm font-medium text-base-content/70">@{follower.username}</p>
                  {follower.profile?.bio && <p className="mt-2 line-clamp-2 text-sm font-medium text-base-content/70">{follower.profile.bio}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default FollowersPage;
