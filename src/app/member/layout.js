'use client';

import { Suspense } from 'react';
import RequireAuth from '@/components/RequireAuth';
import MemberSidebar from '@/components/MemberSidebar';
import MemberHeader from '@/components/MemberHeader';

export default function MemberLayout({ children }) {
  return (
    <RequireAuth>
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
    </RequireAuth>
  );
}

