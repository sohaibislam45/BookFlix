'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { showSuccess, showError, showConfirm } from '@/lib/swal';

export default function MyShelfPage() {
  const { userData } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [borrowings, setBorrowings] = useState({
    active: [],
    overdue: [],
    returned: [],
  });
  const [stats, setStats] = useState({
    active: 0,
    overdue: 0,
    returned: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, overdue, returned
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    if (userData?._id) {
      fetchBorrowings();
    }
  }, [userData]);

  const fetchBorrowings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/borrowings/member/${userData._id}`);
      if (response.ok) {
        const data = await response.json();
        const active = data.borrowings.filter((b) => b.status === 'active');
        const overdue = data.borrowings.filter((b) => b.status === 'overdue');
        const returned = data.borrowings.filter((b) => b.status === 'returned');
        setBorrowings({ active, overdue, returned });
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching borrowings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (borrowingId) => {
    try {
      setProcessing(borrowingId);
      const response = await fetch(`/api/borrowings/${borrowingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renew' }),
      });

      if (response.ok) {
        showSuccess('Success!', 'Book renewed successfully!');
        await fetchBorrowings();
      } else {
        const error = await response.json();
        showError('Error', error.error || 'Failed to renew book');
      }
    } catch (error) {
      console.error('Error renewing book:', error);
      showError('Error', 'Failed to renew book');
    } finally {
      setProcessing(null);
    }
  };

  const handleReturn = async (borrowingId) => {
    const result = await showConfirm('Return Book', 'Are you sure you want to return this book?');
    if (!result.isConfirmed) return;

    try {
      setProcessing(borrowingId);
      const response = await fetch(`/api/borrowings/${borrowingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'return' }),
      });

      if (response.ok) {
        showSuccess('Success!', 'Book returned successfully!');
        await fetchBorrowings();
        router.push('/member/shelf');
      } else {
        const error = await response.json();
        showError('Error', error.error || 'Failed to return book');
      }
    } catch (error) {
      console.error('Error returning book:', error);
      showError('Error', 'Failed to return book');
    } finally {
      setProcessing(null);
    }
  };

  const displayBorrowings = () => {
    if (filter === 'active') return borrowings.active;
    if (filter === 'overdue') return borrowings.overdue;
    if (filter === 'returned') return borrowings.returned;
    return [...borrowings.overdue, ...borrowings.active, ...borrowings.returned];
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white mb-2">My Shelf</h2>
            <p className="text-text-secondary">Your borrowed books and reading history</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            <button
              onClick={() => setFilter('all')}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-surface-dark text-text-secondary hover:bg-surface-hover hover:text-white border border-[#3c2348]'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filter === 'active'
                  ? 'bg-primary text-white'
                  : 'bg-surface-dark text-text-secondary hover:bg-surface-hover hover:text-white border border-[#3c2348]'
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setFilter('overdue')}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filter === 'overdue'
                  ? 'bg-alert-red text-white'
                  : 'bg-surface-dark text-text-secondary hover:bg-surface-hover hover:text-white border border-[#3c2348]'
              }`}
            >
              Overdue ({stats.overdue})
            </button>
            <button
              onClick={() => setFilter('returned')}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'returned'
                  ? 'bg-primary text-white'
                  : 'bg-surface-dark text-text-secondary hover:bg-surface-hover hover:text-white border border-[#3c2348]'
              }`}
            >
              History ({stats.returned})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-text-secondary">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-50 animate-spin">refresh</span>
              <p className="text-lg">Loading...</p>
            </div>
          ) : displayBorrowings().length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-50">shelves</span>
              <p className="text-lg">
                {filter === 'all'
                  ? 'No books on your shelf yet'
                  : filter === 'returned'
                  ? 'No returned books yet'
                  : `No ${filter} books`}
              </p>
              {filter !== 'returned' && (
                <Link
                  href="/member/browse"
                  className="inline-block mt-4 text-primary hover:text-white transition-colors font-medium"
                >
                  Browse our collection →
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayBorrowings().map((borrowing) => {
                const isOverdue = borrowing.status === 'overdue';
                const isReturned = borrowing.status === 'returned';

                return (
                  <div
                    key={borrowing._id}
                    className={`bg-surface-dark rounded-xl p-4 border transition-all group flex flex-col h-full ${
                      isOverdue
                        ? 'border-alert-red/40 hover:border-alert-red'
                        : isReturned
                        ? 'border-[#3c2348] opacity-80'
                        : 'border-[#3c2348] hover:border-primary/50'
                    }`}
                  >
                    <div className="relative w-full aspect-[16/9] mb-4 overflow-hidden rounded-lg">
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url('${borrowing.book?.coverImage}')` }}
                      ></div>
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
                      {isOverdue && (
                        <div className="absolute top-2 right-2 p-3 z-10">
                          <span className="animate-pulse size-2 rounded-full bg-alert-red block shadow-[0_0_10px_red]"></span>
                        </div>
                      )}
                      <div
                        className={`absolute bottom-2 right-2 backdrop-blur-md text-xs font-bold px-2 py-1 rounded ${
                          isOverdue
                            ? 'bg-alert-red/20 border border-alert-red/30 text-alert-red'
                            : isReturned
                            ? 'bg-gray-500/20 border border-gray-500/30 text-gray-300'
                            : borrowing.daysRemaining <= 3
                            ? 'bg-orange-500/20 border border-orange-500/30 text-orange-300'
                            : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        {isOverdue
                          ? `Overdue`
                          : isReturned
                          ? 'Returned'
                          : `Due ${new Date(borrowing.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold truncate">{borrowing.book?.title}</h4>
                      <p className="text-text-secondary text-xs mb-3">{borrowing.book?.author}</p>
                      {!isReturned && (
                        <div className="w-full bg-[#1c1022] h-1.5 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full ${
                              isOverdue ? 'bg-alert-red' : borrowing.daysRemaining <= 3 ? 'bg-orange-500' : 'bg-emerald-500'
                            }`}
                            style={{
                              width: isOverdue
                                ? '100%'
                                : `${Math.min((borrowing.daysRemaining / 7) * 100, 100)}%`,
                            }}
                          ></div>
                        </div>
                      )}
                      <p
                        className={`text-[10px] text-right mt-1 ${
                          isOverdue
                            ? 'text-alert-red font-bold'
                            : borrowing.daysRemaining <= 3
                            ? 'text-orange-300'
                            : 'text-text-secondary'
                        }`}
                      >
                        {isOverdue
                          ? `${borrowing.daysOverdue} day${borrowing.daysOverdue !== 1 ? 's' : ''} overdue`
                          : isReturned
                          ? `Returned ${new Date(borrowing.returnedDate).toLocaleDateString()}`
                          : `${borrowing.daysRemaining} day${borrowing.daysRemaining !== 1 ? 's' : ''} left`}
                      </p>
                    </div>
                    {!isReturned && (
                      <div className="mt-4 flex gap-2">
                        {!isOverdue && borrowing.renewalCount < 2 && (
                          <button
                            onClick={() => handleRenew(borrowing._id)}
                            disabled={processing === borrowing._id}
                            className="flex-1 bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {processing === borrowing._id ? 'Processing...' : 'Renew'}
                          </button>
                        )}
                        <button
                          onClick={() => handleReturn(borrowing._id)}
                          disabled={processing === borrowing._id}
                          className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50 ${
                            isOverdue
                              ? 'bg-alert-red hover:bg-red-600 text-white shadow-lg shadow-red-900/20'
                              : 'bg-[#3c2348] hover:bg-white/10 text-white'
                          }`}
                        >
                          {processing === borrowing._id ? 'Processing...' : 'Return'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
