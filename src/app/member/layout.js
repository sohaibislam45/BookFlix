'use client';

import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RequireAuth from '@/components/RequireAuth';
import MemberSidebar from '@/components/MemberSidebar';
import MemberHeader from '@/components/MemberHeader';
import NotFound from '@/app/not-found';
import Loader from '@/components/Loader';

export default function MemberLayout({ children }) {
  const { userData, loading } = useAuth();

  // Show loader while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-center">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <RequireAuth>
      {userData && userData.role !== 'member' ? (
        <NotFound />
      ) : (
        <div className="flex h-screen w-full bg-background-dark text-white font-display antialiased overflow-hidden">
          <MemberSidebar />
          <main className="flex-1 flex flex-col h-full overflow-hidden relative">
            <Suspense fallback={<div className="h-20"></div>}>
              <MemberHeader />
            </Suspense>
            <div className="flex-1 overflow-y-auto scroll-smooth">
              {children}
            </div>
          </main>
        </div>
      )}
    </RequireAuth>
  );
}

