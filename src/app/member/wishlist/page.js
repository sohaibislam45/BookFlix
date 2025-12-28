'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Loader from '@/components/Loader';
import { showError, showSuccess, showConfirm } from '@/lib/swal';
export default function WishlistPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchWishlist();
  }, [user, userData, router]);

  const fetchWishlist = async () => {
    if (!userData?._id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/wishlist?userId=${userData._id}`);
      if (response.ok) {
        const data = await response.json();
        setWishlist(data.wishlists || []);
      } else {
        showError('Error', 'Failed to load wishlist.');
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      showError('Error', 'Failed to load wishlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (bookId) => {
    const result = await showConfirm(
      'Remove from Wishlist',
      'Are you sure you want to remove this book from your wishlist?'
    );

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/wishlist?userId=${userData._id}&bookId=${bookId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setWishlist(wishlist.filter(item => item.book._id !== bookId));
          showSuccess('Removed', 'Book has been removed from your wishlist.');
        } else {
          const errorData = await response.json();
          showError('Error', errorData.error || 'Failed to remove from wishlist.');
        }
      } catch (error) {
        console.error('Error removing from wishlist:', error);
        showError('Error', 'Failed to remove from wishlist. Please try again.');
      }
    }
  };

  const renderStars = (rating) => {
    if (!rating || rating === 0) return null;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex items-center gap-1 text-yellow-400 text-xs">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="material-symbols-outlined !text-[14px] fill-current">star</span>
        ))}
        {hasHalfStar && (
          <span className="material-symbols-outlined !text-[14px] fill-current">star_half</span>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="material-symbols-outlined !text-[14px] text-gray-600">star</span>
        ))}
        <span className="text-gray-500 ml-1 font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (!user) {
    return null;
  }

  return (
      <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-20">
        <div className="max-w-[1440px] mx-auto w-full">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-white text-3xl md:text-4xl font-bold mb-2">My Wishlist</h1>
            <p className="text-text-secondary text-sm">
              {wishlist.length > 0 
                ? `${wishlist.length} ${wishlist.length === 1 ? 'book' : 'books'} in your wishlist`
                : 'Your favorite books will appear here'
              }
            </p>
          </div>

          {/* Wishlist Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader />
            </div>
          ) : wishlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">
                favorite
              </span>
              <h3 className="text-white text-xl font-bold mb-2">Your Wishlist is Empty</h3>
              <p className="text-text-secondary mb-6">Start adding books to your wishlist to save them for later.</p>
              <Link
                href="/browse"
                className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-primary/25"
              >
                Browse Books
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {wishlist.map((item) => (
                <div key={item._id} className="group relative">
                  <Link href={`/book/${item.book._id}`}>
                    <div className="card-hover-effect relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg shadow-black/50 mb-4 cursor-pointer">
                      <Image
                        src={item.book.coverImage || '/placeholder-book.png'}
                        alt={`${item.book.title} by ${item.book.author}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                      />
                      {item.book.availableCopies > 0 && (
                        <div className="absolute top-2 right-2 bg-green-500/90 text-black text-[10px] font-extrabold px-2 py-1 rounded-sm shadow-sm flex items-center gap-1 backdrop-blur-sm">
                          <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                          AVAIL
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-4 gap-3">
                        <button className="bg-white text-black font-bold py-2.5 px-6 rounded-full text-sm hover:bg-primary hover:text-white transition-all transform hover:scale-105">
                          View Details
                        </button>
                      </div>
                    </div>
                  </Link>
                  <div>
                    <h3 className="text-white text-base font-bold truncate group-hover:text-primary transition-colors">
                      {item.book.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-1">{item.book.author}</p>
                    {item.book.rating > 0 && renderStars(item.book.rating)}
                  </div>
                  <button
                    onClick={() => handleRemove(item.book._id)}
                    className="absolute top-2 left-2 w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-lg"
                    title="Remove from wishlist"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}

