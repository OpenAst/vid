'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store/store';
import LogoutButton from './components/layout/LogoutButton';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <div className="flex h-screen">
      {isAuthenticated && (
        <aside className="w-[5%] min-w-[60px] h-screen border-r fixed left-0 top-0 bg-white pt-4 z-20 flex flex-col justify-between">
          <nav className="space-y-2 p-2">
            <Link href="/" className="block text-sm">Home</Link>
            <Link href="/about" className="block text-sm">About</Link>
            <Link href="/upload" className="block text-sm">Upload</Link>
            <Link href="/profile" className="block text-sm">Profile</Link>
          </nav>

          <div className="p-2">
            <LogoutButton />
          </div>
        </aside>
      )}

      <div 
        className={`flex-1 flex flex-col items-center justify-center p-4 transition-all duration-300 ${
          isAuthenticated ? 'pl-[60px]' : ''
        }`}
      >
        <div className="w-full max-w-screen-lg mx-auto">{children}</div>
      </div>
    </div>
  );
}
