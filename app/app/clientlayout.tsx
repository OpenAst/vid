'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import LogoutButton from '@/app/components/layout/LogoutButton'
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store/store';
import Image from 'next/image';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
    setSearchOpen(false);
  };

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

      {searchOpen && (
        <div className='fixed inset-0 bg-white bg-opacity-25 z-20 items-end justify-center pt-15'>
          <div className='bg-white p-2 rounded-lg w-full max-w-md'>
            <form onSubmit={handleSearch} className="flex">
              <input 
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search...'
                className='flex-1 border rounded-l px-4 py-2 focus:ring-2 focus:ring-blue-400'
                autoFocus
              />
              <button 
                type='submit'
                className='bg-blue-500 text-white 
                px-2 py-2 rounded-r hover:bg-blue-500'>
                    Search
              </button>
            </form>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className='absolute top-2 right-2
                text-gray-500 hover:text-gray-800'
              >
                ✕
              </button>
            )}
            
            <button
              onClick={() => setSearchOpen(false)}
              className='absolute top-2 right-2 text-gray-500 hover:text-gray-800'
            >
              
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Adjusted padding */}
      <div 
        className={`
          flex-1 flex flex-col items-center justify-center p-2 transition-all duration-300
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

      <div className='p-2'>
        <button 
          onClick={() => setSearchOpen(!searchOpen)}
          className='w-full flex flex-col items-center p-2 hover:bg-gray-100 rounded'
          aria-label='Search'
          >
            <FiSearch className='w-5 h-5' />
            <span className='text-xs mt-1 hidden md:block'>Search</span>
        </button>
          </div>
    </div>
  );
}