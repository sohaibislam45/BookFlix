'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LibrarianHeader from '@/components/LibrarianHeader';
import { showSuccess, showError, showConfirm } from '@/lib/swal';
import Link from 'next/link';

// Helper function to check if a string is a valid MongoDB ObjectId
const isValidObjectId = (str) => {
  return /^[0-9a-fA-F]{24}$/.test(str);
};

export default function CirculationDeskPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('checkout'); // checkout, return, renew
  const [searchQuery, setSearchQuery] = useState('');
  const [returnQuery, setReturnQuery] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [member, setMember] = useState(null);
  const [cart, setCart] = useState([]);
  const [books, setBooks] = useState([]);
  const [renewableBooks, setRenewableBooks] = useState([]);
  const [recentReturns, setRecentReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [totalFines, setTotalFines] = useState(0);

  useEffect(() => {
    if (userData?.role !== 'librarian' && userData?.role !== 'admin') {
      router.push('/member/overview');
    }
    fetchRecentReturns();
  }, [userData, router, fetchRecentReturns]);

  useEffect(() => {
    if (member?._id) {
      fetchMemberFines();
    }
  }, [member, fetchMemberFines]);

  const fetchRecentReturns = useCallback(async () => {
    try {
      const response = await fetch('/api/borrowings?status=returned&limit=5&sort=returnedDate');
      if (response.ok) {
        const data = await response.json();
        setRecentReturns(data.borrowings || []);
      }
    } catch (error) {
      console.error('Error fetching recent returns:', error);
    }
  }, []);

  const fetchMemberFines = useCallback(async () => {
    if (!member?._id) return;
    try {
      const response = await fetch(`/api/fines?memberId=${member._id}&status=pending`);
      if (response.ok) {
        const data = await response.json();
        const total = (data.fines || []).reduce((sum, fine) => sum + (fine.amount || 0), 0);
        setTotalFines(total);
      }
    } catch (error) {
      console.error('Error fetching fines:', error);
    }
  }, [member?._id]);

  const searchMember = async () => {
    if (!memberSearch) return;
    try {
      setLoading(true);
      
      // Check if it's a valid ObjectId (member ID)
      const isObjectId = isValidObjectId(memberSearch.trim());
      
      let response;
      if (isObjectId) {
        // Try to fetch by ID using admin members API
        response = await fetch(`/api/admin/members?userId=${memberSearch.trim()}`);
      } else {
        // Search by email
        response = await fetch(`/api/users?email=${encodeURIComponent(memberSearch)}`);
      }
      
      if (response.ok) {
        const data = await response.json();
        const foundMember = data.member || data.user || data;
        
        if (foundMember) {
          setMember(foundMember);
          // Fetch member's borrowings
          if (foundMember._id) {
            const borrowingsResponse = await fetch(`/api/borrowings/member/${foundMember._id}`);
            if (borrowingsResponse.ok) {
              const borrowingsData = await borrowingsResponse.json();
              setBooks(borrowingsData.borrowings || []);
              
              // Filter renewable books (active, not overdue, renewal count < 2)
              const renewable = (borrowingsData.borrowings || []).filter(
                (b) => b.status === 'active' && b.renewalCount < 2
              );
              setRenewableBooks(renewable);
            }
          }
          fetchMemberFines();
        } else {
          showError('Member Not Found', 'No member found with that email or ID');
          setMember(null);
        }
      } else {
        showError('Error', 'Error searching member');
        setMember(null);
      }
    } catch (error) {
      console.error('Error searching member:', error);
      showError('Error', 'Error searching member');
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  const searchBook = async (isbn) => {
    if (!isbn || !member) {
      if (!member) {
        showError('Member Required', 'Please search for a member first');
      }
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`/api/books?search=${encodeURIComponent(isbn)}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        if (data.books && data.books.length > 0) {
          const book = data.books[0];
          // Check if already in cart
          if (!cart.find((b) => b._id === book._id)) {
            // Check if member already has this book borrowed
            const alreadyBorrowed = books.some(
              (b) => b.book?._id === book._id && (b.status === 'active' || b.status === 'overdue')
            );
            if (alreadyBorrowed) {
              showError('Already Borrowed', 'Member already has this book borrowed');
              return;
            }
            
            // Check borrowing limit
            const activeCount = books.filter((b) => b.status === 'active' || b.status === 'overdue').length;
            const maxBooks = member.subscription?.type === 'free' ? 1 : 4;
            if (activeCount + cart.length >= maxBooks) {
              showError('Borrowing Limit', `Member can borrow maximum ${maxBooks} book(s) at a time`);
              return;
            }
            
            setCart([...cart, { ...book, dueDate: calculateDueDate() }]);
            setSearchQuery('');
            showSuccess('Book Added', 'Book added to cart successfully');
          } else {
            showError('Already in Cart', 'This book is already in the cart');
          }
        } else {
          showError('Book Not Found', 'No book found with that ISBN');
        }
      }
    } catch (error) {
      console.error('Error searching book:', error);
      showError('Error', 'Error searching for book');
    } finally {
      setLoading(false);
    }
  };

  const calculateDueDate = () => {
    const dueDate = new Date();
    const subscriptionType = member?.subscription?.type || 'free';
    const maxDays = subscriptionType === 'free' ? 7 : 20;
    dueDate.setDate(dueDate.getDate() + maxDays);
    return dueDate;
  };

  const handleCheckout = async () => {
    if (!member?._id || cart.length === 0) return;

    try {
      setProcessing(true);
      const results = [];
      
      for (const book of cart) {
        const response = await fetch('/api/borrowings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId: member._id, bookId: book._id }),
        });

        if (!response.ok) {
          const error = await response.json();
          results.push({ book: book.title, success: false, error: error.error });
        } else {
          results.push({ book: book.title, success: true });
        }
      }

      const failed = results.filter((r) => !r.success);
      const succeeded = results.filter((r) => r.success);

      if (failed.length > 0) {
        showError(
          'Checkout Incomplete',
          `Failed to checkout: ${failed.map((f) => f.book).join(', ')}\n${failed.map((f) => f.error).join('\n')}`
        );
      } else {
        showSuccess('Success!', `All ${succeeded.length} book(s) checked out successfully`);
      }

      setCart([]);
      setSearchQuery('');
      
      // Refresh member's borrowings
      if (member._id) {
        const borrowingsResponse = await fetch(`/api/borrowings/member/${member._id}`);
        if (borrowingsResponse.ok) {
          const borrowingsData = await borrowingsResponse.json();
          setBooks(borrowingsData.borrowings || []);
          
          const renewable = (borrowingsData.borrowings || []).filter(
            (b) => b.status === 'active' && (b.renewalCount || 0) < 2
          );
          setRenewableBooks(renewable);
        }
        fetchMemberFines();
      }
    } catch (error) {
      console.error('Error checking out books:', error);
      showError('Error', error.message || 'Failed to checkout books');
    } finally {
      setProcessing(false);
    }
  };

  const handleReturn = async (isbn) => {
    if (!isbn) return;
    try {
      setProcessing(true);
      // Find the borrowing by book ISBN
      const response = await fetch(`/api/borrowings?status=active&limit=100`);
      if (response.ok) {
        const data = await response.json();
        const borrowing = data.borrowings?.find((b) => b.book?.isbn === isbn);
        if (borrowing) {
          const returnResponse = await fetch(`/api/borrowings/${borrowing._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'return', returnedBy: userData?._id }),
          });

          if (returnResponse.ok) {
            showSuccess('Success!', 'Book returned successfully');
            fetchRecentReturns();
            setReturnQuery('');
            
            // Refresh member's borrowings if member is loaded
            if (member?._id) {
              const borrowingsResponse = await fetch(`/api/borrowings/member/${member._id}`);
              if (borrowingsResponse.ok) {
                const borrowingsData = await borrowingsResponse.json();
                setBooks(borrowingsData.borrowings || []);
              }
              fetchMemberFines();
            }
          } else {
            const error = await returnResponse.json();
            showError('Error', error.error || 'Failed to return book');
          }
        } else {
          showError('Not Found', 'No active borrowing found for this ISBN');
        }
      }
    } catch (error) {
      console.error('Error returning book:', error);
      showError('Error', 'Failed to return book');
    } finally {
      setProcessing(false);
    }
  };

  const handleRenew = async (borrowingId) => {
    try {
      setProcessing(true);
      const response = await fetch(`/api/borrowings/${borrowingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renew' }),
      });

      if (response.ok) {
        showSuccess('Success!', 'Book renewed successfully');
        
        // Refresh member's borrowings
        if (member._id) {
          const borrowingsResponse = await fetch(`/api/borrowings/member/${member._id}`);
          if (borrowingsResponse.ok) {
            const borrowingsData = await borrowingsResponse.json();
            setBooks(borrowingsData.borrowings || []);
            
            const renewable = (borrowingsData.borrowings || []).filter(
              (b) => b.status === 'active' && (b.renewalCount || 0) < 2
            );
            setRenewableBooks(renewable);
          }
        }
      } else {
        const error = await response.json();
        showError('Error', error.error || 'Failed to renew book');
      }
    } catch (error) {
      console.error('Error renewing book:', error);
      showError('Error', 'Failed to renew book');
    } finally {
      setProcessing(false);
    }
  };

  const removeFromCart = (bookId) => {
    setCart(cart.filter((b) => b._id !== bookId));
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
      <LibrarianHeader title="Circulation Desk" />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column - Main Checkout Area */}
        <div className="lg:col-span-8 flex flex-col border-r border-[#3c2348] bg-background-dark relative">
          <div className="p-6 pb-6 bg-[#23142b] border-b border-[#3c2348]">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Member Search */}
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs text-primary font-bold uppercase tracking-widest flex justify-between">
                  Check Member Status <span className="text-text-muted font-normal normal-case">[F1 Focus]</span>
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">search</span>
                  <div className="flex gap-2">
                    <input
                      className="w-full bg-[#2b1934] border border-[#553267] text-white text-lg font-mono h-12 pl-12 pr-4 rounded-xl focus:outline-none focus:border-primary placeholder:text-text-muted/50 transition-all"
                      placeholder="Scan Member ID or Search Email..."
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchMember()}
                    />
                    <button
                      onClick={searchMember}
                      disabled={loading}
                      className="bg-[#3c2348] hover:bg-primary text-white px-4 rounded-xl transition-colors border border-[#553267] hover:border-primary disabled:opacity-50"
                    >
                      Check
                    </button>
                  </div>
                </div>
              </div>

              {/* Member Info Display */}
              {member && (
                <div className="flex-[1.5] bg-[#2b1934]/50 border border-[#3c2348] rounded-xl p-3 flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-1 bg-emerald-500/10 rounded-bl-xl border-b border-l border-emerald-500/20 text-[10px] text-emerald-400 font-bold uppercase px-2">Active</div>
                  <div className="size-12 rounded-full bg-cover bg-center shrink-0 border border-[#553267] overflow-hidden">
                    {member.profilePhoto ? (
                      <img
                        src={member.profilePhoto}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#3c2348] text-white text-sm font-bold">
                        {getInitials(member.name)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-bold leading-tight truncate">{member.name}</h4>
                    <p className="text-text-muted text-xs truncate">ID: #{member._id.toString().slice(-4)} • {member.subscription?.type || 'free'}</p>
                  </div>
                  <div className="flex gap-3 text-xs border-l border-[#3c2348] pl-3">
                    <div className="text-center">
                      <div className="text-text-muted uppercase text-[9px]">Loans</div>
                      <div className="text-white font-bold text-lg">
                        {books.filter((b) => b.status === 'active' || b.status === 'overdue').length}
                        <span className="text-text-muted text-sm font-normal">/{member.subscription?.type === 'free' ? '1' : '4'}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-text-muted uppercase text-[9px]">Fines</div>
                      <div className={`font-bold text-lg ${totalFines > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        ${totalFines.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMember(null);
                      setCart([]);
                      setBooks([]);
                      setRenewableBooks([]);
                      setTotalFines(0);
                    }}
                    className="absolute bottom-2 right-2 p-1 text-text-muted hover:text-white rounded hover:bg-white/10"
                    title="Clear Member"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Checkout/Renew Tabs */}
          <div className="flex-1 flex flex-col min-h-0 bg-background-dark">
            <div className="flex items-center border-b border-[#3c2348] px-6 pt-2 gap-1 bg-[#23142b]">
              <button
                onClick={() => setActiveTab('checkout')}
                className={`relative px-6 py-3 rounded-t-lg font-medium text-sm flex items-center gap-2 transition-all ${
                  activeTab === 'checkout'
                    ? 'bg-primary/10 text-white border border-primary/20 border-b-transparent'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                Borrow Book
                {activeTab === 'checkout' && (
                  <span className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-primary shadow-[0_-2px_10px_rgba(170,31,239,0.5)]"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('renew')}
                className={`px-6 py-3 rounded-t-lg font-medium text-sm flex items-center gap-2 transition-all ${
                  activeTab === 'renew'
                    ? 'bg-primary/10 text-white border border-primary/20 border-b-transparent'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">autorenew</span>
                Renew Book
              </button>
              <div className="ml-auto text-xs text-text-muted flex gap-2">
                <span className="bg-[#2b1934] px-2 py-1 rounded border border-[#3c2348]">Session: #{Date.now().toString().slice(-4)}</span>
              </div>
            </div>

            {/* Checkout Tab Content */}
            {activeTab === 'checkout' && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="mb-6">
                  <label className="text-xs text-text-muted font-bold uppercase tracking-widest mb-2 block">Add Item to Cart</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">qr_code_scanner</span>
                    <input
                      autoFocus
                      className="w-full bg-[#2b1934] border border-[#553267] text-white text-xl font-mono h-14 pl-12 pr-24 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-text-muted/40 transition-all"
                      placeholder={member ? "Scan Book ISBN to borrow..." : "Search for member first..."}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && searchQuery && member) {
                          searchBook(searchQuery);
                        }
                      }}
                      disabled={!member}
                    />
                    <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#3c2348] text-text-muted text-xs rounded font-mono border border-[#553267]">Enter</kbd>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#23142b] rounded-xl border border-[#3c2348]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#2b1934] text-xs uppercase text-text-muted font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="p-4 border-b border-[#3c2348]">Book Title</th>
                        <th className="p-4 border-b border-[#3c2348]">Author</th>
                        <th className="p-4 border-b border-[#3c2348]">Due Date</th>
                        <th className="p-4 border-b border-[#3c2348] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-[#3c2348]">
                      {cart.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-8 text-center text-text-muted">
                            No items in cart. Scan a book ISBN to add.
                          </td>
                        </tr>
                      ) : (
                        cart.map((book) => (
                          <tr key={book._id} className="hover:bg-white/5 group transition-colors">
                            <td className="p-4 text-white font-medium flex items-center gap-3">
                              <div className="w-8 h-10 bg-gray-700 rounded overflow-hidden shrink-0">
                                {book.coverImage ? (
                                  <img
                                    src={book.coverImage}
                                    alt={book.title}
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
                              {book.title}
                            </td>
                            <td className="p-4 text-text-muted">{book.author}</td>
                            <td className="p-4 text-emerald-400 font-mono">
                              {new Date(book.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => removeFromCart(book._id)}
                                className="text-text-muted hover:text-red-400 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-text-muted">
                    Items: <span className="text-white font-bold">{cart.length}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCart([])}
                      className="px-5 py-2.5 rounded-lg border border-[#3c2348] text-text-muted hover:text-white hover:bg-[#3c2348] transition-colors font-medium text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCheckout}
                      disabled={cart.length === 0 || !member || processing}
                      className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold shadow-[0_0_15px_rgba(170,31,239,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">print</span>
                      Complete Checkout
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Renew Tab Content */}
            {activeTab === 'renew' && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                {!member ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-text-muted">
                      <span className="material-symbols-outlined text-6xl mb-4 block">person_search</span>
                      <p className="text-lg">Please search for a member first</p>
                    </div>
                  </div>
                ) : renewableBooks.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-text-muted">
                      <span className="material-symbols-outlined text-6xl mb-4 block">library_books</span>
                      <p className="text-lg">No renewable books found</p>
                      <p className="text-sm mt-2">All books are either renewed or overdue</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 text-sm text-text-muted">
                      Books eligible for renewal (can renew up to 2 times)
                    </div>
                    <div className="flex-1 overflow-y-auto bg-[#23142b] rounded-xl border border-[#3c2348]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#2b1934] text-xs uppercase text-text-muted font-semibold sticky top-0 z-10">
                          <tr>
                            <th className="p-4 border-b border-[#3c2348]">Book Title</th>
                            <th className="p-4 border-b border-[#3c2348]">Author</th>
                            <th className="p-4 border-b border-[#3c2348]">Current Due Date</th>
                            <th className="p-4 border-b border-[#3c2348]">Renewals</th>
                            <th className="p-4 border-b border-[#3c2348] text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-[#3c2348]">
                          {renewableBooks.map((borrowing) => (
                            <tr key={borrowing._id} className="hover:bg-white/5 group transition-colors">
                              <td className="p-4 text-white font-medium flex items-center gap-3">
                                <div className="w-8 h-10 bg-gray-700 rounded overflow-hidden shrink-0">
                                  {borrowing.book?.coverImage ? (
                                    <img
                                      src={borrowing.book.coverImage}
                                      alt={borrowing.book.title}
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
                                {borrowing.book?.title || 'Unknown Book'}
                              </td>
                              <td className="p-4 text-text-muted">{borrowing.book?.author || 'Unknown Author'}</td>
                              <td className="p-4 text-emerald-400 font-mono">
                                {borrowing.dueDate
                                  ? new Date(borrowing.dueDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : 'N/A'}
                              </td>
                              <td className="p-4 text-text-muted">
                                {borrowing.renewalCount || 0}/2
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleRenew(borrowing._id)}
                                  disabled={processing}
                                  className="px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[16px]">autorenew</span>
                                  Renew
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Quick Return */}
        <div className="lg:col-span-4 flex flex-col bg-[#160c1b] border-l border-[#3c2348]">
          <div className="p-6 border-b border-[#3c2348] bg-[#1e1024]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="p-1.5 bg-blue-500/10 rounded-md text-blue-400 border border-blue-500/20">
                  <span className="material-symbols-outlined text-[20px]">move_to_inbox</span>
                </span>
                Quick Return
              </h3>
              <span className="text-[10px] font-mono text-text-muted bg-[#2b1934] px-1.5 py-0.5 rounded border border-[#3c2348]">[F2]</span>
            </div>
          </div>
          <div className="p-6 border-b border-[#3c2348] bg-gradient-to-b from-[#1e1024] to-[#160c1b]">
            <div className="flex flex-col gap-3">
              <label className="text-xs text-text-muted font-bold uppercase tracking-widest">Scan Item to Return</label>
              <div className="relative">
                <input
                  className="w-full bg-[#2b1934] border border-[#3c2348] text-white text-lg font-mono h-14 pl-4 pr-12 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-text-muted/40 transition-all"
                  placeholder="ISBN..."
                  type="text"
                  value={returnQuery}
                  onChange={(e) => setReturnQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && returnQuery) {
                      handleReturn(returnQuery);
                    }
                  }}
                />
                <button
                  onClick={() => handleReturn(returnQuery)}
                  disabled={processing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3 px-2">Recently Returned</h4>
            <div className="flex flex-col gap-3">
              {recentReturns.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">No recent returns</div>
              ) : (
                recentReturns.map((returnItem) => (
                  <div
                    key={returnItem._id}
                    className="p-3 rounded-xl bg-[#2b1934] border-l-4 border-l-blue-500 border-y border-r border-[#3c2348] hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex gap-3">
                      <div className="w-10 h-14 bg-gray-700 rounded shadow-sm bg-cover shrink-0 overflow-hidden">
                        {returnItem.book?.coverImage ? (
                          <img
                            src={returnItem.book.coverImage}
                            alt={returnItem.book.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-500 text-xs">book</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold truncate">{returnItem.book?.title || 'Unknown Book'}</p>
                        <p className="text-xs text-text-muted mb-2">{returnItem.book?.author || 'Unknown Author'}</p>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">Shelving Cart A</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[10px] text-text-muted font-mono">
                        {returnItem.returnedDate
                          ? new Date(returnItem.returnedDate).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </span>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        Processed
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

