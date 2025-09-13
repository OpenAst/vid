'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import LogoutButton from '@/app/components/layout/LogoutButton';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store/store';
import Image from 'next/image';
import { lusitana } from './fonts';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || 'light';
    setDarkMode(storedTheme === 'dark');
    document.documentElement.setAttribute('data-theme', storedTheme);
  }, []);

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [darkMode]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      {/* Mobile Hamburger */}
      {isAuthenticated && (
        <button
          className="md:hidden fixed top-2 left-4 z-30 p-2 rounded-md dark:bg-gray-800 bg-white shadow-sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {isAuthenticated && (
        <aside
          className={`${lusitana.className}
            w-[70px] md:w-[100px] h-screen border-r fixed left-0 top-0 bg-white z-20 
            dark:bg-gray-900 flex flex-col justify-between transition-all duration-300
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          {/* Nav Icons */}
          <nav className="space-y-10 p-2 mt-20 flex flex-col items-center">
            <Link
              href="/"
              className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/home.svg" alt="Home" width={22} height={22} />
              <span className="hidden md:block text-xs mt-1">Home</span>
            </Link>

            <Link
              href="/about"
              className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/globe.svg" alt="About" width={22} height={22} />
              <span className="hidden md:block text-xs mt-1">About</span>
            </Link>

            <Link
              href="/upload"
              className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/file.svg" alt="Upload" width={22} height={22} />
              <span className="hidden md:block text-xs mt-1">Upload</span>
            </Link>

            <Link
              href="/profile"
              className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/user_icon.png" alt="Profile" width={28} height={28} />
              <span className="hidden md:block text-xs mt-1">Profile</span>
            </Link>
          </nav>

          {/* Bottom Controls */}
          <div className="p-2 mb-8 space-y-2 flex flex-col items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full text-xs flex items-center justify-center px-2 py-1 rounded dark:bg-gray-700"
            >
              {darkMode ? '☀️' : '🌙'}
              <span className="hidden md:inline ml-1">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <div className="w-full">
              <LogoutButton />
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div
        className={`
          flex-1 flex flex-col items-center justify-center p-2 transition-all duration-300
          ${isAuthenticated ? 'md:pl-[100px]' : ''}
        `}
      >
        <div className="w-full max-w-screen-lg mx-auto">{children}</div>
      </div>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-10 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
