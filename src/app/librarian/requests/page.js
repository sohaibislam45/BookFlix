'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LibrarianHeader from '@/components/LibrarianHeader';
import { showSuccess, showError, showConfirm } from '@/lib/swal';
import Link from 'next/link';

export default function LibrarianRequestsPage() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('reservations'); // 'reservations' or 'acquisitions'
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    pendingReservations: 0,
    acquisitionRequests: 0,
    requiresApproval: 0,
  });

  useEffect(() => {
    fetchReservations();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/librarian/stats');
      if (response.ok) {
        const data = await response.json();
        setStats({
          pendingReservations: data.recentReservations || 0,
          acquisitionRequests: 0, // Placeholder - can be added later
          requiresApproval: 0, // Placeholder - can be added later
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reservations?status=pending&limit=100');
      if (response.ok) {
        const data = await response.json();
        setReservations(data.reservations || []);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      showError('Error', 'Failed to fetch reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReady = async (reservationId, bookId) => {
    const result = await showConfirm(
      'Mark Reservation Ready',
      'Mark this reservation as ready? An available copy will be reserved for the member.'
    );
    if (!result.isConfirmed) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markReady' }),
      });

      if (response.ok) {
        showSuccess('Success!', 'Reservation marked as ready');
        await fetchReservations();
      } else {
        const error = await response.json();
        showError('Error', error.error || 'Failed to mark reservation as ready');
      }
    } catch (error) {
      console.error('Error marking reservation as ready:', error);
      showError('Error', 'Failed to mark reservation as ready');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteReservation = async (reservationId) => {
    const result = await showConfirm('Complete Reservation', 'Complete this reservation and create a borrowing?');
    if (!result.isConfirmed) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      if (response.ok) {
        showSuccess('Success!', 'Reservation completed successfully');
        await fetchReservations();
      } else {
        const error = await response.json();
        showError('Error', error.error || 'Failed to complete reservation');
      }
    } catch (error) {
      console.error('Error completing reservation:', error);
      showError('Error', 'Failed to complete reservation');
    } finally {
      setProcessing(false);
    }
  };

  const filteredReservations = reservations.filter((reservation) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      reservation.book?.title?.toLowerCase().includes(query) ||
      reservation.book?.author?.toLowerCase().includes(query) ||
      reservation.book?.isbn?.toLowerCase().includes(query) ||
      reservation.member?.name?.toLowerCase().includes(query) ||
      reservation.member?.email?.toLowerCase().includes(query)
    );
  });

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'N/A';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <>
      <LibrarianHeader title="Book Requests" subtitle="Manage pending reservations and review new book acquisition proposals." />
      <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2 rounded-xl p-6 border border-[#553267] bg-surface-dark/30">
              <div className="flex justify-between items-start">
                <p className="text-text-secondary text-sm font-medium uppercase tracking-wider">Pending Reservations</p>
                <span className="material-symbols-outlined text-text-secondary">shopping_bag</span>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-white text-3xl font-bold leading-tight">{stats.pendingReservations}</p>
                <p className="text-emerald-400 text-sm font-medium mb-1 flex items-center">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  +2%
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 border border-primary/40 bg-primary/10 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl"></div>
              <div className="flex justify-between items-start relative z-10">
                <p className="text-primary text-sm font-medium uppercase tracking-wider">Acquisition Requests</p>
                <span className="material-symbols-outlined text-primary">bookmark_add</span>
              </div>
              <div className="flex items-end gap-3 relative z-10">
                <p className="text-white text-3xl font-bold leading-tight">{stats.acquisitionRequests}</p>
                <p className="text-emerald-400 text-sm font-medium mb-1 flex items-center">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  +5%
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 border border-[#553267] bg-surface-dark/30">
              <div className="flex justify-between items-start">
                <p className="text-text-secondary text-sm font-medium uppercase tracking-wider">Requires Approval</p>
                <span className="material-symbols-outlined text-text-secondary">gavel</span>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-white text-3xl font-bold leading-tight">{stats.requiresApproval}</p>
                <p className="text-text-secondary text-sm font-medium mb-1">Low Priority</p>
              </div>
            </div>
          </div>

          {/* Tabs & Controls */}
          <div className="flex flex-col gap-4">
            <div className="border-b border-[#553267] flex gap-8">
              <button
                onClick={() => setActiveTab('reservations')}
                className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-2 px-1 transition-colors ${
                  activeTab === 'reservations'
                    ? 'border-b-primary text-white'
                    : 'border-b-transparent text-text-secondary hover:text-white'
                }`}
              >
                <p className="text-sm font-bold tracking-wide">Reservations (Pickup)</p>
              </button>
              <button
                onClick={() => setActiveTab('acquisitions')}
                className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-2 px-1 transition-colors ${
                  activeTab === 'acquisitions'
                    ? 'border-b-primary text-white'
                    : 'border-b-transparent text-text-secondary hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold tracking-wide">Acquisition Requests</p>
                  {stats.acquisitionRequests > 0 && (
                    <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {stats.acquisitionRequests}
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-surface-dark/20 p-2 rounded-xl border border-[#553267]/50">
              <div className="relative flex-1 w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-text-secondary">search</span>
                </div>
                <input
                  className="w-full bg-surface-dark text-white border-none rounded-lg py-2.5 pl-10 pr-4 placeholder:text-text-secondary focus:ring-1 focus:ring-primary focus:bg-[#4a2b5e] transition-all"
                  placeholder="Search by ISBN, Title, Author or Requester..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-dark text-text-secondary hover:text-white hover:bg-[#4a2b5e] transition-colors text-sm font-medium">
                  <span className="material-symbols-outlined text-[18px]">filter_list</span>
                  Filter
                </button>
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-dark text-text-secondary hover:text-white hover:bg-[#4a2b5e] transition-colors text-sm font-medium">
                  <span className="material-symbols-outlined text-[18px]">sort</span>
                  Sort
                </button>
              </div>
            </div>
          </div>

          {/* Reservations Tab Content */}
          {activeTab === 'reservations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
              {loading ? (
                <div className="col-span-full text-center py-12 text-white/40">Loading reservations...</div>
              ) : filteredReservations.length === 0 ? (
                <div className="col-span-full text-center py-12 text-white/40">
                  No {searchQuery ? 'matching ' : ''}reservations found
                </div>
              ) : (
                filteredReservations.map((reservation) => (
                  <div
                    key={reservation._id}
                    className="group flex flex-col rounded-xl bg-surface-dark border border-[#553267] overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                  >
                    <div className="relative h-48 w-full overflow-hidden">
                      {reservation.book?.coverImage ? (
                        <>
                          <img
                            className="h-full w-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                            src={reservation.book.coverImage}
                            alt={reservation.book.title}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-surface-dark to-transparent"></div>
                        </>
                      ) : (
                        <div className="h-full w-full bg-gray-800 flex items-center justify-center">
                          <span className="material-symbols-outlined text-6xl text-gray-700">image_not_supported</span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
                        Queue #{reservation.queuePosition}
                      </div>
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-white font-bold text-xl leading-snug drop-shadow-md">
                          {reservation.book?.title || 'Unknown Book'}
                        </h3>
                        <p className="text-text-secondary text-sm drop-shadow-sm">
                          {reservation.book?.author || 'Unknown Author'}
                        </p>
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1 gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs text-text-secondary">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                            Requested {formatTimeAgo(reservation.reservedDate)}
                          </span>
                        </div>
                        <div className="bg-surface-dark/50 p-3 rounded-lg border border-[#553267]/50">
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">person</span>
                            <div className="flex-1">
                              <p className="text-sm text-white font-medium">{reservation.member?.name || 'Unknown Member'}</p>
                              <p className="text-xs text-text-secondary mt-1">{reservation.member?.email || ''}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto flex gap-3 pt-2">
                        {reservation.status === 'pending' && (
                          <button
                            onClick={() => handleMarkReady(reservation._id, reservation.book?._id)}
                            disabled={processing}
                            className="flex-1 bg-primary hover:bg-primary-hover text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">check</span>
                            Mark Ready
                          </button>
                        )}
                        {reservation.status === 'ready' && (
                          <button
                            onClick={() => handleCompleteReservation(reservation._id)}
                            disabled={processing}
                            className="flex-1 bg-primary hover:bg-primary-hover text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">check</span>
                            Complete
                          </button>
                        )}
                        <button
                          disabled={processing}
                          className="flex-1 bg-transparent border border-[#553267] hover:bg-surface-dark text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Acquisitions Tab Content */}
          {activeTab === 'acquisitions' && (
            <div className="py-12 text-center text-white/40">
              <p className="text-lg mb-2">Acquisition Requests</p>
              <p className="text-sm">This feature is coming soon. You'll be able to manage book acquisition requests here.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

