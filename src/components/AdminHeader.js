'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NotificationBell from './NotificationBell';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminHeader({ title = 'Admin Dashboard', subtitle, onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { userData } = useAuth();

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      router.push(`/admin/overview?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="h-20 shrink-0 px-8 flex items-center justify-between border-b border-white/5 bg-background-dark/80 backdrop-blur-xl sticky top-0 z-10">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          {title}
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/20">ADMIN</span>
        </h2>
        <p className="text-xs text-white/40 font-medium">
          {subtitle || `Welcome back, ${userData?.name?.split(' ')[0] || 'Admin'}.`}
        </p>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative w-80 group hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors text-[20px]">search</span>
          <form onSubmit={handleSearch}>
            <input
              className="w-full h-10 pl-10 pr-12 bg-surface-dark border border-white/5 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/5 transition-all"
              placeholder="Search..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 pointer-events-none">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold text-white/30 bg-white/5 rounded border border-white/5 font-mono">⌘K</kbd>
          </div>
        </div>
        <div className="h-6 w-px bg-white/10 hidden md:block"></div>
        <NotificationBell />
      </div>
    </header>
  );
}

