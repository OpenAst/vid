import React, { useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from "../store/store";


export default function ProtectedRoute({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  return isAuthenticated ? <>{children}</> : null;
}