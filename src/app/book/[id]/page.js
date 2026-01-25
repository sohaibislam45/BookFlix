'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import UserProfile from '@/components/UserProfile';
import Loader from '@/components/Loader';
import { showError, showSuccess } from '@/lib/swal';
import Swal from 'sweetalert2';
import { USER_ROLES, RESERVATION_STATUS } from '@/lib/constants';
import BookStatusInfo from '@/components/BookStatusInfo';

export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userData } = useAuth();
  const bookId = params.id;

  const [book, setBook] = useState(null);
  const [similarBooks, setSimilarBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [checkingWishlist, setCheckingWishlist] = useState(false);
  const [isReserved, setIsReserved] = useState(false);
  const [checkingReservation, setCheckingReservation] = useState(false);
  const [realReviews, setRealReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [actionProcessing, setActionProcessing] = useState(false);

  // Role checks
  const isMember = userData?.role === USER_ROLES.MEMBER;
  const isAdmin = userData?.role === USER_ROLES.ADMIN;
  const isLibrarian = userData?.role === USER_ROLES.LIBRARIAN;
  const isStaff = isAdmin || isLibrarian;
  const isPremium = userData?.subscription?.status === 'active' && 
                    ['monthly', 'yearly'].includes(userData?.subscription?.type);

  // Check if book is in wishlist
  useEffect(() => {
    const checkWishlist = async () => {
      if (!user || !userData || !bookId) return;
      
      try {
        setCheckingWishlist(true);
        const response = await fetch(`/api/wishlist?userId=${userData._id}`);
        if (response.ok) {
          const data = await response.json();
          const isInWishlist = data.wishlists?.some(w => w.book._id === bookId);
          setIsFavorite(isInWishlist);
        }
      } catch (error) {
        console.error('Error checking wishlist:', error);
      } finally {
        setCheckingWishlist(false);
      }
    };

    checkWishlist();
  }, [user, userData, bookId]);

  // Check if book is already reserved by the user
  useEffect(() => {
    const checkReservation = async () => {
      if (!user || !userData || !bookId || !isMember) return;
      
      try {
        setCheckingReservation(true);
        const response = await fetch(`/api/reservations?memberId=${userData._id}&bookId=${bookId}`);
        if (response.ok) {
          const data = await response.json();
          // Check if there's an active reservation (pending or ready status)
          const activeReservation = data.reservations?.some(
            r => r.status === RESERVATION_STATUS.PENDING || r.status === RESERVATION_STATUS.READY
          );
          setIsReserved(activeReservation || false);
        }
      } catch (error) {
        console.error('Error checking reservation:', error);
      } finally {
        setCheckingReservation(false);
      }
    };

    checkReservation();
  }, [user, userData, bookId, isMember]);

  // Fetch book details
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await fetch(`/api/books/${bookId}`);
        if (response.ok) {
          const data = await response.json();
          setBook(data);
          
          // Fetch similar books (same category)
          if (data.category) {
            fetchSimilarBooks(data.category._id, data._id);
          }
        } else {
          showError('Book Not Found', 'The book you are looking for does not exist.');
          router.push('/explore');
        }
      } catch (error) {
        console.error('Error fetching book:', error);
        showError('Error', 'Failed to load book details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      fetchBook();
      fetchReviews();
    }
  }, [bookId, router]);

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    try {
      setLoadingReviews(true);
      const response = await fetch(`/api/books/${bookId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setRealReviews(data || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  }, [bookId]);

  // Fetch similar books
  const fetchSimilarBooks = async (categoryId, excludeId) => {
    try {
      const response = await fetch(`/api/books?category=${categoryId}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        // Filter out current book
        const similar = (data.books || []).filter(b => b._id !== excludeId).slice(0, 5);
        setSimilarBooks(similar);
      }
    } catch (error) {
      console.error('Error fetching similar books:', error);
    }
  };

  // Handle borrow
  const handleBorrow = async () => {
    if (!user) {
      showError('Login Required', 'You need to login first to borrow a book.');
      sessionStorage.setItem('returnAfterLogin', `/book/${bookId}`);
      router.push('/login');
      return;
    }

    // Only members can borrow books
    if (!isMember) {
      showError('Borrowing Not Available', 'Book borrowing is only available for members. Please contact support if you need assistance.');
      return;
    }

    if (actionProcessing) return;

    const result = await showConfirm(
      'Borrow Book',
      'Are you sure you want to borrow this book?',
      {
        confirmButtonText: 'Yes, borrow it',
        cancelButtonText: 'Cancel'
      }
    );

    if (!result.isConfirmed) return;

    try {
      setReserving(true);
      setActionProcessing(true);
      const response = await fetch('/api/borrowings/borrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: userData._id,
          bookId: book._id,
        }),
      });

      if (response.ok) {
        showSuccess('Success!', 'Book borrowed successfully!');
        // Refresh book data to update available copies
        const bookResponse = await fetch(`/api/books/${bookId}`);
        if (bookResponse.ok) {
          const bookData = await bookResponse.json();
          setBook(bookData);
        }
      } else {
        const errorData = await response.json();
        showError('Borrowing Failed', errorData.error || 'Could not borrow book. Please try again.');
      }
    } catch (error) {
      console.error('Error borrowing book:', error);
      showError('Error', 'Failed to borrow book. Please try again.');
    } finally {
      setReserving(false);
    }
  };

  // Handle reservation
  const handleReserve = async () => {
    if (!user) {
      showError('Login Required', 'You need to login first to reserve a book.');
      // Store current page in sessionStorage to return after login
      sessionStorage.setItem('returnAfterLogin', `/book/${bookId}`);
      router.push('/login');
      return;
    }

    // Only members can reserve books
    if (!isMember) {
      showError('Reservation Not Available', 'Book reservations are only available for members. Please contact support if you need assistance.');
      return;
    }

    // Check if user is premium
    if (!isPremium) {
      showError('Premium Feature', 'Reservations are only available for premium members. Please upgrade your plan to access this feature.');
      router.push('/member/upgrade');
      return;
    }

    // Check if book is already reserved
    if (book.currentReserver) {
      if (book.currentReserver.member._id === userData._id) {
        showError('Already Reserved', 'You have already reserved this book.');
      } else {
        showError('Already Reserved', `This book is already reserved by ${book.currentReserver.member.name}.`);
      }
      return;
    }

    try {
      setReserving(true);
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: userData._id,
          bookId: book._id,
        }),
      });

      if (response.ok) {
        setIsReserved(true);
        showSuccess('Reserved!', 'Book has been reserved successfully. You will be notified when it\'s available.');
        // Refresh book data to update currentReserver
        const bookResponse = await fetch(`/api/books/${bookId}`);
        if (bookResponse.ok) {
          const bookData = await bookResponse.json();
          setBook(bookData);
        }
      } else {
        const errorData = await response.json();
        if (errorData.reserver) {
          showError('Already Reserved', `This book is already reserved by ${errorData.reserver.name}.`);
        } else {
          showError('Reservation Failed', errorData.error || 'Could not reserve book. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error reserving book:', error);
      showError('Error', 'Failed to reserve book. Please try again.');
    } finally {
      setReserving(false);
    }
  };

  // Handle home delivery (premium feature)
  const handleHomeDelivery = async () => {
    if (!user || !userData) {
      showError('Login Required', 'You need to login first to request home delivery.');
      sessionStorage.setItem('returnAfterLogin', `/book/${bookId}`);
      router.push('/login');
      return;
    }

    // Only members can request home delivery
    if (!isMember) {
      showError('Home Delivery Not Available', 'Home delivery is only available for members. Please contact support if you need assistance.');
      return;
    }

    if (!isPremium) {
      router.push('/member/upgrade');
      return;
    }

    // TODO: Implement home delivery reservation API
    // For now, treat it as a reservation with delivery option
    try {
      setReserving(true);
      setActionProcessing(true);
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: userData._id,
          bookId: book._id,
          // Note: Add delivery flag when API supports it
        }),
      });

      if (response.ok) {
        showSuccess('Home Delivery Requested!', 'Your home delivery request has been submitted successfully. You will be notified when the book is ready for delivery.');
      } else {
        const errorData = await response.json();
        showError('Request Failed', errorData.error || 'Could not request home delivery. Please try again.');
      }
    } catch (error) {
      console.error('Error requesting home delivery:', error);
      showError('Error', 'Failed to request home delivery. Please try again.');
    } finally {
      setReserving(false);
    }
  };

  // Toggle wishlist
  const toggleFavorite = async () => {
    if (!user || !userData) {
      showError('Login Required', 'You need to login first to add books to your wishlist.');
      sessionStorage.setItem('returnAfterLogin', `/book/${bookId}`);
      router.push('/login');
      return;
    }

    try {
      setActionProcessing(true);
      if (isFavorite) {
        // Remove from wishlist
        const response = await fetch(`/api/wishlist?userId=${userData._id}&bookId=${book._id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setIsFavorite(false);
          showSuccess('Removed from Wishlist', 'Book has been removed from your wishlist.');
        } else {
          const errorData = await response.json();
          showError('Error', errorData.error || 'Failed to remove from wishlist.');
        }
      } else {
        // Add to wishlist
        const response = await fetch('/api/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userData._id,
            bookId: book._id,
          }),
        });

        if (response.ok) {
          setIsFavorite(true);
          const result = await showSuccess(
            'Added to Wishlist', 
            'Book has been added to your wishlist successfully!',
            {
              showCancelButton: true,
              confirmButtonText: 'OK',
              cancelButtonText: 'Go to My Wishlist',
            }
          );
          
          // If user clicked "Go to My Wishlist" (cancel button), navigate to wishlist page
          if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
            router.push('/member/wishlist');
          }
        } else {
          const errorData = await response.json();
          showError('Error', errorData.error || 'Failed to add to wishlist.');
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      showError('Error', 'Failed to update wishlist. Please try again.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).getFullYear();
  };

  // Render star rating
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex items-center gap-1 text-yellow-400">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="material-symbols-outlined !text-[16px] fill-current">star</span>
        ))}
        {hasHalfStar && (
          <span className="material-symbols-outlined !text-[16px] fill-current">star_half</span>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="material-symbols-outlined !text-[16px] text-surface-border">star</span>
        ))}
      </div>
    );
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!book) {
    return null;
  }

  const isAvailable = book.availableCopies > 0;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white overflow-x-hidden">
      {/* Top Navigation */}
      <div className="w-full border-b border-solid border-surface-border bg-background-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="px-6 md:px-10 lg:px-40 flex justify-center py-3">
          <div className="flex w-full max-w-[1200px] items-center justify-between whitespace-nowrap">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-4 text-white cursor-pointer hover:opacity-80 transition-opacity">
                <div className="size-6 text-primary">
                  <span className="material-symbols-outlined !text-[28px]">auto_stories</span>
                </div>
                <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">Bookflix</h2>
              </Link>
              <div className="hidden md:flex items-center gap-9">
                <Link className="text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="/explore">
                  Browse
                </Link>
              </div>
            </div>
            <div className="flex flex-1 justify-end gap-6 items-center">
              {user ? (
                <UserProfile />
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    className="text-white/80 hover:text-white text-sm font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-md text-sm font-bold transition-all"
                  >
                    Join Now
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col items-center flex-1 w-full px-4 md:px-10 lg:px-40 py-8">
        <div className="flex flex-col max-w-[1200px] w-full gap-8">
          {/* Breadcrumbs */}
          <div className="flex flex-wrap gap-2 items-center text-sm">
            <Link href="/" className="text-text-secondary font-medium hover:text-white transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined !text-[16px]">home</span>
              Home
            </Link>
            <span className="text-text-secondary/50">/</span>
            <Link href="/explore" className="text-text-secondary font-medium hover:text-white transition-colors">
              Browse
            </Link>
            {book.category && (
              <>
                <span className="text-text-secondary/50">/</span>
                <Link href={`/explore?category=${book.category._id}`} className="text-text-secondary font-medium hover:text-white transition-colors capitalize">
                  {book.category.name}
                </Link>
              </>
            )}
            <span className="text-text-secondary/50">/</span>
            <span className="text-white font-medium">{book.title}</span>
          </div>

          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            {/* Left Column: Cover Image */}
            <div className="lg:col-span-4 relative group">
              <div className="absolute -inset-4 bg-primary/30 rounded-2xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
              <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden shadow-2xl shadow-black border border-white/5 bg-surface-dark">
                <Image
                  src={book.coverImage || '/placeholder-book.png'}
                  alt={`Cover of ${book.title}`}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                  {book.publisher && (
                    <span className="text-white/40 text-xs font-mono uppercase tracking-widest mb-1">
                      {book.publisher}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowLightbox(true)}
                className="absolute bottom-6 right-6 size-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300 cursor-pointer"
              >
                <span className="material-symbols-outlined">visibility</span>
              </button>
            </div>

            {/* Right Column: Details */}
            <div className="lg:col-span-8 flex flex-col justify-start">
              {/* Header */}
              <div className="flex flex-col gap-4 mb-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">{book.title}</h1>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-text-secondary text-base">
                  <Link href={`/explore?search=${encodeURIComponent(book.author)}`} className="font-medium text-white hover:text-primary transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined !text-[18px]">person</span>
                    {book.author}
                  </Link>
                  <span className="size-1 rounded-full bg-surface-border"></span>
                  {formatDate(book.publishedDate) && <span>{formatDate(book.publishedDate)}</span>}
                  {book.pages && (
                    <>
                      <span className="size-1 rounded-full bg-surface-border"></span>
                      <span>{book.pages} Pages</span>
                    </>
                  )}
                  {book.rating > 0 && (
                    <>
                      <span className="size-1 rounded-full bg-surface-border"></span>
                      <div className="flex items-center gap-1">
                        {renderStars(book.rating)}
                        <span className="text-white font-bold">{book.rating.toFixed(1)}</span>
                        <span className="text-text-secondary font-normal">
                          ({book.ratingCount > 0 ? `${book.ratingCount}${book.ratingCount >= 1000 ? 'k' : ''} reviews` : 'No reviews'})
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Tags/Chips */}
              <div className="flex flex-wrap gap-2 mb-8">
                {book.category && (
                  <div className="flex h-7 items-center justify-center rounded-full border border-surface-border bg-surface-dark/50 px-3 hover:border-primary/50 transition-colors cursor-default">
                    <p className="text-text-secondary text-xs font-medium uppercase tracking-wide capitalize">
                      {book.category.name}
                    </p>
                  </div>
                )}
                {book.tags && book.tags.slice(0, 3).map((tag, index) => (
                  <div key={index} className="flex h-7 items-center justify-center rounded-full border border-surface-border bg-surface-dark/50 px-3 hover:border-primary/50 transition-colors cursor-default">
                    <p className="text-text-secondary text-xs font-medium uppercase tracking-wide">
                      {tag}
                    </p>
                  </div>
                ))}
              </div>

              {/* Synopsis */}
              {book.description && (
                <div className="prose prose-invert max-w-none mb-8">
                  <h3 className="text-white text-lg font-bold mb-2">Synopsis</h3>
                  <p className="text-gray-300 leading-relaxed text-lg font-light whitespace-pre-line">
                    {book.description}
                  </p>
                </div>
              )}

              {/* Availability & Actions */}
              <div className="bg-surface-dark/40 border border-surface-border rounded-xl p-6 backdrop-blur-sm">
                {/* Borrower/Reserver Info */}
                {book.currentBorrower || book.currentReserver ? (
                  <BookStatusInfo 
                    currentBorrower={book.currentBorrower}
                    currentReserver={book.currentReserver}
                    isPremium={isPremium}
                  />
                ) : null}

                {/* Status Line */}
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-surface-border/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-text-secondary tracking-wider">Status</span>
                    <div className="flex items-center gap-2">
                      {isAvailable ? (
                        <>
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                          <span className="text-white font-medium">Available for Pickup</span>
                          <span className="text-text-secondary text-sm ml-2">
                            {book.availableCopies} {book.availableCopies === 1 ? 'copy' : 'copies'} available
                          </span>
                        </>
                      ) : book.currentReserver ? (
                        <>
                          <span className="relative flex h-3 w-3">
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                          </span>
                          <span className="text-white font-medium">Reserved</span>
                          <span className="text-text-secondary text-sm ml-2">
                            {book.currentReserver.member._id === userData?._id 
                              ? 'You have reserved this book'
                              : `Reserved by ${book.currentReserver.member.name}`
                            }
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="relative flex h-3 w-3">
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                          </span>
                          <span className="text-white font-medium">Waitlist Only</span>
                          <span className="text-text-secondary text-sm ml-2">
                            {isPremium ? 'Reserve this book' : 'Premium members can reserve'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {book.isbn && (
                    <div className="text-right hidden sm:block">
                      <span className="text-xs font-semibold uppercase text-text-secondary tracking-wider block mb-1">ISBN</span>
                      <p className="text-white font-mono text-sm">{book.isbn}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                  {isStaff ? (
                    /* Staff Actions (Admin/Librarian) */
                    <>
                      <Link
                        href={isAdmin ? '/admin/books' : '/librarian/books'}
                        className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold h-12 px-6 rounded-lg shadow-[0_0_20px_-5px_rgba(170,31,239,0.4)] transition-all flex items-center justify-center gap-2 group/btn"
                      >
                        <span className="material-symbols-outlined">edit</span>
                        <span>Manage Book</span>
                        <span className="material-symbols-outlined opacity-0 group-hover/btn:translate-x-1 group-hover/btn:opacity-100 transition-all text-sm">arrow_forward</span>
                      </Link>
                      <Link
                        href={isAdmin ? '/admin/overview' : '/librarian/circulation'}
                        className="flex-1 h-12 px-6 rounded-lg border border-surface-border bg-surface-dark text-text-secondary hover:border-primary hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">{isAdmin ? 'dashboard' : 'history'}</span>
                        <span>{isAdmin ? 'View Dashboard' : 'View Circulation'}</span>
                      </Link>
                      <button
                        onClick={toggleFavorite}
                        className="h-12 w-12 rounded-lg border border-surface-border bg-surface-dark text-white hover:bg-surface-border hover:text-red-400 transition-colors flex items-center justify-center shrink-0"
                      >
                        <span className={`material-symbols-outlined ${isFavorite ? 'fill text-red-400' : ''}`}>
                          favorite
                        </span>
                      </button>
                    </>
                  ) : (
                    /* Member Actions */
                    <>
                      {/* Primary Action - Show Borrow for available books, Reserve for unavailable (premium only) */}
                      {isAvailable ? (
                        // Book is available - show Borrow button for all members
                        <button
                          onClick={handleBorrow}
                          disabled={reserving || !isMember || actionProcessing}
                          className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold h-12 px-6 rounded-lg shadow-[0_0_20px_-5px_rgba(170,31,239,0.4)] transition-all flex items-center justify-center gap-2 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reserving || actionProcessing ? (
                            <>
                              <Loader />
                              <span>{reserving ? 'Processing...' : 'Wait...'}</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined">local_library</span>
                              <span>Borrow</span>
                              <span className="material-symbols-outlined opacity-0 group-hover/btn:translate-x-1 group-hover/btn:opacity-100 transition-all text-sm">arrow_forward</span>
                            </>
                          )}
                        </button>
                      ) : (
                        // Book is unavailable - show Reserve button only for premium members
                        isPremium ? (
                          book.currentReserver ? (
                            // Already reserved by someone
                            <div className="flex-1 relative group/tooltip">
                              <button
                                disabled
                                className="flex-1 bg-surface-dark/50 text-text-secondary font-bold h-12 px-6 rounded-lg border border-surface-border cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                <span className="material-symbols-outlined">lock</span>
                                <span>Already Reserved</span>
                              </button>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black border border-surface-border rounded text-center opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                                <p className="text-xs text-primary font-bold">Reserved</p>
                                <p className="text-xs text-gray-400">
                                  {book.currentReserver.member._id === userData?._id 
                                    ? 'You have reserved this book'
                                    : `Reserved by ${book.currentReserver.member.name}`
                                  }
                                </p>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={handleReserve}
                              disabled={reserving || isReserved || !user || !isMember || checkingReservation || actionProcessing}
                              className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold h-12 px-6 rounded-lg shadow-[0_0_20px_-5px_rgba(170,31,239,0.4)] transition-all flex items-center justify-center gap-2 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {reserving ? (
                                <>
                                  <Loader />
                                  <span>Reserving...</span>
                                </>
                              ) : isReserved ? (
                                <>
                                  <span className="material-symbols-outlined">check_circle</span>
                                  <span>Already Reserved</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined">local_library</span>
                                  <span>Reserve Book</span>
                                  <span className="material-symbols-outlined opacity-0 group-hover/btn:translate-x-1 group-hover/btn:opacity-100 transition-all text-sm">arrow_forward</span>
                                </>
                              )}
                            </button>
                          )
                        ) : (
                          <div className="flex-1 relative group/tooltip">
                            <button
                              disabled
                              className="flex-1 bg-surface-dark/50 text-text-secondary font-bold h-12 px-6 rounded-lg border border-surface-border cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined">lock</span>
                              <span>Premium Feature</span>
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black border border-surface-border rounded text-center opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                              <p className="text-xs text-primary font-bold">Premium Feature</p>
                              <p className="text-xs text-gray-400">Upgrade to reserve books</p>
                            </div>
                          </div>
                        )
                      )}

                      {/* Secondary Action (Premium) */}
                      <div className="flex-1 relative group/tooltip">
                        <button
                          onClick={handleHomeDelivery}
                          disabled={!isPremium || reserving || !isMember || actionProcessing}
                          className={`w-full h-12 px-6 rounded-lg border border-surface-border bg-surface-dark text-text-secondary flex items-center justify-center gap-2 transition-all ${
                            isPremium && !reserving && isMember && !actionProcessing
                              ? 'hover:border-primary hover:text-white cursor-pointer' 
                              : 'disabled:cursor-not-allowed disabled:opacity-70 hover:opacity-100 hover:border-surface-border'
                          }`}
                        >
                          {reserving || actionProcessing ? (
                            <>
                              <Loader />
                              <span>{reserving ? 'Processing...' : 'Wait...'}</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">{isPremium ? 'local_shipping' : 'lock'}</span>
                              <span>Request Home Delivery</span>
                            </>
                          )}
                        </button>
                        {!isPremium && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black border border-surface-border rounded text-center opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10">
                            <p className="text-xs text-primary font-bold">Premium Feature</p>
                            <p className="text-xs text-gray-400">Upgrade to unlock delivery</p>
                          </div>
                        )}
                      </div>

                      {/* Favorite Action */}
                      <button
                        onClick={toggleFavorite}
                        disabled={actionProcessing}
                        className="h-12 w-12 rounded-lg border border-surface-border bg-surface-dark text-white hover:bg-surface-border hover:text-red-400 transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
                      >
                        <span className={`material-symbols-outlined ${isFavorite ? 'fill text-red-400' : ''}`}>
                          favorite
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-surface-border my-4"></div>

          {/* Reviews Section */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-xl font-bold">Community Reviews</h3>
              {book.ratingCount > 0 && (
                <span className="text-sm text-text-secondary font-medium">
                  {book.ratingCount} {book.ratingCount === 1 ? 'review' : 'reviews'}
                </span>
              )}
            </div>
            
            {loadingReviews ? (
              <div className="py-12 flex justify-center">
                <Loader />
              </div>
            ) : realReviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {realReviews.map((review) => (
                  <div key={review._id} className="bg-surface-dark border border-surface-border p-5 rounded-xl flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="size-8 rounded-full bg-cover bg-center bg-surface-border overflow-hidden"
                          style={review.user?.profileImage ? { backgroundImage: `url(${review.user.profileImage})` } : {}}
                        >
                          {!review.user?.profileImage && (
                            <span className="material-symbols-outlined text-gray-500 w-full h-full flex items-center justify-center text-xl">person</span>
                          )}
                        </div>
                        <span className="text-white font-medium text-sm">{review.user?.name || 'Anonymous User'}</span>
                      </div>
                      <span className="text-text-secondary text-xs">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex text-yellow-400 text-xs">
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface-dark/40 border border-white/5 p-12 rounded-2xl text-center">
                <span className="material-symbols-outlined text-gray-600 text-5xl mb-4">rate_review</span>
                <p className="text-gray-500 text-lg">No review found for this book.</p>
                <p className="text-gray-600 text-sm mt-1">Be the first to share your thoughts!</p>
              </div>
            )}
          </div>

          {/* More Like This Section */}
          {similarBooks.length > 0 && (
            <div className="flex flex-col gap-6 pt-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                <h3 className="text-white text-xl font-bold">More Like This</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {similarBooks.map((similarBook) => (
                  <Link
                    key={similarBook._id}
                    href={`/book/${similarBook._id}`}
                    className="group cursor-pointer flex flex-col gap-2"
                  >
                    <div className="aspect-[2/3] w-full rounded-lg bg-surface-dark overflow-hidden relative border border-surface-border/50 transition-all duration-300 group-hover:border-primary group-hover:shadow-[0_0_20px_-5px_rgba(170,31,239,0.3)]">
                      <Image
                        src={similarBook.coverImage || '/placeholder-book.png'}
                        alt={`Cover of ${similarBook.title}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                      {similarBook.rating > 0 && (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white flex items-center gap-1">
                          <span className="material-symbols-outlined !text-[12px] text-yellow-400 fill-current">star</span>
                          {similarBook.rating.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {similarBook.title}
                      </h4>
                      <p className="text-text-secondary text-xs">
                        {similarBook.author}
                        {similarBook.publishedDate && ` • ${new Date(similarBook.publishedDate).getFullYear()}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {showLightbox && book && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLightbox(false);
              }}
              className="absolute top-4 right-4 text-white hover:text-primary transition-colors z-10 bg-black/50 rounded-full p-2 hover:bg-black/70"
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full h-full flex items-center justify-center"
            >
              <Image
                src={book.coverImage || '/placeholder-book.png'}
                alt={`Cover of ${book.title}`}
                width={600}
                height={900}
                className="object-contain max-h-[90vh] rounded-lg shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

