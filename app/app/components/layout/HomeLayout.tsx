'use client';

import React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store/store';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <div className="flex h-screen">
      {isAuthenticated && (
        <div className="w-1/6 h-screen border-r fixed left-0 top-0 bg-white pt-4 z-20">
          <nav className="space-y-2 p-2">
            <Link href="/" className="block text-sm">Home</Link>
            <Link href="/about" className="block text-sm">About</Link>
            <Link href="/upload" className="block text-sm">Upload</Link>
            <Link href="/profile" className="block text-sm">Profile</Link>
          </nav>
        </div>
      )}

      <div className={`flex-1 flex flex-col items-center p-4 ${isAuthenticated ? 'pl-[16.67%]' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default Layout;
