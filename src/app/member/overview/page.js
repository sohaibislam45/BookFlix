'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Loader from '@/components/Loader';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { showError } from '@/lib/swal';
import EmptyState from '@/components/EmptyState';
import OptimizedImage from '@/components/OptimizedImage';

export default function MemberOverviewPage() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    activeLoans: 0,
    overdueLoans: 0,
    outstandingFines: 0,
    booksReadThisYear: 0,
    yearlyGoal: 25,
    goalPercentage: 0,
    activeBorrowings: [],
    overdueBorrowings: [],
    monthlyBorrowingData: [],
    favoriteGenre: null,
    favoriteGenrePercentage: 0,
    averageReadingTime: 0,
    upcomingDue: [],
  });
  const [loading, setLoading] = useState(true);
  const [activityFeed, setActivityFeed] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (userData?._id) {
      fetchStats();
      fetchActivityFeed();
    }
  }, [userData]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/member/stats?memberId=${userData._id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch statistics');
      }
      
      const data = await response.json();
      setStats({
        ...data,
        monthlyBorrowingData: data.monthlyBorrowingData || [],
        favoriteGenre: data.favoriteGenre || null,
        favoriteGenrePercentage: data.favoriteGenrePercentage || 0,
        averageReadingTime: data.averageReadingTime || 0,
        upcomingDue: data.upcomingDue || [],
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      showError('Error Loading Stats', error.message || 'Failed to load your statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityFeed = async () => {
    if (!userData?._id) {
      setActivityLoading(false);
      return;
    }

    try {
      setActivityLoading(true);
      const response = await fetch(`/api/notifications?userId=${userData._id}&limit=3`);
      
      if (response.ok) {
        const data = await response.json();
        setActivityFeed(data.notifications || []);
      } else {
        // If API returns error, set empty array
        setActivityFeed([]);
        console.error('Failed to fetch activity feed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      setActivityFeed([]);
    } finally {
      setActivityLoading(false);
    }
  };

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
                <p className="text-2xl font-bold text-white">{stats.outstandingFines.toFixed(2)} BDT</p>
                {stats.outstandingFines > 0 && (
                  <span className="text-xs text-alert-red font-medium">Action Required</span>
                )}
              </div>
            </div>
            {stats.outstandingFines > 0 && (
              <Link
                href="/member/billing"
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-alert-red text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg"
              >
                Pay
              </Link>
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
                {stats.activeLoans} <span className="text-sm font-normal text-text-secondary">/ {userData?.subscription?.type === 'free' ? '1' : '4'}</span>
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
                <span className="text-xs text-emerald-400 font-bold">{stats.goalPercentage}%</span>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-white">{stats.booksReadThisYear}</p>
                <p className="text-sm text-text-secondary">books read</p>
              </div>
              <div className="w-full bg-[#1c1022] h-1 rounded-full mt-2">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${Math.min(stats.goalPercentage, 100)}%` }}></div>
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
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <CardSkeleton count={4} />
            </div>
          ) : stats.activeBorrowings.length === 0 && stats.overdueBorrowings.length === 0 ? (
            <EmptyState
              icon="auto_stories"
              title="No books currently borrowed"
              description="Start exploring our collection and borrow your first book!"
              actionLabel="Browse Collection"
              actionHref="/member/browse"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {stats.overdueBorrowings.map((borrowing) => (
                <div key={borrowing._id} className="bg-surface-dark rounded-xl p-4 border border-alert-red/40 hover:border-alert-red transition-all group flex flex-col h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 z-10">
                    <span className="animate-pulse size-2 rounded-full bg-alert-red block shadow-[0_0_10px_red]"></span>
                  </div>
                  <div className="relative w-full aspect-[16/9] mb-4 overflow-hidden rounded-lg grayscale-[30%] group/image">
                    <OptimizedImage
                      src={borrowing.book?.coverImage}
                      alt={borrowing.book?.title || 'Book cover'}
                      fill
                      className="transition-transform duration-500 group-hover/image:scale-105"
                      objectFit="cover"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
                    <div className="absolute bottom-2 right-2 bg-alert-red/20 backdrop-blur-md border border-alert-red/30 text-alert-red text-xs font-bold px-2 py-1 rounded z-10">
                      Overdue
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold truncate">{borrowing.book?.title}</h4>
                    <p className="text-text-secondary text-xs mb-3">{borrowing.book?.author}</p>
                    <div className="w-full bg-[#1c1022] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-alert-red h-full w-full rounded-full"></div>
                    </div>
                    <p className="text-[10px] text-right text-alert-red mt-1 font-bold">
                      {borrowing.daysOverdue} day{borrowing.daysOverdue !== 1 ? 's' : ''} overdue
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/member/shelf?return=${borrowing._id}`}
                      className="flex-1 bg-alert-red hover:bg-red-600 text-white text-xs font-bold py-2 rounded-lg transition-colors shadow-lg shadow-red-900/20 text-center"
                    >
                      Return Now
                    </Link>
                  </div>
                </div>
              ))}
              {stats.activeBorrowings.map((borrowing) => (
                <div key={borrowing._id} className="bg-surface-dark rounded-xl p-4 border border-[#3c2348] hover:border-primary/50 transition-all group flex flex-col h-full">
                  <div className="relative w-full aspect-[16/9] mb-4 overflow-hidden rounded-lg group/image">
                    <OptimizedImage
                      src={borrowing.book?.coverImage}
                      alt={borrowing.book?.title || 'Book cover'}
                      fill
                      className="transition-transform duration-500 group-hover/image:scale-105"
                      objectFit="cover"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
                    <div className={`absolute bottom-2 right-2 backdrop-blur-md text-xs font-bold px-2 py-1 rounded z-10 ${
                      borrowing.daysRemaining <= 3
                        ? 'bg-orange-500/20 border border-orange-500/30 text-orange-300'
                        : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                    }`}>
                      Due {new Date(borrowing.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold truncate">{borrowing.book?.title}</h4>
                    <p className="text-text-secondary text-xs mb-3">{borrowing.book?.author}</p>
                    <div className="w-full bg-[#1c1022] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          borrowing.daysRemaining <= 3 ? 'bg-orange-500' : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min((borrowing.daysRemaining / 7) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <p className={`text-[10px] text-right mt-1 ${
                      borrowing.daysRemaining <= 3 ? 'text-orange-300' : 'text-text-secondary'
                    }`}>
                      {borrowing.daysRemaining} day{borrowing.daysRemaining !== 1 ? 's' : ''} left
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/member/shelf?return=${borrowing._id}`}
                      className="flex-1 bg-[#3c2348] hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg transition-colors text-center"
                    >
                      Return
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom Section: Insights and Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Borrowing Insights Section */}
          <section className="lg:col-span-2 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">analytics</span>
                Borrowing Insights
              </h3>
              <select className="bg-surface-dark border border-[#3c2348] text-xs text-text-secondary rounded-lg px-2 py-1 focus:outline-none focus:border-primary">
                <option>Last 6 Months</option>
                <option>This Year</option>
              </select>
            </div>
            <div className="bg-surface-dark border border-[#3c2348] rounded-2xl p-6">
              <div className="flex flex-col gap-6">
                {/* Bar Chart */}
                <div className="flex justify-between items-end gap-2 h-40 pt-4">
                  {stats.monthlyBorrowingData.length > 0 ? (
                    stats.monthlyBorrowingData.map((monthData, index) => {
                      const maxCount = Math.max(...stats.monthlyBorrowingData.map(m => m.count), 1);
                      const heightPercentage = maxCount > 0 ? (monthData.count / maxCount) * 100 : 0;
                      const isCurrentMonth = index === stats.monthlyBorrowingData.length - 1;
                      
                      return (
                        <div key={index} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer relative">
                          <div 
                            className={`w-full transition-colors rounded-t-sm relative ${
                              isCurrentMonth
                                ? 'bg-gradient-to-t from-primary to-fuchsia-500 shadow-[0_0_15px_rgba(170,31,239,0.3)]'
                                : 'bg-[#3c2348] group-hover:bg-primary/50'
                            }`}
                            style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                          >
                            {monthData.count > 0 && (
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {monthData.count} {monthData.count === 1 ? 'Book' : 'Books'}
                              </div>
                            )}
                          </div>
                          <span className={`text-[10px] uppercase ${isCurrentMonth ? 'text-white font-bold' : 'text-text-secondary'}`}>
                            {monthData.month}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    // Show empty bars if no data
                    Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-full bg-[#3c2348] rounded-t-sm" style={{ height: '5%' }}></div>
                        <span className="text-[10px] text-text-secondary uppercase">---</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Stats Footer */}
                <div className="border-t border-[#3c2348] pt-4 flex justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-text-secondary">Favorite Genre</span>
                      <span className="text-sm font-bold text-white">
                        {stats.favoriteGenre || 'N/A'} {stats.favoriteGenrePercentage > 0 ? `(${stats.favoriteGenrePercentage}%)` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-col text-right">
                      <span className="text-xs text-text-secondary">Avg. Reading Time</span>
                      <span className="text-sm font-bold text-white">
                        {stats.averageReadingTime > 0 ? `${stats.averageReadingTime} days/book` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sidebar: Upcoming Due & Activity Feed */}
          <aside className="flex flex-col gap-6">
            {/* Upcoming Due Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">event_upcoming</span>
                Upcoming Due
              </h3>
              <div className="bg-surface-dark border border-[#3c2348] rounded-2xl overflow-hidden">
                {stats.upcomingDue.length === 0 ? (
                  <div className="p-4 text-center text-text-secondary text-sm">
                    No upcoming due dates
                  </div>
                ) : (
                  <>
                    {stats.upcomingDue.map((item, index) => {
                      const dueDate = new Date(item.dueDate);
                      const day = dueDate.getDate();
                      const month = dueDate.toLocaleDateString('en-US', { month: 'short' });
                      const isOverdue = item.daysRemaining < 0;
                      const isSoon = item.daysRemaining <= 3 && item.daysRemaining >= 0;
                      
                      return (
                        <div 
                          key={item._id}
                          className={`p-3 border-b border-[#3c2348] hover:bg-surface-hover transition-colors cursor-pointer flex items-center gap-3 ${
                            index === stats.upcomingDue.length - 1 ? 'border-b-0' : ''
                          }`}
                        >
                          <div className={`size-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 flex-col leading-none ${
                            isOverdue
                              ? 'bg-alert-red/10 text-alert-red'
                              : isSoon
                              ? 'bg-primary/10 text-primary'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            <span>{day}</span>
                            <span className="text-[8px] uppercase">{month}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {item.book?.title || 'Unknown Book'}
                            </p>
                            <p className={`text-xs font-medium ${
                              isOverdue
                                ? 'text-alert-red'
                                : isSoon
                                ? 'text-primary'
                                : 'text-text-secondary'
                            }`}>
                              {isOverdue 
                                ? `Overdue (${Math.abs(item.daysRemaining)} day${Math.abs(item.daysRemaining) !== 1 ? 's' : ''} ago)`
                                : item.daysRemaining === 0
                                ? 'Due today'
                                : `Due in ${item.daysRemaining} day${item.daysRemaining !== 1 ? 's' : ''}`
                              }
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {/* Activity Feed Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">notifications</span>
                Activity Feed
              </h3>
              <div className="flex flex-col gap-2">
                {activityLoading ? (
                  <div className="text-center py-8 text-text-secondary text-sm">
                    <Loader />
                  </div>
                ) : activityFeed.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary text-sm">
                    No recent activity
                  </div>
                ) : (
                  activityFeed.map((activity) => {
                    // Determine color based on notification type
                    let dotColor = 'bg-[#3c2348]';
                    if (activity.type === 'borrowing_overdue' || activity.type === 'fine_issued') {
                      dotColor = 'bg-alert-red';
                    } else if (activity.type === 'reservation_ready' || activity.type === 'payment_received') {
                      dotColor = 'bg-primary';
                    }

                    // Format time ago
                    const createdAt = new Date(activity.createdAt);
                    const now = new Date();
                    const diffMs = now - createdAt;
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffDays = Math.floor(diffHours / 24);
                    
                    let timeAgo = '';
                    if (diffHours < 1) {
                      const diffMins = Math.floor(diffMs / (1000 * 60));
                      timeAgo = diffMins <= 1 ? 'Just now' : `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
                    } else if (diffHours < 24) {
                      timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                    } else if (diffDays === 1) {
                      timeAgo = 'Yesterday';
                    } else if (diffDays < 7) {
                      timeAgo = `${diffDays} days ago`;
                    } else {
                      timeAgo = createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }

                    return (
                      <div key={activity._id} className="flex gap-3 p-3 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer">
                        <div className={`size-2 rounded-full ${dotColor} mt-2 flex-shrink-0`}></div>
                        <div>
                          <p className="text-sm text-white">
                            {activity.message}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">{timeAgo}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

