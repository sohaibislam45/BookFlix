'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function CirculationDeskPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('checkout'); // checkout, return, overdue
  const [searchQuery, setSearchQuery] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [member, setMember] = useState(null);
  const [books, setBooks] = useState([]);
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (userData?.role !== 'librarian' && userData?.role !== 'admin') {
      router.push('/member/overview');
    }
  }, [userData, router]);

  useEffect(() => {
    if (activeTab === 'overdue') {
      fetchOverdueBooks();
    }
  }, [activeTab]);

  const fetchOverdueBooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/borrowings?status=overdue');
      if (response.ok) {
        const data = await response.json();
        setOverdueBooks(data.borrowings || []);
      }
    } catch (error) {
      console.error('Error fetching overdue books:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchMember = async () => {
    if (!memberSearch) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/users?email=${encodeURIComponent(memberSearch)}`);
      if (response.ok) {
        const data = await response.json();
        setMember(data);
        // Fetch member's borrowings
        if (data._id) {
          const borrowingsResponse = await fetch(`/api/borrowings/member/${data._id}`);
          if (borrowingsResponse.ok) {
            const borrowingsData = await borrowingsResponse.json();
            setBooks(borrowingsData.borrowings || []);
          }
        }
      } else {
        alert('Member not found');
        setMember(null);
      }
    } catch (error) {
      console.error('Error searching member:', error);
      alert('Error searching member');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (bookId) => {
    if (!member?._id || !bookId) return;
    try {
      setProcessing(true);
      const response = await fetch('/api/borrowings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member._id, bookId }),
      });

      if (response.ok) {
        alert('Book checked out successfully');
        // Refresh member's borrowings
        const borrowingsResponse = await fetch(`/api/borrowings/member/${member._id}`);
        if (borrowingsResponse.ok) {
          const borrowingsData = await borrowingsResponse.json();
          setBooks(borrowingsData.borrowings || []);
        }
        setSearchQuery('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to checkout book');
      }
    } catch (error) {
      console.error('Error checking out book:', error);
      alert('Failed to checkout book');
    } finally {
      setProcessing(false);
    }
  };

  const handleReturn = async (borrowingId) => {
    try {
      setProcessing(true);
      const response = await fetch(`/api/borrowings/${borrowingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'return', returnedBy: userData?._id }),
      });

      if (response.ok) {
        alert('Book returned successfully');
        // Refresh data
        if (member?._id) {
          const borrowingsResponse = await fetch(`/api/borrowings/member/${member._id}`);
          if (borrowingsResponse.ok) {
            const borrowingsData = await borrowingsResponse.json();
            setBooks(borrowingsData.borrowings || []);
          }
        }
        if (activeTab === 'overdue') {
          fetchOverdueBooks();
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to return book');
      }
    } catch (error) {
      console.error('Error returning book:', error);
      alert('Failed to return book');
    } finally {
      setProcessing(false);
    }
  };

  const searchBook = async () => {
    if (!searchQuery) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/books?search=${encodeURIComponent(searchQuery)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || []);
      }
    } catch (error) {
      console.error('Error searching books:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-black tracking-tight text-white mb-2">Circulation Desk</h2>
        <p className="text-text-secondary mb-8">Manage book checkouts and returns</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#3c2348]">
          <button
            onClick={() => setActiveTab('checkout')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'checkout'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-white'
            }`}
          >
            Checkout
          </button>
          <button
            onClick={() => setActiveTab('return')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'return'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-white'
            }`}
          >
            Return
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'overdue'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-white'
            }`}
          >
            Overdue Books
          </button>
        </div>

        {/* Checkout Tab */}
        {activeTab === 'checkout' && (
          <div className="space-y-6">
            <div className="bg-surface-dark rounded-xl p-6 border border-[#3c2348]">
              <h3 className="text-xl font-bold text-white mb-4">Find Member</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchMember()}
                  className="flex-1 bg-background-dark border border-[#3c2348] rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <button
                  onClick={searchMember}
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
              {member && (
                <div className="mt-4 p-4 bg-background-dark rounded-lg border border-[#3c2348]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-bold">{member.name}</h4>
                      <p className="text-text-secondary text-sm">{member.email}</p>
                      <p className="text-text-secondary text-xs mt-1">
                        Subscription: {member.subscription?.type || 'free'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {member && (
              <div className="bg-surface-dark rounded-xl p-6 border border-[#3c2348]">
                <h3 className="text-xl font-bold text-white mb-4">Checkout Book</h3>
                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Search book by title or ISBN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchBook()}
                    className="flex-1 bg-background-dark border border-[#3c2348] rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  <button
                    onClick={searchBook}
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {books.map((book) => (
                    <div key={book._id} className="bg-background-dark rounded-lg p-4 border border-[#3c2348]">
                      <div className="flex gap-3">
                        <div
                          className="w-16 h-24 bg-cover bg-center rounded flex-shrink-0"
                          style={{ backgroundImage: `url('${book.coverImage}')` }}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-bold truncate">{book.title}</h4>
                          <p className="text-text-secondary text-xs truncate">{book.author}</p>
                          <p className="text-text-secondary text-xs mt-1">
                            Available: {book.availableCopies || 0}
                          </p>
                          <button
                            onClick={() => handleCheckout(book._id)}
                            disabled={processing || (book.availableCopies || 0) === 0}
                            className="mt-2 w-full bg-primary hover:bg-primary/90 text-white text-xs font-bold py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? 'Processing...' : 'Checkout'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Return Tab */}
        {activeTab === 'return' && (
          <div className="space-y-6">
            <div className="bg-surface-dark rounded-xl p-6 border border-[#3c2348]">
              <h3 className="text-xl font-bold text-white mb-4">Find Member</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchMember()}
                  className="flex-1 bg-background-dark border border-[#3c2348] rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <button
                  onClick={searchMember}
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {member && (
              <div className="bg-surface-dark rounded-xl p-6 border border-[#3c2348]">
                <h3 className="text-xl font-bold text-white mb-4">Active Borrowings</h3>
                {loading ? (
                  <div className="text-center py-8 text-text-secondary">Loading...</div>
                ) : books.filter((b) => b.status === 'active' || b.status === 'overdue').length === 0 ? (
                  <div className="text-center py-8 text-text-secondary">No active borrowings</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {books
                      .filter((b) => b.status === 'active' || b.status === 'overdue')
                      .map((borrowing) => (
                        <div
                          key={borrowing._id}
                          className={`bg-background-dark rounded-lg p-4 border ${
                            borrowing.status === 'overdue' ? 'border-alert-red/50' : 'border-[#3c2348]'
                          }`}
                        >
                          <div className="flex gap-3">
                            <div
                              className="w-16 h-24 bg-cover bg-center rounded flex-shrink-0"
                              style={{ backgroundImage: `url('${borrowing.book?.coverImage}')` }}
                            ></div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold truncate">{borrowing.book?.title}</h4>
                              <p className="text-text-secondary text-xs truncate">{borrowing.book?.author}</p>
                              <p className="text-text-secondary text-xs mt-1">
                                Due: {new Date(borrowing.dueDate).toLocaleDateString()}
                              </p>
                              {borrowing.status === 'overdue' && (
                                <p className="text-alert-red text-xs font-bold mt-1">
                                  {borrowing.daysOverdue} day(s) overdue
                                </p>
                              )}
                              <button
                                onClick={() => handleReturn(borrowing._id)}
                                disabled={processing}
                                className="mt-2 w-full bg-primary hover:bg-primary/90 text-white text-xs font-bold py-1.5 rounded transition-colors disabled:opacity-50"
                              >
                                {processing ? 'Processing...' : 'Return'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Overdue Tab */}
        {activeTab === 'overdue' && (
          <div className="bg-surface-dark rounded-xl p-6 border border-[#3c2348]">
            <h3 className="text-xl font-bold text-white mb-4">Overdue Books</h3>
            {loading ? (
              <div className="text-center py-8 text-text-secondary">Loading...</div>
            ) : overdueBooks.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">No overdue books</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-[#3c2348]">
                    <tr>
                      <th className="pb-3 text-text-secondary text-sm font-semibold">Book</th>
                      <th className="pb-3 text-text-secondary text-sm font-semibold">Member</th>
                      <th className="pb-3 text-text-secondary text-sm font-semibold">Due Date</th>
                      <th className="pb-3 text-text-secondary text-sm font-semibold">Days Overdue</th>
                      <th className="pb-3 text-text-secondary text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueBooks.map((borrowing) => {
                      const daysOverdue = Math.ceil(
                        (new Date() - new Date(borrowing.dueDate)) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <tr key={borrowing._id} className="border-b border-[#3c2348]">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-12 h-16 bg-cover bg-center rounded flex-shrink-0"
                                style={{ backgroundImage: `url('${borrowing.book?.coverImage}')` }}
                              ></div>
                              <div>
                                <p className="text-white font-semibold">{borrowing.book?.title}</p>
                                <p className="text-text-secondary text-xs">{borrowing.book?.author}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <p className="text-white">{borrowing.member?.name}</p>
                            <p className="text-text-secondary text-xs">{borrowing.member?.email}</p>
                          </td>
                          <td className="py-3 text-text-secondary text-sm">
                            {new Date(borrowing.dueDate).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <span className="text-alert-red font-bold">{daysOverdue} days</span>
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => handleReturn(borrowing._id)}
                              disabled={processing}
                              className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-1.5 rounded transition-colors disabled:opacity-50"
                            >
                              {processing ? 'Processing...' : 'Return'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

