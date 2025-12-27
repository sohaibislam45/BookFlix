'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LibrarianHeader from '@/components/LibrarianHeader';
import Link from 'next/link';
import { formatDate, formatDateTime } from '@/lib/utils';
import Loader from '@/components/Loader';

export default function LibrarianOverviewPage() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    todayActivities: 0,
    pendingReturns: 0,
    returnsDueToday: 0,
    overdueBooks: 0,
    recentlyOverdue: 0,
    recentReservations: 0,
    reservationsAwaitingPickup: 0,
    totalCatalog: 0,
    recentActivity: [],
    newMembers: [],
  });
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState('all');

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/librarian/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Error fetching stats:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivity = stats.recentActivity.filter((activity) => {
    if (activityFilter === 'returns') {
      return activity.status === 'Returned';
    }
    if (activityFilter === 'overdue') {
      return activity.status === 'Overdue Notice';
    }
    return true;
  });

  const getStatusBadgeClass = (statusColor) => {
    const classes = {
      emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10',
      blue: 'bg-blue-500/10 text-blue-400 border-blue-500/10',
      red: 'bg-red-500/10 text-red-400 border-red-500/10',
      orange: 'bg-orange-500/10 text-orange-400 border-orange-500/10',
    };
    return classes[statusColor] || classes.emerald;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <>
      <LibrarianHeader title="Overview" />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          {/* Stats Cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Activities */}
            <div className="bg-card-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-primary/30 transition-all shadow-lg shadow-black/20">
              <div className="absolute right-0 top-0 p-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-all duration-500"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-surface-dark rounded-xl border border-white/5 shadow-inner">
                    <span className="material-symbols-outlined text-primary">swap_horiz</span>
                  </div>
                  <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2 py-1 rounded-md">
                    Daily
                  </span>
                </div>
                <div>
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wide mb-1">Today's Activities</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-white text-3xl font-bold tracking-tight">{stats.todayActivities}</h3>
                    <span className="text-emerald-400 text-xs font-semibold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                      12%
                    </span>
                  </div>
                  <p className="text-white/30 text-[11px] mt-1">Check-ins & Check-outs processed</p>
                </div>
              </div>
            </div>

            {/* Pending Returns */}
            <div className="bg-card-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-all shadow-lg shadow-black/20">
              <div className="absolute right-0 top-0 p-24 bg-blue-500/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-all duration-500"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-surface-dark rounded-xl border border-white/5 shadow-inner">
                    <span className="material-symbols-outlined text-blue-400">keyboard_return</span>
                  </div>
                </div>
                <div>
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wide mb-1">Pending Returns</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-white text-3xl font-bold tracking-tight">{stats.pendingReturns}</h3>
                  </div>
                  <p className="text-blue-400/80 text-[11px] mt-1 font-medium bg-blue-400/10 inline-block px-2 py-0.5 rounded">
                    {stats.returnsDueToday} Due Today
                  </p>
                </div>
              </div>
            </div>

            {/* Overdue Books */}
            <div className="bg-card-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-red-500/30 transition-all shadow-lg shadow-black/20">
              <div className="absolute right-0 top-0 p-24 bg-red-500/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-red-500/10 transition-all duration-500"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-surface-dark rounded-xl border border-white/5 shadow-inner">
                    <span className="material-symbols-outlined text-red-400">warning</span>
                  </div>
                  <span className="text-red-400/20 text-[10px] font-bold uppercase tracking-wider bg-red-400/10 px-2 py-1 rounded-md border border-red-400/10">
                    Alert
                  </span>
                </div>
                <div>
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wide mb-1">Overdue Books</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-white text-3xl font-bold tracking-tight">{stats.overdueBooks}</h3>
                    {stats.recentlyOverdue > 0 && (
                      <span className="text-red-400 text-xs font-semibold flex items-center gap-0.5">
                        +{stats.recentlyOverdue} New
                      </span>
                    )}
                  </div>
                  <p className="text-white/30 text-[11px] mt-1">Requiring immediate attention</p>
                </div>
              </div>
            </div>

            {/* Recent Reservations */}
            <div className="bg-card-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-orange-500/30 transition-all shadow-lg shadow-black/20">
              <div className="absolute right-0 top-0 p-24 bg-orange-500/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-orange-500/10 transition-all duration-500"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-surface-dark rounded-xl border border-white/5 shadow-inner">
                    <span className="material-symbols-outlined text-orange-400">bookmark</span>
                  </div>
                </div>
                <div>
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wide mb-1">Recent Reservations</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-white text-3xl font-bold tracking-tight">{stats.recentReservations}</h3>
                  </div>
                  <p className="text-orange-400/80 text-[11px] mt-1 font-medium bg-orange-400/10 inline-block px-2 py-0.5 rounded">
                    {stats.reservationsAwaitingPickup} Awaiting Pickup
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column - 2/3 width */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              {/* Quick Actions */}
              <div className="bg-gradient-to-r from-primary/10 via-surface-dark to-surface-dark rounded-2xl p-6 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-black/20">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/20 text-primary border border-primary/20 shrink-0">
                    <span className="material-symbols-outlined">bolt</span>
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold">Quick Actions</h3>
                    <p className="text-white/50 text-sm max-w-md">Access common management tasks instantly.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto justify-start md:justify-end">
                  <Link
                    href="/librarian/circulation"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                    Scan Return
                  </Link>
                  <Link
                    href="/librarian/members"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    New User
                  </Link>
                  <Link
                    href="/librarian/inventory"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">library_add</span>
                    Add Book
                  </Link>
                </div>
              </div>

              {/* Circulation Activity */}
              <div className="bg-card-dark rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-lg shadow-black/20 flex-1">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-bold text-lg">Circulation Activity</h3>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Live</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActivityFilter('all')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        activityFilter === 'all'
                          ? 'text-white bg-white/10 shadow-sm border border-white/5'
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setActivityFilter('returns')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        activityFilter === 'returns'
                          ? 'text-white bg-white/10 shadow-sm border border-white/5'
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Returns
                    </button>
                    <button
                      onClick={() => setActivityFilter('overdue')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        activityFilter === 'overdue'
                          ? 'text-white bg-white/10 shadow-sm border border-white/5'
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Overdue
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-white/70">
                    <thead className="bg-surface-dark/50 text-xs uppercase font-semibold text-white/40 border-b border-white/5">
                      <tr>
                        <th className="px-6 py-4 font-bold tracking-wider">Book Details</th>
                        <th className="px-6 py-4 font-bold tracking-wider">Member</th>
                        <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right font-bold tracking-wider">Processed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-white/40">
                            <div className="flex justify-center">
                              <Loader />
                            </div>
                          </td>
                        </tr>
                      ) : filteredActivity.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-white/40">
                            No activity found
                          </td>
                        </tr>
                      ) : (
                        filteredActivity.slice(0, 5).map((activity) => (
                          <tr key={activity._id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="size-10 rounded-md bg-gray-800 shadow-sm group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                                  {activity.book?.coverImage ? (
                                    <img
                                      src={activity.book.coverImage}
                                      alt={activity.book.title || 'Book cover'}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="material-symbols-outlined text-gray-500 text-sm">book</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-white text-sm">
                                    {activity.book?.title || 'Unknown Book'}
                                  </p>
                                  <p className="text-xs text-white/40 mt-0.5">
                                    ISBN: {activity.book?.isbn || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary font-bold">
                                  {getInitials(activity.member?.name)}
                                </div>
                                <span>{activity.member?.name || 'Unknown Member'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                                  activity.statusColor
                                )}`}
                              >
                                {activity.statusColor === 'emerald' && (
                                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                )}
                                {activity.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-white/30 font-mono text-xs">
                              {activity.processedAt
                                ? new Date(activity.processedAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                  <Link
                    href="/librarian/circulation"
                    className="w-full py-2 rounded-lg text-xs font-medium text-white/40 hover:text-white hover:bg-white/5 transition-colors block text-center"
                  >
                    View Full Activity Log
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column - 1/3 width */}
            <div className="flex flex-col gap-6">
              {/* Inventory Status */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6 shadow-lg shadow-black/20">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-white font-bold text-lg">Inventory Status</h3>
                  <button className="p-1 hover:bg-white/10 rounded transition-colors">
                    <span className="material-symbols-outlined text-white/50 text-sm">more_horiz</span>
                  </button>
                </div>
                <div className="mb-6 pb-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Total Catalog</span>
                    <span className="text-2xl font-bold text-white">{stats.totalCatalog.toLocaleString()}</span>
                  </div>
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <span className="material-symbols-outlined text-primary text-xl">library_books</span>
                  </div>
                </div>
                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-white/70">Fiction (High Demand)</span>
                      <span className="text-primary">82% Stocked</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[82%] rounded-full shadow-[0_0_10px_rgba(170,31,239,0.5)]"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-white/70">Non-Fiction</span>
                      <span className="text-emerald-400">95% Stocked</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 w-[95%] rounded-full shadow-[0_0_10px_rgba(52,211,153,0.3)]"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-white/70">Academic & Ref</span>
                      <span className="text-yellow-400">64% Stocked</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 w-[64%] rounded-full shadow-[0_0_10px_rgba(250,204,21,0.3)]"></div>
                    </div>
                  </div>
                  <div className="p-3 bg-surface-dark/50 rounded-xl flex items-start gap-3 border border-white/5">
                    <span className="material-symbols-outlined text-yellow-400 text-sm mt-0.5">lightbulb</span>
                    <p className="text-xs text-white/60 leading-relaxed">
                      Academic reference restocks are recommended before the semester begins.
                    </p>
                  </div>
                </div>
              </div>

              {/* New Members */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6 flex-1 shadow-lg shadow-black/20">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-white font-bold text-lg">New Members</h3>
                  <Link href="/librarian/members" className="text-primary text-xs font-bold hover:underline">
                    View All
                  </Link>
                </div>
                <div className="flex flex-col gap-4">
                  {loading ? (
                    <div className="text-center py-4 text-white/40 text-sm">
                      <div className="flex justify-center">
                        <Loader />
                      </div>
                    </div>
                  ) : stats.newMembers.length === 0 ? (
                    <div className="text-center py-4 text-white/40 text-sm">No new members</div>
                  ) : (
                    stats.newMembers.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer group"
                      >
                        <div className="relative">
                          <div className="size-10 rounded-full bg-center bg-cover border border-white/10 overflow-hidden bg-[#3c2348]">
                            {member.profilePhoto ? (
                              <img
                                src={member.profilePhoto}
                                alt={member.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            {!member.profilePhoto && (
                              <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                                {getInitials(member.name)}
                              </div>
                            )}
                          </div>
                          <div className="absolute bottom-0 right-0 size-2.5 bg-green-500 border-2 border-card-dark rounded-full"></div>
                        </div>
                        <div className="flex flex-col flex-1">
                          <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                            {member.name}
                          </p>
                          <p className="text-xs text-white/40">Student • #{member._id.toString().slice(-4)}</p>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 size-8 rounded-full border border-white/10 flex items-center justify-center bg-surface-dark text-white hover:bg-primary hover:border-primary transition-all">
                          <span className="material-symbols-outlined text-sm">mail</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <Link
                  href="/librarian/members"
                  className="w-full mt-6 py-3 rounded-lg border border-dashed border-white/10 text-white/40 text-xs font-medium hover:bg-white/5 hover:text-white hover:border-white/20 transition-all uppercase tracking-wide block text-center"
                >
                  View Member Directory
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

