'use client';

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import Feed from './components/video/Feed';
import { useRouter } from 'next/navigation';
import { setUnAuthenticated } from '@/app/store/authSlice';
import { Plus } from "lucide-react";
import Header from './components/layout/Header';
import FeedSkeleton from './components/video/FeedSkeleton';


function HomePage() {
  const { isAuthenticated, isLoading, isBootstrapped, token } = useSelector((state: RootState) => state.auth);
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    if (isBootstrapped && !isLoading && !isAuthenticated) {
      dispatch(setUnAuthenticated());
      router.replace('/login');
    }
  }, [isBootstrapped, isLoading, isAuthenticated, dispatch, router]);

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
      <Header />

      <div className="mt-[var(--app-header-height)] h-[var(--feed-shell-height)] w-full flex flex-col items-center">
        <Feed jwtToken={token} />

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
