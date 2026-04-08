'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import LogoutButton from '@/app/components/layout/LogoutButton';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/store/store';
import { fetchUser, refresh, setUnAuthenticated } from '@/app/store/authSlice';
import Image from 'next/image';
import { lusitana } from './fonts';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Initial theme setup
    const storedTheme = localStorage.getItem('theme') || 'light';
    setDarkMode(storedTheme === 'dark');
    document.documentElement.setAttribute('data-theme', storedTheme);

    // Rehydrate session from cookies on mount
    const rehydrateSession = async () => {
      if (!isAuthenticated) {
        try {
          // Attempt to refresh the access token first
          const result = await dispatch(refresh()).unwrap();
          if (result) {
            // Then fetch user profile
            await dispatch(fetchUser());
          } else {
            dispatch(setUnAuthenticated());
          }
        } catch (err) {
          console.log("No valid session found during rehydration", err);
          dispatch(setUnAuthenticated());
        }
      }
    };

    rehydrateSession();
  }, []);

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [darkMode]);

  return (
    <div className="flex h-screen transition-colors">
      {isAuthenticated && (
        <button
          className="md:hidden fixed top-2 left-[22px] z-50 p-1 rounded-md bg-base-100 shadow-sm border border-base-300"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      )}

      {isAuthenticated && (
        <aside
          className={`${lusitana.className}
            w-[80px] md:w-[100px] h-screen border-r border-base-300 fixed left-0 top-0 bg-base-100 z-40 flex flex-col justify-between transition-all duration-300
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          {/* Nav Icons */}
          <nav className="space-y-10 p-2 mt-12 flex flex-col items-center">
            <Link
              href="/"
              className="flex flex-col items-center justify-center p-2 hover:bg-base-200 rounded text-xs transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/home.svg" alt="Home" width={22} height={22} className="dark:invert" />
              <span className="hidden md:block text-xs mt-1">Home</span>
            </Link>

            <Link
              href="/about"
              className="flex flex-col items-center justify-center p-2 hover:bg-base-200  rounded text-xs transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/globe.svg" alt="About" width={22} height={22} className="dark:invert" />
              <span className="hidden md:block text-xs mt-1">About</span>
            </Link>

            <Link
              href="/upload"
              className="flex flex-col items-center justify-center p-2 hover:bg-base-200  rounded text-xs transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/file.svg" alt="Upload" width={22} height={22} className="dark:invert" />
              <span className="hidden md:block text-xs mt-1">Upload</span>
            </Link>

            <Link
              href="/profile"
              className="flex flex-col items-center justify-center p-2 hover:bg-base-200 rounded text-xs transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/user_icon.png" alt="Profile" width={28} height={28} className="dark:invert" />
              <span className="hidden md:block text-xs mt-1">Profile</span>
            </Link>
          </nav>

          <div className="p-2 mb-10 space-y-4 flex flex-col items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full text-xs flex items-center justify-center px-2 py-2 rounded-lg bg-base-200 hover:bg-base-300 transition-colors"
            >
              {darkMode ? '☀️' : '🌙'}
              <span className="hidden md:inline ml-1 font-medium">{darkMode ? 'Light' : 'Dark'}</span>
            </button>

            <div className="w-full">
              <LogoutButton />
            </div>
          </div>
        </aside>
      )}
      <div className="w-full h-full mx-auto">{children}</div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-opacity-25 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
