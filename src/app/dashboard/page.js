'use client';

import { useAuth } from '@/contexts/AuthContext';
import RequireAuth from '@/components/RequireAuth';
import Link from 'next/link';
import UserProfile from '@/components/UserProfile';

export default function DashboardPage() {
  const { user, userData } = useAuth();

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background-dark text-white">
        <header className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-primary">auto_stories</span>
              <h1 className="text-white text-2xl font-black tracking-tighter">Bookflix</h1>
            </Link>
            <div className="flex items-center gap-4">
              <UserProfile />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Welcome back, {userData?.name || 'User'}!</h1>
            <p className="text-gray-400">Your personal library dashboard</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">My Books</h2>
              <p className="text-gray-400">No books borrowed yet</p>
            </div>
            <div className="glass-panel rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Reservations</h2>
              <p className="text-gray-400">No active reservations</p>
            </div>
            <div className="glass-panel rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Fines</h2>
              <p className="text-gray-400">No outstanding fines</p>
            </div>
          </div>

          <div className="mt-8 glass-panel rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Account Information</h2>
            <div className="space-y-2 text-gray-300">
              <p><span className="font-semibold">Email:</span> {userData?.email || user?.email}</p>
              <p><span className="font-semibold">Role:</span> {userData?.role || 'member'}</p>
              <p><span className="font-semibold">Subscription:</span> {userData?.subscription?.type || 'free'}</p>
            </div>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}

