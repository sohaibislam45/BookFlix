'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NotificationBell from './NotificationBell';
import UserProfile from './UserProfile';

export default function MemberHeader({ onSearch, initialSearch = '' }) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      router.push(`/member/explore?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="w-full h-20 px-8 flex items-center justify-between border-b border-[#3c2348]/30 bg-[#1c1022]/80 backdrop-blur-md z-10 sticky top-0">
      <form onSubmit={handleSearch} className="flex-1 max-w-lg">
        <label className="relative group">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary group-focus-within:text-primary transition-colors">
            <span className="material-symbols-outlined">search</span>
          </span>
          <input
            className="w-full py-2.5 pl-10 pr-4 text-sm text-white bg-surface-dark border border-[#3c2348] rounded-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-text-secondary/70 transition-all"
            placeholder="Search titles, authors, ISBNs..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
      </form>
      <div className="flex items-center gap-4 ml-4">
        <NotificationBell />
        <UserProfile />
        <button className="md:hidden p-2 text-white">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
    </header>
  );
}

