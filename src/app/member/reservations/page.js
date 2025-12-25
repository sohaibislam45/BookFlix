'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RESERVATION_STATUS } from '@/lib/constants';

export default function ReservationsPage() {
  const { userData } = useAuth();
  const [reservations, setReservations] = useState({
    pending: [],
    ready: [],
    completed: [],
    expired: [],
    cancelled: [],
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // active, completed, all

  useEffect(() => {
    if (userData?._id) {
      fetchReservations();
    }
  }, [userData]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reservations/member/${userData._id}`);
      if (response.ok) {
        const data = await response.json();
        const grouped = {
          pending: data.reservations.filter((r) => r.status === RESERVATION_STATUS.PENDING),
          ready: data.reservations.filter((r) => r.status === RESERVATION_STATUS.READY),
          completed: data.reservations.filter((r) => r.status === RESERVATION_STATUS.COMPLETED),
          expired: data.reservations.filter((r) => r.status === RESERVATION_STATUS.EXPIRED),
          cancelled: data.reservations.filter((r) => r.status === RESERVATION_STATUS.CANCELLED),
        };
        setReservations(grouped);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (reservationId) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;

    try {
      setProcessing(reservationId);
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (response.ok) {
        await fetchReservations();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to cancel reservation');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('Failed to cancel reservation');
    } finally {
      setProcessing(null);
    }
  };

  const handleComplete = async (reservationId) => {
    if (!confirm('Claim this book and borrow it now?')) return;

    try {
      setProcessing(reservationId);
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      if (response.ok) {
        alert('Book borrowed successfully!');
        await fetchReservations();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to claim book');
      }
    } catch (error) {
      console.error('Error completing reservation:', error);
      alert('Failed to claim book');
    } finally {
      setProcessing(null);
    }
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const activeReservations = [...reservations.pending, ...reservations.ready];
  const allReservations = [
    ...reservations.pending,
    ...reservations.ready,
    ...reservations.completed,
    ...reservations.expired,
    ...reservations.cancelled,
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-black tracking-tight text-white mb-2">Reservations</h2>
        <p className="text-text-secondary mb-8">Track your hold requests, manage queue positions, and claim available books.</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#3c2348]">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-white'
            }`}
          >
            Active ({activeReservations.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'completed'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-white'
            }`}
          >
            Completed ({reservations.completed.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-white'
            }`}
          >
            All ({allReservations.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-text-secondary">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-50 animate-spin">refresh</span>
            <p className="text-lg">Loading reservations...</p>
          </div>
        ) : (
          <>
            {/* Active Reservations */}
            {(activeTab === 'active' || activeTab === 'all') && (
              <section className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">schedule</span>
                  Active Reservations ({activeReservations.length})
                </h3>
                {activeReservations.length === 0 ? (
                  <div className="text-center py-12 text-text-secondary bg-surface-dark rounded-xl border border-[#3c2348]">
                    <span className="material-symbols-outlined text-5xl mb-3 opacity-50">event_seat</span>
                    <p className="text-lg">No active reservations</p>
                    <p className="text-sm mt-2">Reserve books that are currently unavailable</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Ready Reservations */}
                    {reservations.ready.map((reservation) => {
                      const daysLeft = getDaysUntilExpiry(reservation.expiryDate);
                      return (
                        <div
                          key={reservation._id}
                          className="bg-surface-dark rounded-xl p-5 border-2 border-emerald-500/30 hover:border-emerald-500/50 transition-all"
                        >
                          <div className="flex gap-4">
                            <div
                              className="w-20 h-28 bg-cover bg-center rounded-lg flex-shrink-0"
                              style={{ backgroundImage: `url('${reservation.book?.coverImage}')` }}
                            ></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-white font-bold truncate">{reservation.book?.title}</h4>
                                  <p className="text-text-secondary text-xs truncate">{reservation.book?.author}</p>
                                </div>
                                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-1 rounded flex-shrink-0">
                                  Ready
                                </span>
                              </div>
                              <div className="space-y-2 mb-4">
                                <p className="text-xs text-text-secondary">
                                  <span className="material-symbols-outlined text-sm align-middle">event</span>{' '}
                                  Ready since: {new Date(reservation.readyDate).toLocaleDateString()}
                                </p>
                                <p className={`text-xs font-bold ${daysLeft <= 1 ? 'text-alert-red' : daysLeft <= 2 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                  <span className="material-symbols-outlined text-sm align-middle">schedule</span>{' '}
                                  {daysLeft === 0
                                    ? 'Expires today!'
                                    : daysLeft === 1
                                    ? 'Expires tomorrow'
                                    : `${daysLeft} days left to claim`}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleComplete(reservation._id)}
                                  disabled={processing === reservation._id}
                                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {processing === reservation._id ? 'Processing...' : 'Claim & Borrow'}
                                </button>
                                <button
                                  onClick={() => handleCancel(reservation._id)}
                                  disabled={processing === reservation._id}
                                  className="bg-[#3c2348] hover:bg-white/10 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Pending Reservations */}
                    {reservations.pending.map((reservation) => (
                      <div
                        key={reservation._id}
                        className="bg-surface-dark rounded-xl p-5 border border-[#3c2348] hover:border-primary/50 transition-all"
                      >
                        <div className="flex gap-4">
                          <div
                            className="w-20 h-28 bg-cover bg-center rounded-lg flex-shrink-0"
                            style={{ backgroundImage: `url('${reservation.book?.coverImage}')` }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-bold truncate">{reservation.book?.title}</h4>
                                <p className="text-text-secondary text-xs truncate">{reservation.book?.author}</p>
                              </div>
                              <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-1 rounded flex-shrink-0">
                                Pending
                              </span>
                            </div>
                            <div className="space-y-2 mb-4">
                              <p className="text-xs text-text-secondary">
                                <span className="material-symbols-outlined text-sm align-middle">queue</span>{' '}
                                Queue position: <strong className="text-white">#{reservation.queuePosition}</strong>
                              </p>
                              <p className="text-xs text-text-secondary">
                                <span className="material-symbols-outlined text-sm align-middle">event</span>{' '}
                                Reserved: {new Date(reservation.reservedDate).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCancel(reservation._id)}
                              disabled={processing === reservation._id}
                              className="w-full bg-[#3c2348] hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {processing === reservation._id ? 'Processing...' : 'Cancel Reservation'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Completed Reservations */}
            {(activeTab === 'completed' || activeTab === 'all') && reservations.completed.length > 0 && (
              <section className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">check_circle</span>
                  Completed ({reservations.completed.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reservations.completed.map((reservation) => (
                    <div
                      key={reservation._id}
                      className="bg-surface-dark rounded-xl p-5 border border-[#3c2348] opacity-75"
                    >
                      <div className="flex gap-4">
                        <div
                          className="w-20 h-28 bg-cover bg-center rounded-lg flex-shrink-0"
                          style={{ backgroundImage: `url('${reservation.book?.coverImage}')` }}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold truncate">{reservation.book?.title}</h4>
                              <p className="text-text-secondary text-xs truncate">{reservation.book?.author}</p>
                            </div>
                            <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-1 rounded flex-shrink-0">
                              Completed
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary">
                            Completed: {new Date(reservation.completedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Expired/Cancelled (only in All tab) */}
            {activeTab === 'all' && (reservations.expired.length > 0 || reservations.cancelled.length > 0) && (
              <section className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">history</span>
                  History ({reservations.expired.length + reservations.cancelled.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...reservations.expired, ...reservations.cancelled].map((reservation) => (
                    <div
                      key={reservation._id}
                      className="bg-surface-dark rounded-xl p-5 border border-[#3c2348] opacity-60"
                    >
                      <div className="flex gap-4">
                        <div
                          className="w-20 h-28 bg-cover bg-center rounded-lg flex-shrink-0 grayscale"
                          style={{ backgroundImage: `url('${reservation.book?.coverImage}')` }}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold truncate">{reservation.book?.title}</h4>
                              <p className="text-text-secondary text-xs truncate">{reservation.book?.author}</p>
                            </div>
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 ${
                                reservation.status === RESERVATION_STATUS.EXPIRED
                                  ? 'bg-alert-red/20 text-alert-red'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {reservation.status === RESERVATION_STATUS.EXPIRED ? 'Expired' : 'Cancelled'}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary">
                            {reservation.status === RESERVATION_STATUS.EXPIRED
                              ? `Expired: ${new Date(reservation.expiryDate).toLocaleDateString()}`
                              : `Cancelled: ${new Date(reservation.cancelledDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty state for all tab */}
            {activeTab === 'all' && allReservations.length === 0 && (
              <div className="text-center py-12 text-text-secondary bg-surface-dark rounded-xl border border-[#3c2348]">
                <span className="material-symbols-outlined text-5xl mb-3 opacity-50">event_seat</span>
                <p className="text-lg">No reservations</p>
                <p className="text-sm mt-2">You haven't made any reservations yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

