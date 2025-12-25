'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function MemberOverviewPage() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    activeLoans: 0,
    outstandingFines: 0,
    activeReservations: 0,
  });

  // TODO: Fetch real data from API when borrowing/reservation APIs are ready
  useEffect(() => {
    // Placeholder for future API calls
  }, []);

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-20 scroll-smooth">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Overview</h2>
            <p className="text-text-secondary text-sm md:text-base">
              Welcome back, {userData?.name || 'User'}. Here's what's happening with your library.
            </p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Current Date</p>
            <p className="text-white font-medium">{currentDate}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Outstanding Fines */}
          <div className="rounded-2xl bg-surface-dark border border-alert-red/30 p-5 flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute inset-y-0 left-0 w-1 bg-alert-red"></div>
            <div className="size-12 rounded-full bg-alert-red/10 flex items-center justify-center text-alert-red flex-shrink-0">
              <span className="material-symbols-outlined">attach_money</span>
            </div>
            <div className="flex flex-col">
              <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Outstanding Fines</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">${stats.outstandingFines.toFixed(2)}</p>
                {stats.outstandingFines > 0 && (
                  <span className="text-xs text-alert-red font-medium">Action Required</span>
                )}
              </div>
            </div>
            {stats.outstandingFines > 0 && (
              <button className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-alert-red text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">
                Pay
              </button>
            )}
          </div>

          {/* Active Loans */}
          <div className="rounded-2xl bg-surface-dark border border-[#3c2348] p-5 flex items-center gap-4">
            <div className="size-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
              <span className="material-symbols-outlined">book</span>
            </div>
            <div className="flex flex-col">
              <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Active Loans</p>
              <p className="text-2xl font-bold text-white">
                {stats.activeLoans} <span className="text-sm font-normal text-text-secondary">/ 10</span>
              </p>
            </div>
          </div>

          {/* Yearly Goal */}
          <div className="rounded-2xl bg-surface-dark border border-[#3c2348] p-5 flex items-center gap-4">
            <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <span className="material-symbols-outlined">emoji_events</span>
            </div>
            <div className="flex flex-col w-full">
              <div className="flex justify-between items-center">
                <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Yearly Goal</p>
                <span className="text-xs text-emerald-400 font-bold">0%</span>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-sm text-text-secondary">books read</p>
              </div>
              <div className="w-full bg-[#1c1022] h-1 rounded-full mt-2">
                <div className="bg-emerald-500 h-full w-[0%] rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Reading Streak */}
          <div className="rounded-2xl bg-surface-dark border border-[#3c2348] p-5 flex items-center gap-4">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined">local_fire_department</span>
            </div>
            <div className="flex flex-col">
              <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Reading Streak</p>
              <p className="text-2xl font-bold text-white">0 Days</p>
            </div>
          </div>
        </div>

        {/* Currently Borrowed Section */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">auto_stories</span>
              Currently Borrowed
            </h3>
            <Link className="text-sm text-primary hover:text-white transition-colors font-medium" href="/member/shelf">
              View all loans
            </Link>
          </div>
          <div className="text-center py-12 text-text-secondary">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-50">auto_stories</span>
            <p className="text-lg">No books currently borrowed</p>
            <Link
              href="/member/browse"
              className="inline-block mt-4 text-primary hover:text-white transition-colors font-medium"
            >
              Browse our collection →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

