'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function MemberSidebar() {
  const pathname = usePathname();
  const { userData } = useAuth();

  const isActive = (path) => {
    return pathname === path;
  };

  const navItems = [
    { href: '/member/overview', label: 'Overview', icon: 'home' },
    { href: '/member/browse', label: 'Browse', icon: 'explore' },
    { href: '/member/shelf', label: 'My Shelf', icon: 'shelves' },
    { href: '/member/reservations', label: 'Reservations', icon: 'event_seat' },
    { href: '/member/billing', label: 'Billing & Profile', icon: 'receipt_long' },
  ];

  const subscriptionType = userData?.subscription?.type || 'free';
  const memberType = subscriptionType === 'free' ? 'Standard Member' : 'Premium Member';

  return (
    <aside className="w-64 flex-shrink-0 border-r border-[#3c2348]/50 bg-[#1c1022] hidden md:flex flex-col justify-between p-4">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-primary/20 p-2 rounded-lg text-primary">
            <span className="material-symbols-outlined text-3xl">local_library</span>
          </div>
          <h1 className="text-white text-xl font-bold tracking-tight">Bookflix</h1>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'hover:bg-surface-hover text-text-secondary hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined ${active ? 'fill-1' : ''}`}>
                  {item.icon}
                </span>
                <p className="text-sm font-medium">{item.label}</p>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-dark border border-[#3c2348]">
        <div
          className="size-10 rounded-full bg-cover bg-center"
          style={{
            backgroundImage: userData?.profilePhoto
              ? `url('${userData.profilePhoto}')`
              : 'none',
            backgroundColor: userData?.profilePhoto ? 'transparent' : '#3c2348',
          }}
        >
          {!userData?.profilePhoto && (
            <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
              {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate">
            {userData?.name || 'User'}
          </p>
          <p className="text-xs text-text-secondary">{memberType}</p>
        </div>
      </div>
    </aside>
  );
}

