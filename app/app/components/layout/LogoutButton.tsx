'use client';

import { useRouter } from "next/navigation";
import { MouseEvent } from 'react';
import { AppDispatch } from "@/app/store/store";
import { useDispatch } from "react-redux";
import { setUnAuthenticated } from "@/app/store/authSlice";
import Image from 'next/image';

type LogoutButtonProps = {
  variant?: "default" | "danger";
};

export default function LogoutButton({ variant = "default" }: LogoutButtonProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const handleLogout = async (e: MouseEvent) => {
    e.preventDefault();

    const confirm = window.confirm("Are you sure you want to log out ?");
    if (!confirm) return;

    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        dispatch(setUnAuthenticated());
        // Reset theme to light on logout
        localStorage.setItem('theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
        router.push('/login');
      } else {
        const data = await res.json();
        console.error("Logout failed", data);
        alert("Logout failed. Please try again");
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert("An error occurred during logout.");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
        variant === "danger"
          ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          : "text-base-content hover:bg-base-200"
      }`}
    >
      <Image src="new_logout.svg" alt="Logout" width={16} height={16} className="dark:invert" />
      <span>Logout</span>
    </button>
  )
}
