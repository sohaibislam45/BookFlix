'use client';

import { useAuth } from '@/contexts/AuthContext';
import RequireAuth from '@/components/RequireAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }) {
  const { userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      // Redirect based on role
      if (userData.role === 'librarian') {
        router.push('/librarian/overview');
      } else {
        router.push('/member/overview');
      }
    }
  }, [userData, router]);

  return (
    <RequireAuth>
      <div className="flex h-screen w-full bg-background-dark text-white font-display antialiased overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}

