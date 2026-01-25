'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import AdminHeader from '@/components/AdminHeader';
import { formatDate, formatCurrency, formatDateTime } from '@/lib/utils';
import Loader from '@/components/Loader';
import { BORROWING_STATUS, RESERVATION_STATUS, PAYMENT_STATUS } from '@/lib/constants';

export default function AdminOverviewPage() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueGrowth: 0,
    activeMembers: 0,
    newMembersThisMonth: 0,
    premiumUsers: 0,
    premiumPercentage: 0,
    activeBorrowings: 0,
    booksDueToday: 0,
    totalBooks: 0,
    totalCopies: 0,
    borrowedCopies: 0,
    availableCopies: 0,
    monthlyRevenue: [],
    revenueBreakdown: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState(new Set());

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        // Merge with defaults to ensure all fields exist
        setStats(prev => ({
          ...prev,
          ...data,
          activeMembers: data.activeMembers ?? prev.activeMembers ?? 0,
          newMembersThisMonth: data.newMembersThisMonth ?? prev.newMembersThisMonth ?? 0,
          totalRevenue: data.totalRevenue ?? prev.totalRevenue ?? 0,
          revenueGrowth: data.revenueGrowth ?? prev.revenueGrowth ?? 0,
          premiumUsers: data.premiumUsers ?? prev.premiumUsers ?? 0,
          premiumPercentage: data.premiumPercentage ?? prev.premiumPercentage ?? 0,
          activeBorrowings: data.activeBorrowings ?? prev.activeBorrowings ?? 0,
          booksDueToday: data.booksDueToday ?? prev.booksDueToday ?? 0,
          totalBooks: data.totalBooks ?? prev.totalBooks ?? 0,
          totalCopies: data.totalCopies ?? prev.totalCopies ?? 0,
          borrowedCopies: data.borrowedCopies ?? prev.borrowedCopies ?? 0,
          availableCopies: data.availableCopies ?? prev.availableCopies ?? 0,
          monthlyRevenue: data.monthlyRevenue ?? prev.monthlyRevenue ?? [],
          revenueBreakdown: data.revenueBreakdown ?? prev.revenueBreakdown ?? [],
          recentActivity: data.recentActivity ?? prev.recentActivity ?? [],
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getDaysAgo = (date) => {
    if (!date) return 'N/A';
    const days = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
    return `${days}d ago`;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'borrowing':
        return 'menu_book';
      case 'payment':
        return 'payments';
      case 'reservation':
        return 'bookmark';
      case 'new_member':
        return 'person_add';
      default:
        return 'event';
    }
  };

  const getActivityLabel = (activityType) => {
    switch (activityType) {
      case 'borrowing':
        return 'Book Borrowing';
      case 'payment':
        return 'Payment';
      case 'reservation':
        return 'Book Reservation';
      case 'new_member':
        return 'New Member';
      default:
        return 'Activity';
    }
  };

  const getActivityIconBg = (activityType) => {
    switch (activityType) {
      case 'borrowing':
        return 'bg-blue-500/20';
      case 'payment':
        return 'bg-success-green/20';
      case 'reservation':
        return 'bg-yellow-500/20';
      case 'new_member':
        return 'bg-primary/20';
      default:
        return 'bg-primary/20';
    }
  };

  const getActivityIconColor = (activityType) => {
    switch (activityType) {
      case 'borrowing':
        return 'text-blue-400';
      case 'payment':
        return 'text-success-green';
      case 'reservation':
        return 'text-yellow-400';
      case 'new_member':
        return 'text-primary';
      default:
        return 'text-primary';
    }
  };

  const getStatusBadge = (activity) => {
    const status = (activity?.status || '').toLowerCase();
    const activityType = activity?.type || '';

    // Borrowing status
    if (activityType === 'borrowing') {
      if (status === BORROWING_STATUS.ACTIVE) {
        return {
          label: 'Active',
          className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
      } else if (status === BORROWING_STATUS.RETURNED) {
        return {
          label: 'Returned',
          className: 'bg-success-green/10 text-success-green border-success-green/20',
        };
      } else if (status === BORROWING_STATUS.OVERDUE) {
        return {
          label: 'Overdue',
          className: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
      }
    }

    // Payment status
    if (activityType === 'payment') {
      if (status === PAYMENT_STATUS.COMPLETED) {
        return {
          label: 'Completed',
          className: 'bg-success-green/10 text-success-green border-success-green/20',
        };
      } else if (status === PAYMENT_STATUS.PENDING) {
        return {
          label: 'Pending',
          className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        };
      } else if (status === PAYMENT_STATUS.FAILED) {
        return {
          label: 'Failed',
          className: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
      } else if (status === PAYMENT_STATUS.REFUNDED) {
        return {
          label: 'Refunded',
          className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        };
      }
    }

    // Reservation status
    if (activityType === 'reservation') {
      if (status === RESERVATION_STATUS.PENDING) {
        return {
          label: 'Pending',
          className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        };
      } else if (status === RESERVATION_STATUS.READY) {
        return {
          label: 'Ready',
          className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
      } else if (status === RESERVATION_STATUS.COMPLETED) {
        return {
          label: 'Completed',
          className: 'bg-success-green/10 text-success-green border-success-green/20',
        };
      } else if (status === RESERVATION_STATUS.EXPIRED) {
        return {
          label: 'Expired',
          className: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
      } else if (status === RESERVATION_STATUS.CANCELLED) {
        return {
          label: 'Cancelled',
          className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        };
      }
    }

    // New member status
    if (activityType === 'new_member') {
      return {
        label: 'Completed',
        className: 'bg-success-green/10 text-success-green border-success-green/20',
      };
    }

    // Default
    return {
      label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown',
      className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };
  };

  return (
    <>
      <AdminHeader title="Admin Overview" subtitle="System performance, revenue metrics, and activity logs." />
      <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-8">
          {/* Header Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-white text-3xl md:text-4xl font-black tracking-tight mb-1">Admin Overview</h2>
              <p className="text-text-secondary text-base">System performance, revenue metrics, and activity logs.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-dark border border-white/5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success-green"></span>
                </span>
                <span className="text-xs font-medium text-success-green uppercase tracking-wider">System Operational</span>
              </div>
              <button
                onClick={fetchStats}
                className="flex items-center justify-center h-10 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-bold tracking-wide shadow-[0_0_20px_rgba(170,31,239,0.4)] transition-all"
              >
                <span className="material-symbols-outlined text-[20px] mr-2">refresh</span>
                Refresh Data
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Total Revenue */}
            <div className="flex flex-col justify-between gap-3 rounded-xl p-6 bg-card-dark border border-white/5 hover:border-primary/50 transition-colors group relative overflow-hidden">
              <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-outlined text-[80px] text-primary">payments</span>
              </div>
              <div className="flex justify-between items-start z-10">
                <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Total Revenue</p>
                <span className="material-symbols-outlined text-primary text-xl">payments</span>
              </div>
              <div className="z-10">
                <p className="text-white text-3xl font-bold tracking-tight mb-1">
                  {loading ? '...' : formatCurrency(stats.totalRevenue)}
                </p>
                <div className="flex items-center gap-2">
                  <span className="flex items-center text-success-green bg-success-green/10 px-1.5 py-0.5 rounded text-xs font-bold">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                    {stats.revenueGrowth ?? 0}%
                  </span>
                  <span className="text-text-secondary text-xs">vs last month</span>
                </div>
              </div>
            </div>

            {/* Active Members */}
            <div className="flex flex-col justify-between gap-3 rounded-xl p-6 bg-card-dark border border-white/5 hover:border-primary/50 transition-colors group relative overflow-hidden">
              <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-outlined text-[80px] text-primary">groups</span>
              </div>
              <div className="flex justify-between items-start z-10">
                <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Active Members</p>
                <span className="material-symbols-outlined text-primary text-xl">groups</span>
              </div>
              <div className="z-10">
                <p className="text-white text-3xl font-bold tracking-tight mb-1">
                  {loading ? '...' : (stats.activeMembers ?? 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <span className="flex items-center text-success-green bg-success-green/10 px-1.5 py-0.5 rounded text-xs font-bold">
                    <span className="material-symbols-outlined text-[14px]">person_add</span>
                    +{stats.newMembersThisMonth ?? 0}
                  </span>
                  <span className="text-text-secondary text-xs">new this month</span>
                </div>
              </div>
            </div>

            {/* Books Due Today */}
            <div className="flex flex-col justify-between gap-3 rounded-xl p-6 bg-card-dark border border-white/5 hover:border-blue-500/50 transition-colors group relative overflow-hidden">
              <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-outlined text-[80px] text-blue-400">event</span>
              </div>
              <div className="flex justify-between items-start z-10">
                <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Books Due Today</p>
                <span className="material-symbols-outlined text-blue-400 text-xl">event</span>
              </div>
              <div className="z-10">
                <p className="text-white text-3xl font-bold tracking-tight mb-1">
                  {loading ? '...' : (stats.booksDueToday ?? 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 text-xs font-bold">Due today</span>
                  <span className="text-text-secondary text-xs">• Action required</span>
                </div>
              </div>
            </div>

            {/* Active Borrowings */}
            <div className="flex flex-col justify-between gap-3 rounded-xl p-6 bg-card-dark border border-white/5 hover:border-primary/50 transition-colors group relative overflow-hidden">
              <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-outlined text-[80px] text-primary">menu_book</span>
              </div>
              <div className="flex justify-between items-start z-10">
                <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Active Borrowings</p>
                <span className="material-symbols-outlined text-primary text-xl">menu_book</span>
              </div>
              <div className="z-10">
                <p className="text-white text-3xl font-bold tracking-tight mb-1">
                  {loading ? '...' : (stats.activeBorrowings ?? 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-success-green text-xs font-bold">Currently borrowed</span>
                  <span className="text-text-secondary text-xs">• On time</span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Trends and Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trends Chart */}
            <div className="lg:col-span-2 flex flex-col rounded-xl bg-card-dark border border-white/5 p-6">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-white text-lg font-bold mb-1">Revenue Trends</h3>
                  <p className="text-text-secondary text-sm">Monthly recurring revenue (MRR)</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-2xl font-bold">
                    {loading ? '...' : formatCurrency((stats.monthlyRevenue && stats.monthlyRevenue.length > 0) ? (stats.monthlyRevenue[stats.monthlyRevenue.length - 1]?.total || 0) : 0)}
                  </p>
                  <p className="text-success-green text-sm font-medium">This month so far</p>
                </div>
              </div>
              <div className="flex-1 w-full min-h-[250px] relative">
                {/* Simple chart visualization */}
                <div className="h-full flex items-end justify-between gap-2">
                  {(stats.monthlyRevenue || []).slice(-6).map((month, index) => {
                    const maxValue = Math.max(...(stats.monthlyRevenue || []).map((m) => m?.total || 0), 1);
                    const height = ((month?.total || 0) / maxValue) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex flex-col items-center justify-end" style={{ height: '200px' }}>
                          <div
                            className="w-full bg-primary rounded-t transition-all hover:bg-primary-hover"
                            style={{ height: `${height}%`, minHeight: '4px' }}
                          ></div>
                        </div>
                        <span className="text-xs text-text-secondary font-medium">
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][index]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Revenue Sources */}
            <div className="flex flex-col rounded-xl bg-card-dark border border-white/5 p-6">
              <h3 className="text-white text-lg font-bold mb-1">Revenue Sources</h3>
              <p className="text-text-secondary text-sm mb-6">Income distribution by plan</p>
              <div className="flex flex-col items-center justify-center flex-1">
                {/* Simple pie chart representation */}
                <div className="relative size-48 rounded-full flex items-center justify-center mb-6">
                  <div className="absolute inset-0 rounded-full" style={{
                    background: `conic-gradient(
                      #aa1fef 0% ${(stats.revenueBreakdown || []).find(r => r?.type === 'subscription')?.percentage || 0}%,
                      #10b981 ${(stats.revenueBreakdown || []).find(r => r?.type === 'subscription')?.percentage || 0}% ${((stats.revenueBreakdown || []).find(r => r?.type === 'subscription')?.percentage || 0) + ((stats.revenueBreakdown || []).find(r => r?.type === 'fine')?.percentage || 0)}%,
                      #facc15 ${((stats.revenueBreakdown || []).find(r => r?.type === 'subscription')?.percentage || 0) + ((stats.revenueBreakdown || []).find(r => r?.type === 'fine')?.percentage || 0)}% 100%
                    )`
                  }}></div>
                  <div className="absolute inset-0 m-auto size-32 bg-card-dark rounded-full flex flex-col items-center justify-center shadow-inner">
                    <p className="text-text-secondary text-xs uppercase font-bold tracking-widest">Main</p>
                    <p className="text-white text-xl font-bold">Premium</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 mt-6">
                {(stats.revenueBreakdown || []).map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            source?.type === 'subscription'
                              ? '#aa1fef'
                              : source?.type === 'fine'
                              ? '#10b981'
                              : '#facc15',
                        }}
                      ></div>
                      <p className="text-text-secondary text-xs font-medium capitalize">
                        {source?.type === 'subscription' ? 'Premium Plan' : source?.type === 'fine' ? 'Institutional' : 'Late Fees / Other'}
                      </p>
                    </div>
                    <span className="text-white text-xs font-bold">{(source.percentage ?? 0).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent System Activity */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-white text-lg font-bold">Recent System Activity</h3>
              <a className="text-primary text-sm font-medium hover:text-primary-light" href="#">
                View full log
              </a>
            </div>
            <div className="bg-card-dark rounded-xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Event Type</th>
                      <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Source / User</th>
                      <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="p-4 text-center text-text-secondary">
                          <div className="flex justify-center">
                            <Loader />
                          </div>
                        </td>
                      </tr>
                    ) : !stats.recentActivity || stats.recentActivity.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-4 text-center text-text-secondary">No recent activity</td>
                      </tr>
                    ) : (
                      (stats.recentActivity || []).slice(0, 5).map((activity, index) => {
                        const activityType = activity?.type || 'unknown';
                        const icon = getActivityIcon(activityType);
                        const label = getActivityLabel(activityType);
                        const iconBg = getActivityIconBg(activityType);
                        const iconColor = getActivityIconColor(activityType);
                        const statusBadge = getStatusBadge(activity);
                        const displayName = activity?.member || activity?.memberEmail || 'N/A';
                        const additionalInfo = activityType === 'payment' && activity?.amount 
                          ? ` • ${formatCurrency(activity.amount)}`
                          : activityType === 'borrowing' && activity?.bookTitle
                          ? ` • ${activity.bookTitle}`
                          : activityType === 'reservation' && activity?.bookTitle
                          ? ` • ${activity.bookTitle}`
                          : '';

                        const memberPhoto = activity?.memberPhoto;
                        const memberName = activity?.member || 'Unknown';
                        const activityKey = activity?._id || index;

                        return (
                          <tr key={activityKey} className="group hover:bg-white/5 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {/* Activity Icon */}
                                <div className={`size-8 rounded ${iconBg} flex items-center justify-center`}>
                                  <span className={`material-symbols-outlined ${iconColor} text-sm`}>{icon}</span>
                                </div>
                                <span className="text-white font-medium text-sm">{label}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {/* User Profile Photo */}
                                <div className="size-9 rounded-full bg-[#3c2348] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                                  {memberPhoto && memberPhoto.trim() !== '' && !imageErrors.has(activityKey) ? (
                                    <Image
                                      src={`${memberPhoto}${memberPhoto.includes('?') ? '&' : '?'}t=${Date.now()}`}
                                      alt={memberName}
                                      width={36}
                                      height={36}
                                      className="w-full h-full rounded-full object-cover"
                                      onError={() => {
                                        setImageErrors(prev => new Set(prev).add(activityKey));
                                      }}
                                    />
                                  ) : (
                                    <span>{getInitials(memberName)}</span>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-white text-sm font-medium">{displayName}</span>
                                  {additionalInfo && (
                                    <span className="text-text-secondary text-xs">{additionalInfo}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${statusBadge.className}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="p-4 text-right text-text-secondary text-sm">
                              {activity?.createdAt ? formatDateTime(activity.createdAt) : 'N/A'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

