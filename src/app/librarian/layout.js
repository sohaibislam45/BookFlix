'use client';

import { useAuth } from '@/contexts/AuthContext';
import RequireAuth from '@/components/RequireAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LibrarianSidebar from '@/components/LibrarianSidebar';
import LibrarianHeader from '@/components/LibrarianHeader';

export default function LibrarianLayout({ children }) {
  const { userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userData && userData.role !== 'librarian' && userData.role !== 'admin') {
      router.push('/member/overview');
    }
  }, [userData, router]);

  return (
    <RequireAuth>
      <div className="flex h-screen w-full bg-background-dark text-white font-display antialiased overflow-hidden">
        <LibrarianSidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}

