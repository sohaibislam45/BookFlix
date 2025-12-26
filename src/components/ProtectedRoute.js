'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/lib/constants';
import Loader from './Loader';
import NotFound from '@/app/not-found';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-center">
          <Loader />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check role authorization - show 404 if unauthorized
  if (allowedRoles.length > 0 && userData && !allowedRoles.includes(userData.role)) {
    return <NotFound />;
  }

  return <>{children}</>;
}

