import React, { useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from "../store/store";


export default function ProtectedRoute({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const { isAuthenticated, isBootstrapped } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isBootstrapped && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isBootstrapped, router]);

  return isBootstrapped && isAuthenticated ? <>{children}</> : null;
}
