'use client';

import { useRouter } from "next/navigation";
import { MouseEvent } from 'react';
import { AppDispatch } from "@/app/store/store";
import { useDispatch } from "react-redux";
import { setUnAuthenticated } from "@/app/store/authSlice";

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
      className="block text-sm hover:underline rounded-md">
        Logout
    </button>
  )
}