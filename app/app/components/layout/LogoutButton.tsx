'use client';

import { useRouter } from "next/navigation";
import { MouseEvent } from 'react';
import { AppDispatch } from "@/app/store/store";
import { useDispatch } from "react-redux";
import { setUnAuthenticated } from "@/app/store/authSlice";
import Image from 'next/image';


export default function LogoutButton() {
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
      className="flex flex-col md:flex-row items-center
       justify-center hover:bg-gray-100 text-xs w-full"
    >
      <Image src="new_logout.svg" alt="Logout" width={18} height={20} />
      <span className="hidden md:inline mt-1 md:mt-0 md:ml-2">Logout</span>
    </button>
  )
}