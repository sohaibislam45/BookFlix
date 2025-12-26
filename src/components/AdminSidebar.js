'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { userData } = useAuth();

  const isActive = (path) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  const navItems = [
    { href: '/admin/overview', label: 'Overview', icon: 'dashboard' },
    { href: '/admin/members', label: 'Member Management', icon: 'group' },
    { href: '/admin/books', label: 'Books Management', icon: 'library_books' },
    { href: '/admin/staff', label: 'Staff Management', icon: 'badge' },
    { href: '/admin/finance', label: 'Finances', icon: 'payments' },
    { href: '/admin/config', label: 'System Configuration', icon: 'settings' },
  ];

  return (
    <aside className="w-72 h-full hidden lg:flex flex-col border-r border-white/5 bg-[#1a1021] shrink-0 transition-all duration-300 relative z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="relative group">
          <div className="absolute inset-0 bg-primary blur opacity-40 group-hover:opacity-60 transition-opacity duration-500 rounded-lg"></div>
          <div className="relative bg-gradient-to-br from-primary to-purple-800 size-10 rounded-lg flex items-center justify-center shadow-xl shadow-primary/20 border border-white/10">
            <span className="material-symbols-outlined text-white">auto_stories</span>
          </div>
        </div>
        <div className="flex flex-col">
          <h1 className="text-white text-lg font-bold tracking-tight">Bookflix</h1>
          <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Admin Console</p>
        </div>
      </div>
      <nav className="flex-1 px-4 py-2 flex flex-col gap-1 overflow-y-auto">
        <div className="px-4 py-2">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Main Menu</p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group text-white/60 hover:bg-white/5 hover:text-white"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">home</span>
          <span className="text-sm font-medium">Home</span>
        </Link>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                active
                  ? 'bg-primary/10 text-primary border border-primary/10'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${active ? 'fill' : ''} ${!active ? 'group-hover:scale-110 transition-transform' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#2a1d33] border border-white/5 hover:border-white/10 hover:bg-white/10 cursor-pointer transition-all">
          <div className="size-9 rounded-full border border-white/10 ring-2 ring-transparent group-hover:ring-primary/50 transition-all overflow-hidden bg-[#3c2348] flex items-center justify-center">
            {userData?.profilePhoto ? (
              <img
                src={`/api/image-proxy?url=${encodeURIComponent(userData.profilePhoto)}`}
                alt={userData?.name || 'Admin'}
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`w-full h-full flex items-center justify-center text-white text-sm font-bold ${userData?.profilePhoto ? 'hidden' : ''}`}
            >
              {userData?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{userData?.name || 'Admin'}</p>
            <p className="text-[11px] text-white/40 truncate">System Administrator</p>
          </div>
          <span className="material-symbols-outlined text-white/30 ml-auto text-sm">expand_more</span>
        </div>
      </div>
    </aside>
  );
}

