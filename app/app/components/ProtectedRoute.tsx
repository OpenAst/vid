'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const router = useRouter();

  useEffect(() => {
    const accessToken = localStorage.getItem('ACCESS_TOKEN');
    console.log('Access Token', accessToken);

    if (!accessToken) {
      router.push('/login');
    }
  }, [router]);

  return <>{children}</>;
};

export default ProtectedRoute;
