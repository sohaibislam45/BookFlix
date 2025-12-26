'use client';

import { useAuth } from '@/contexts/AuthContext';
import RequireAuth from '@/components/RequireAuth';
import AdminSidebar from '@/components/AdminSidebar';
import NotFound from '@/app/not-found';
import Loader from '@/components/Loader';

export default function AdminLayout({ children }) {
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
      {userData && userData.role !== 'admin' ? (
        <NotFound />
      ) : (
        <div className="flex h-screen w-full bg-background-dark text-white font-display antialiased overflow-hidden">
          <AdminSidebar />
          <main className="flex-1 flex flex-col h-full overflow-hidden relative">
            {children}
          </main>
        </div>
      )}
    </RequireAuth>
  );
}

