'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import UserProfile from '@/components/UserProfile';
import Loader from '@/components/Loader';
import { showError, showSuccess } from '@/lib/swal';

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
          router.push('/browse');
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
    }
  }, [bookId, router]);

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

  // Handle reservation
  const handleReserve = async () => {
    if (!user) {
      showError('Login Required', 'You need to login first to reserve a book.');
      // Store current page in sessionStorage to return after login
      sessionStorage.setItem('returnAfterLogin', `/book/${bookId}`);
      router.push('/login');
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
        showSuccess('Reserved!', 'Book has been reserved successfully. You will be notified when it\'s available.');
      } else {
        const errorData = await response.json();
        showError('Reservation Failed', errorData.error || 'Could not reserve book. Please try again.');
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

    if (!isPremium) {
      router.push('/member/upgrade');
      return;
    }

    // TODO: Implement home delivery reservation API
    // For now, treat it as a reservation with delivery option
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
          showSuccess('Added to Wishlist', 'Book has been added to your wishlist successfully!');
        } else {
          const errorData = await response.json();
          showError('Error', errorData.error || 'Failed to add to wishlist.');
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      showError('Error', 'Failed to update wishlist. Please try again.');
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

  // Mock reviews (can be replaced with real API later)
  const mockReviews = [
    {
      id: 1,
      user: 'Sarah Jenkins',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBytsJMQWZz44dSkra8sEfXwbDkoPNv84owib6_WVjuo88IHJtEfjc9DBQAM9OG9ahHbAcXBANA-obvixbdFUdDW3i3KN3sjCgumg52KxyhEkEyaGRUqqbOYgDDrTvK7WPj-Pdwkp--_PC9qAGzUVE97ofVZViTblcq97eZN0tQNAtBwdnh49_Rw675VDakYNkf1i6QseQx4vRsSkCRVuN3PyQSAsuNAmkT4cDvUxYJ9Zuzw1lx-O3t-JmQuUEFitdb252VUwpt5Yw',
      rating: 5,
      date: '2 days ago',
      text: 'A masterpiece of world-building. I\'ve read this book three times and discover something new every single time. The politics are intense.',
    },
    {
      id: 2,
      user: 'Marcus Chen',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQu34GD3LmYSaHFN-uHkD_kMiUsdqn252HByvVZ714bMhkoF3RtsrYfL-teDcu8iCij_zoRUXQIxGG6s49f6Y-ddQqQT-Kd8C9KpE2t1sl4QQXvEmnOwDt3IVb8gPDzCgsrRLewWSPXqtluJxffbuxHXMJ9CHwPaNtXYqhNwUGdHmRhJXRJacVAIslWm5hM7UQ7yIWWMYiLGMnB9p6NoUL0mqUAg6v0JVpEd4JaDxfQ1tb30NNl8rWzGl1Nyn76Uqd9lpxaXpG1ME',
      rating: 4,
      date: '1 week ago',
      text: 'The beginning is a bit slow, but once you get into it, it\'s impossible to put down. Highly recommend for any fan of the genre.',
    },
    {
      id: 3,
      user: 'Elara Vance',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvQAG4ay6pSfoHhIr29thG5MQURDU-7VEojVqwfOk9YBH6_8Tf3WwhiZ0cTfD90VsbKWSvc6cQCb7ZJ4DQiol0nwmxqHpYrTyPaKIHpQ5Qo52b8X000nPoWb40W1QoKv1uzOhVBvrqGudMMDEiVjOZypS7gZquZm4YkH5UxHjNAsA5SLGlaN83o5wp8UEpzQZ7kva-gt1G7vzMZPVQUA1b08k36hBYf9-_2mZ8a0rgpmLnllGmzCCFUGSpNOrCjgn_4Vlwe_TAtfQ',
      rating: 5,
      date: '3 weeks ago',
      text: 'The themes are so relevant today. A must-read for everyone.',
    },
  ];

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

  const isPremium = userData?.subscription?.status === 'active' && 
                    ['monthly', 'yearly'].includes(userData?.subscription?.type);
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
                <Link className="text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="/browse">
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
            <Link href="/browse" className="text-text-secondary font-medium hover:text-white transition-colors">
              Browse
            </Link>
            {book.category && (
              <>
                <span className="text-text-secondary/50">/</span>
                <Link href={`/browse?category=${book.category._id}`} className="text-text-secondary font-medium hover:text-white transition-colors capitalize">
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
                  <Link href={`/browse?search=${encodeURIComponent(book.author)}`} className="font-medium text-white hover:text-primary transition-colors flex items-center gap-1">
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
                      ) : (
                        <>
                          <span className="relative flex h-3 w-3">
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                          </span>
                          <span className="text-white font-medium">Waitlist Only</span>
                          <span className="text-text-secondary text-sm ml-2">
                            Join the waitlist to reserve
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
                  {/* Primary Action */}
                  <button
                    onClick={handleReserve}
                    disabled={reserving || (!isAvailable && !user)}
                    className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold h-12 px-6 rounded-lg shadow-[0_0_20px_-5px_rgba(170,31,239,0.4)] transition-all flex items-center justify-center gap-2 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reserving ? (
                      <>
                        <Loader />
                        <span>Reserving...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">local_library</span>
                        <span>{isAvailable ? 'Reserve for Pickup' : 'Join Waitlist'}</span>
                        <span className="material-symbols-outlined opacity-0 group-hover/btn:translate-x-1 group-hover/btn:opacity-100 transition-all text-sm">arrow_forward</span>
                      </>
                    )}
                  </button>

                  {/* Secondary Action (Premium) */}
                  <div className="flex-1 relative group/tooltip">
                    <button
                      onClick={handleHomeDelivery}
                      disabled={!isPremium || reserving}
                      className={`w-full h-12 px-6 rounded-lg border border-surface-border bg-surface-dark text-text-secondary flex items-center justify-center gap-2 transition-all ${
                        isPremium && !reserving
                          ? 'hover:border-primary hover:text-white cursor-pointer' 
                          : 'disabled:cursor-not-allowed disabled:opacity-70 hover:opacity-100 hover:border-surface-border'
                      }`}
                    >
                      {reserving ? (
                        <>
                          <Loader />
                          <span>Processing...</span>
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
                    className="h-12 w-12 rounded-lg border border-surface-border bg-surface-dark text-white hover:bg-surface-border hover:text-red-400 transition-colors flex items-center justify-center shrink-0"
                  >
                    <span className={`material-symbols-outlined ${isFavorite ? 'fill text-red-400' : ''}`}>
                      favorite
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-surface-border my-4"></div>

          {/* Reviews Section */}
          {mockReviews.length > 0 && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-white text-xl font-bold">Community Reviews</h3>
                {book.ratingCount > 0 && (
                  <Link href="#" className="text-sm text-primary font-medium hover:text-white transition-colors">
                    View all {book.ratingCount} reviews
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockReviews.map((review) => (
                  <div key={review.id} className="bg-surface-dark border border-surface-border p-5 rounded-xl flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="size-8 rounded-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${review.avatar})` }}
                        ></div>
                        <span className="text-white font-medium text-sm">{review.user}</span>
                      </div>
                      <span className="text-text-secondary text-xs">{review.date}</span>
                    </div>
                    <div className="flex text-yellow-400 text-xs">
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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

