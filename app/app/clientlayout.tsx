'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store/store';
import LogoutButton from './components/layout/LogoutButton';
import Image from 'next/image';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <div className="flex h-screen">
      {isAuthenticated && (
        <aside className="w-[10%] min-w-[60px] h-screen border-r fixed left-0 top-0 bg-white pt-4 z-20 flex flex-col justify-between">
          <nav className="space-y-2 p-2 mt-5">
            <Link href="/" className="flex items-center text-sm mx-4 space-x-2 mb-5">
              <Image src="/home.svg" alt="House icon" width={16} height={16} />
                <span>Home</span>
            </Link>
            <Link href="/about" className="flex items-center text-sm mx-4 space-x-2 mb-5">
              <Image src="/globe.svg" alt="House icon" width={16} height={16} />
                <span>About</span>
            </Link>
            <Link href="/upload" className="flex items-center text-sm mx-4 space-x-2 mt-5">
              <Image src="file.svg" alt="House icon" width={16} height={16} />
                <span>Upload</span>
            </Link>
            <Link href="/profile" className="flex items-center text-sm mx-4 space-x-2 mt-5">
              <Image src="id-card-clip-alt.svg" alt="House icon" width={16} height={16} />
                <span>Profile</span>
            </Link>
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
