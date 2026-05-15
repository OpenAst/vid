'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store/store';
import Feed, { type FeedMode } from '@/app/components/video/Feed';
import { useRouter } from 'next/navigation';
import { Clock, Plus, Sparkles, Users } from "lucide-react";
import Header from './components/layout/Header';
import FeedSkeleton from './components/video/FeedSkeleton';
import PeopleToFollow from './components/discovery/PeopleToFollow';

const FEED_TABS: Array<{ mode: FeedMode; label: string; icon: React.ReactNode }> = [
  { mode: "for-you", label: "For You", icon: <Sparkles size={14} /> },
  { mode: "following", label: "Following", icon: <Users size={14} /> },
  { mode: "latest", label: "Latest", icon: <Clock size={14} /> },
];

function HomePage() {
  const { isAuthenticated, isLoading, isBootstrapped, token } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const [feedMode, setFeedMode] = useState<FeedMode>("for-you");
  const [selectedCategory, setSelectedCategory] = useState("");

  const feedNav = (
    <div className="flex w-full max-w-[360px] rounded-full border border-base-300 bg-base-100 p-1 shadow-sm">
      {FEED_TABS.map((tab) => {
        const active = feedMode === tab.mode;
        return (
          <button
            key={tab.mode}
            type="button"
            onClick={() => {
              setFeedMode(tab.mode);
              setSelectedCategory("");
            }}
            className={`flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-semibold transition sm:gap-1.5 sm:text-xs ${
              active ? "bg-base-content text-base-100" : "text-base-content/65 hover:bg-base-200"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  useEffect(() => {
    if (isBootstrapped && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isBootstrapped, isLoading, isAuthenticated, router]);

  if (!isBootstrapped || isLoading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden bg-base-100">
        <Header />
        <div className="mt-[var(--app-header-height)] h-[var(--feed-shell-height)] w-full overflow-y-hidden">
          <FeedSkeleton count={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden bg-base-100 transition-colors">
      <Header centerContent={feedNav} />
      {isAuthenticated && <PeopleToFollow />}

      <div className="mt-[var(--app-header-height)] h-[var(--feed-shell-height)] w-full flex flex-col items-center">
        <Feed jwtToken={token} feedMode={feedMode} selectedCategory={selectedCategory} />

        <button
          onClick={() => router.push("/upload")}
          className="fixed left-1/2 z-30 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-white/90 text-black shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-all hover:scale-110 active:scale-95"
          style={{ bottom: "var(--feed-floating-offset)" }}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}

export default HomePage;
