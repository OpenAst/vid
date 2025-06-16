'use client';

import Link from 'next/link';
import { useState } from 'react';
import LogoutButton from '@/app/components/layout/LogoutButton'
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store/store';
import Image from 'next/image';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Mobile Hamburger Button */}
      {isAuthenticated && (
        <button
          className="md:hidden fixed top-2 left-4 z-30 p-2 rounded-md bg-white shadow-sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

      {/* Sidebar/Navbar - Now narrower */}
      {isAuthenticated && (
        <aside
          className={`
            w-[75px] md:w-[80px] h-screen border-r fixed left-0 top-0 bg-white z-20 
            flex flex-col justify-between transition-all duration-300
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <nav className="space-y-4 p-2 mt-10">
            <Link 
              href="/" 
              className="flex flex-col md:flex-row items-center justify-center p-2 hover:bg-gray-100 rounded text-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/home.svg" alt="Home" width={18} height={18} />
              <span className="hidden md:inline mt-1 md:mt-0 md:ml-2">Home</span>
            </Link>
            <Link 
              href="/about" 
              className="flex flex-col md:flex-row items-center justify-center p-2 hover:bg-gray-100 rounded text-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/globe.svg" alt="About" width={18} height={18} />
              <span className="hidden md:inline mt-1 md:mt-0 md:ml-2">About</span>
            </Link>
            <Link 
              href="/upload" 
              className="flex flex-col md:flex-row items-center justify-center p-2 hover:bg-gray-100 rounded text-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="file.svg" alt="Upload" width={18} height={18} />
              <span className="hidden md:inline mt-1 md:mt-0 md:ml-2">Upload</span>
            </Link>
            <Link 
              href="/profile" 
              className="flex flex-col md:flex-row items-center justify-center p-2 hover:bg-gray-100 rounded text-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/user_icon.png" alt="Profile" width={24} height={24} />
              <span className="hidden md:inline mt-1 md:mt-0 md:ml-2">Profile</span>
            </Link>
          </nav>
          <div className="p-2 hover:bg-gray-100 mb-2 rounded">
            <LogoutButton />
          </div>
        </aside>
      )}

      {/* Main Content - Adjusted padding */}
      <div 
        className={`
          flex-1 flex flex-col items-center justify-center p-4 transition-all duration-300
          ${isAuthenticated ? 'md:pl-[80px]' : ''}
        `}
      >
        <div className="w-full max-w-screen-lg mx-auto">{children}</div>
      </div>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-10 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}