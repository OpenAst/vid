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
      className="flex items-center text-sm mx-4 space-x-2 mt-5 hover:underline rounded-md">
        <Image src="id-card-clip-alt.svg" alt="House icon" width={16} height={16} />
          <span>Logout</span>
    </button>

  )
}