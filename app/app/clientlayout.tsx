'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usePathname, useRouter } from 'next/navigation';
import { RootState, AppDispatch } from '@/app/store/store';
import { fetchUser, refresh, setUnAuthenticated } from '@/app/store/authSlice';
import { lusitana } from './fonts';
import CallProvider from '@/app/components/calls/CallProvider';
import PushRegistration from '@/app/components/calls/PushRegistration';
import NotificationsButton from '@/app/components/layout/NotificationsButton';
import { UploadProvider } from '@/app/components/upload/UploadProvider';
import {
  BarChart3,
  Bookmark,
  BriefcaseBusiness,
  Clock,
  Compass,
  Home,
  MessageCircle,
  MoreHorizontal,
  Moon,
  Search,
  Settings,
  Sun,
  UploadCloud,
  User,
} from 'lucide-react';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isBootstrapped, user } = useSelector((state: RootState) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isMoreOpen) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        moreMenuRef.current &&
        !moreMenuRef.current.contains(target) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(target)
      ) {
        setIsMoreOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMoreOpen]);

  useEffect(() => {
    // Initial theme setup
    let storedTheme = 'light';

    try {
      storedTheme = localStorage.getItem('theme') || 'light';
    } catch (error) {
      console.warn("Unable to read stored theme", error);
    }

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
    if (!isBootstrapped || !isAuthenticated || !user) return;

    const authRoutes = ['/login', '/register', '/activate', '/password-reset'];
    const isAuthRoute = authRoutes.some((route) => pathname?.startsWith(route));
    const isOnboardingRoute = pathname === '/onboarding';
    const hasCompletedOnboarding = Boolean(user.profile?.onboarding_completed);

    if (!hasCompletedOnboarding && !isOnboardingRoute && !isAuthRoute) {
      router.replace('/onboarding');
      return;
    }

    if (hasCompletedOnboarding && isOnboardingRoute) {
      router.replace('/');
    }
  }, [isAuthenticated, isBootstrapped, pathname, router, user]);

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.warn("Unable to persist theme", error);
    }
  }, [darkMode]);

  const primaryNavItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/discover', label: 'Discover', icon: Compass },
    { href: '/upload', label: 'Upload', icon: UploadCloud },
    { href: '/messages', label: 'Messages', icon: MessageCircle },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const secondaryNavItems = [
    { href: '/search', label: 'Search', icon: Search },
    { href: '/collabs', label: 'Collabs', icon: BriefcaseBusiness },
    { href: '/saved', label: 'Saved', icon: Bookmark },
    { href: '/history', label: 'History', icon: Clock },
    { href: '/creator', label: 'Creator Hub', icon: BarChart3 },
  ];

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsMoreOpen(false);
  };

  const isActivePath = (href: string) => (
    href === '/' ? pathname === '/' : Boolean(pathname?.startsWith(href))
  );

  return (
    <div className="flex min-h-[100dvh] transition-colors">
      {isAuthenticated && (
        <button
          className="fixed left-3 top-[calc(var(--safe-area-top)+6px)] z-50 rounded-md border border-base-300 bg-base-100 p-1 shadow-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
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
            fixed left-0 top-0 z-40 flex min-h-[100dvh] w-[80px] flex-col justify-between border-r border-base-300 bg-base-100 transition-all duration-300 md:w-[100px]
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <nav className="mt-12 flex flex-col items-center gap-2 p-2">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex w-full flex-col items-center justify-center rounded-xl px-2 py-2.5 text-xs transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                  }`}
                  onClick={closeMenus}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={20} />
                  <span className="hidden md:block text-xs mt-1">{item.label}</span>
                </Link>
              );
            })}

            <div className="relative w-full" ref={moreMenuRef}>
              <button
                type="button"
                ref={moreButtonRef}
                onClick={() => setIsMoreOpen((current) => !current)}
                className={`flex w-full flex-col items-center justify-center rounded-xl px-2 py-2.5 text-xs transition-colors ${
                  isMoreOpen
                    ? 'bg-base-200 text-base-content'
                    : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                }`}
                aria-expanded={isMoreOpen}
                aria-label="Open more navigation"
              >
                <MoreHorizontal size={20} />
                <span className="hidden md:block text-xs mt-1">More</span>
              </button>

              {isMoreOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsMoreOpen(false)} aria-hidden="true" />
              )}

              {isMoreOpen && (
                <div className="absolute left-[calc(100%+10px)] top-0 z-50 w-52 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-2xl">
                  <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-base-content/40">More</p>
                  {secondaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActivePath(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenus}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-content'
                            : 'text-base-content/75 hover:bg-base-200 hover:text-base-content'
                        }`}
                      >
                        <Icon size={18} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          <div className="mb-4 flex flex-col items-center gap-2 border-t border-base-300 p-2 pt-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex w-full items-center justify-center rounded-xl bg-base-200 px-2 py-2 text-xs transition-colors hover:bg-base-300"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
              <span className="ml-1 hidden font-medium md:inline">{darkMode ? 'Light' : 'Dark'}</span>
            </button>

            <NotificationsButton />

            <Link
              href="/settings"
              onClick={closeMenus}
              className="flex w-full items-center justify-center rounded-xl px-2 py-2 text-xs text-base-content transition-colors hover:bg-base-200"
              aria-label="Open settings"
            >
              <Settings size={18} />
              <span className="ml-1 hidden font-medium md:inline">Settings</span>
            </Link>
          </div>
        </aside>
      )}
      <CallProvider>
        <UploadProvider>
          <PushRegistration />
          <div className="w-full h-full mx-auto">{children}</div>
        </UploadProvider>
      </CallProvider>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
