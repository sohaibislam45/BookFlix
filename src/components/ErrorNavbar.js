'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import UserProfile from '@/components/UserProfile';

export default function ErrorNavbar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-border-dark bg-background-dark/95 backdrop-blur-md px-6 py-3 lg:px-10">
      <Link href="/" className="flex items-center gap-4 text-white">
        <div className="flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[32px]">auto_stories</span>
        </div>
        <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">Bookflix</h2>
      </Link>
      <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
        <nav className="flex items-center gap-9">
          <Link href="/" className="text-white/80 hover:text-primary transition-colors text-sm font-medium leading-normal">
            Home
          </Link>
          <Link href="/member/browse" className="text-white/80 hover:text-primary transition-colors text-sm font-medium leading-normal">
            Browse
          </Link>
          {user && (
            <>
              <Link href="/member/shelf" className="text-white/80 hover:text-primary transition-colors text-sm font-medium leading-normal">
                My List
              </Link>
              <Link href="/member/notifications" className="text-white/80 hover:text-primary transition-colors text-sm font-medium leading-normal">
                History
              </Link>
            </>
          )}
        </nav>
        {user ? (
          <UserProfile />
        ) : (
          <div className="bg-center bg-no-repeat bg-cover rounded-full size-10 border border-border-dark ring-2 ring-transparent hover:ring-primary/50 transition-all cursor-pointer flex items-center justify-center">
            <Link href="/login" className="text-white text-sm font-medium">Sign In</Link>
          </div>
        )}
      </div>
      {/* Mobile Menu Icon */}
      <div className="md:hidden text-white cursor-pointer">
        <span className="material-symbols-outlined">menu</span>
      </div>
    </header>
  );
}
