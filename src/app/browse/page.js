'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import UserProfile from '@/components/UserProfile';

export default function BrowsePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [availability, setAvailability] = useState(searchParams.get('availability') || 'all');
  const [language, setLanguage] = useState(searchParams.get('language') || 'all');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('order') || 'desc');
  
  // Data state
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalBooks, setTotalBooks] = useState(0);
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [totalPages, setTotalPages] = useState(1);
  
  // UI state
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Fetch categories (genres)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories?isActive=true');
        if (response.ok) {
          const data = await response.json();
          setCategories(data || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch books with filters
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // If year filter is active, fetch more books for client-side filtering
      const hasYearFilter = yearFrom || yearTo;
      params.set('page', hasYearFilter ? '1' : currentPage.toString());
      params.set('limit', hasYearFilter ? '500' : '16'); // Fetch more if year filtering
      params.set('sort', sortBy);
      params.set('order', sortOrder);
      
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      
      if (selectedGenres.length > 0) {
        params.set('category', selectedGenres[0]); // API only supports one category at a time
      }
      
      if (availability !== 'all') {
        params.set('availability', availability);
      }

      if (language && language !== 'all') {
        params.set('language', language);
      }

      const response = await fetch(`/api/books?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let filteredBooks = data.books || [];
        
        // Filter by publication year range
        if (hasYearFilter) {
          filteredBooks = filteredBooks.filter(book => {
            if (!book.publishedDate) return false;
            const bookYear = new Date(book.publishedDate).getFullYear();
            const from = yearFrom ? parseInt(yearFrom, 10) : 0;
            const to = yearTo ? parseInt(yearTo, 10) : new Date().getFullYear();
            return bookYear >= from && bookYear <= to;
          });
        }
        
        // Client-side pagination if year filter is active
        const itemsPerPage = 16;
        let paginatedBooks = filteredBooks;
        let totalCount = filteredBooks.length;
        
        if (hasYearFilter) {
          const start = (currentPage - 1) * itemsPerPage;
          const end = start + itemsPerPage;
          paginatedBooks = filteredBooks.slice(start, end);
          totalCount = filteredBooks.length;
        } else {
          totalCount = data.pagination?.total || filteredBooks.length;
        }
        
        setBooks(paginatedBooks);
        setTotalBooks(totalCount);
        setTotalPages(Math.ceil(totalCount / itemsPerPage));
        
        // Update URL without reload
        const newParams = new URLSearchParams();
        if (searchQuery) newParams.set('search', searchQuery);
        if (availability !== 'all') newParams.set('availability', availability);
        if (language && language !== 'all') newParams.set('language', language);
        if (sortBy !== 'createdAt') newParams.set('sort', sortBy);
        if (sortOrder !== 'desc') newParams.set('order', sortOrder);
        if (currentPage > 1) newParams.set('page', currentPage.toString());
        const newUrl = `/browse${newParams.toString() ? '?' + newParams.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedGenres, availability, language, yearFrom, yearTo, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBooks();
  };

  // Handle genre toggle
  const toggleGenre = (genreId) => {
    if (genreId === 'all') {
      setSelectedGenres([]);
    } else {
      setSelectedGenres(prev => {
        if (prev.includes(genreId)) {
          return prev.filter(id => id !== genreId);
        } else {
          return [genreId]; // Only allow one genre at a time for now
        }
      });
    }
    setCurrentPage(1);
  };

  // Handle sort change
  const handleSortChange = (e) => {
    const value = e.target.value;
    let newSort = 'createdAt';
    let newOrder = 'desc';
    
    switch (value) {
      case 'newest':
        newSort = 'createdAt';
        newOrder = 'desc';
        break;
      case 'top-rated':
        newSort = 'rating';
        newOrder = 'desc';
        break;
      case 'author-asc':
        newSort = 'author';
        newOrder = 'asc';
        break;
      case 'title-asc':
        newSort = 'title';
        newOrder = 'asc';
        break;
      default:
        newSort = 'createdAt';
        newOrder = 'desc';
    }
    
    setSortBy(newSort);
    setSortOrder(newOrder);
    setCurrentPage(1);
  };

  // Get current sort value for select
  const getCurrentSortValue = () => {
    if (sortBy === 'createdAt' && sortOrder === 'desc') return 'newest';
    if (sortBy === 'rating' && sortOrder === 'desc') return 'top-rated';
    if (sortBy === 'author' && sortOrder === 'asc') return 'author-asc';
    if (sortBy === 'title' && sortOrder === 'asc') return 'title-asc';
    return 'newest';
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render star rating
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex items-center gap-1 text-yellow-500 text-xs">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="material-symbols-outlined text-[14px] fill-1">star</span>
        ))}
        {hasHalfStar && (
          <span className="material-symbols-outlined text-[14px] fill-1">star_half</span>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="material-symbols-outlined text-[14px] fill-0">star</span>
        ))}
        <span className="text-gray-500 ml-1 font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Get availability badge
  const getAvailabilityBadge = (book) => {
    if (book.availableCopies > 0) {
      return (
        <div className="absolute top-2 right-2 bg-green-500/90 text-black text-[10px] font-extrabold px-2 py-1 rounded-sm shadow-sm flex items-center gap-1 backdrop-blur-sm">
          <span className="material-symbols-outlined text-[10px] font-bold">check</span>
          AVAIL
        </div>
      );
    } else {
      return (
        <div className="absolute top-2 right-2 bg-surface-dark/90 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-sm shadow-sm flex items-center gap-1 backdrop-blur-sm border border-white/10">
          <span className="material-symbols-outlined text-[10px]">schedule</span>
          WAITLIST
        </div>
      );
    }
  };

  // Check if book is new (added in last 30 days)
  const isNewBook = (book) => {
    if (!book.createdAt) return false;
    const daysSinceCreation = (new Date() - new Date(book.createdAt)) / (1000 * 60 * 60 * 24);
    return daysSinceCreation <= 30;
  };

  const togglePricingModal = () => {
    setPricingModalOpen(!pricingModalOpen);
  };

  const handleFreeRegistration = () => {
    setPricingModalOpen(false);
    router.push('/register');
  };

  const handlePlanSelection = (plan) => {
    setPricingModalOpen(false);
    if (user) {
      router.push('/member/upgrade#choose-plan');
    } else {
      router.push('/register');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 transition-all duration-300 bg-[#121212]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-3xl text-primary">auto_stories</span>
            <h1 className="text-white text-2xl font-black tracking-tighter">Bookflix</h1>
          </Link>
          <div className="flex items-center gap-6">
            {user ? (
              <UserProfile />
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <button
                  className="bg-primary hover:bg-[#9216d1] text-white px-5 py-2 rounded-md text-sm font-bold transition-all shadow-[0_0_15px_rgba(170,31,239,0.3)] hover:shadow-[0_0_20px_rgba(170,31,239,0.5)]"
                  onClick={togglePricingModal}
                >
                  Join Now
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow pt-28 px-4 md:px-8 lg:px-12 max-w-[1600px] mx-auto w-full pb-20">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 mb-12 border-b border-white/5 pb-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-primary mb-2">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <Link href="/" className="text-xs font-bold uppercase tracking-wider hover:underline">
                Back to Home
              </Link>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-3">
              Browse Collection
            </h1>
            <p className="text-gray-400 text-lg font-light">
              Explore thousands of titles, from timeless classics to contemporary bestsellers.
            </p>
          </div>
          <form onSubmit={handleSearch} className="w-full lg:w-auto lg:min-w-[450px] group relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-500 group-focus-within:text-primary transition-colors">
                search
              </span>
            </div>
            <input
              className="block w-full pl-12 pr-4 py-4 border border-white/10 rounded-xl bg-surface-dark/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-base shadow-lg"
              placeholder="Search by Title, Author, or ISBN..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              <button
                type="submit"
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </button>
            </div>
          </form>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Filters Sidebar */}
          <aside className={`w-full lg:w-64 flex-shrink-0 space-y-8 ${filtersVisible ? 'block' : 'hidden lg:block'}`}>
            {/* Genres */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                Genres
              </h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-primary rounded border-white/20 bg-surface-dark focus:ring-primary focus:ring-offset-0 transition duration-150 ease-in-out"
                    checked={selectedGenres.length === 0}
                    onChange={() => toggleGenre('all')}
                  />
                  <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                    All Genres
                  </span>
                </label>
                {categories.map((category) => (
                  <label key={category._id} className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-primary rounded border-white/20 bg-surface-dark focus:ring-primary focus:ring-offset-0 transition duration-150 ease-in-out"
                      checked={selectedGenres.includes(category._id)}
                      onChange={() => toggleGenre(category._id)}
                    />
                    <span className="text-gray-300 text-sm group-hover:text-white transition-colors capitalize">
                      {category.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                Availability
              </h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="availability"
                    className="form-radio h-4 w-4 text-primary border-white/20 bg-surface-dark focus:ring-primary focus:ring-offset-0 transition duration-150 ease-in-out"
                    checked={availability === 'all'}
                    onChange={() => {
                      setAvailability('all');
                      setCurrentPage(1);
                    }}
                  />
                  <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                    Show All
                  </span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="availability"
                    className="form-radio h-4 w-4 text-primary border-white/20 bg-surface-dark focus:ring-primary focus:ring-offset-0 transition duration-150 ease-in-out"
                    checked={availability === 'available'}
                    onChange={() => {
                      setAvailability('available');
                      setCurrentPage(1);
                    }}
                  />
                  <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                    Available Now
                  </span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="availability"
                    className="form-radio h-4 w-4 text-primary border-white/20 bg-surface-dark focus:ring-primary focus:ring-offset-0 transition duration-150 ease-in-out"
                    checked={availability === 'waitlist'}
                    onChange={() => {
                      setAvailability('waitlist');
                      setCurrentPage(1);
                    }}
                  />
                  <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                    Waitlist Only
                  </span>
                </label>
              </div>
            </div>

            {/* Publication Year */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                Publication Year
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-full bg-surface-dark border border-white/10 rounded-md text-sm text-white px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  placeholder="1900"
                  value={yearFrom}
                  onChange={(e) => {
                    setYearFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  min="1000"
                  max={new Date().getFullYear()}
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  className="w-full bg-surface-dark border border-white/10 rounded-md text-sm text-white px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  placeholder="2024"
                  value={yearTo}
                  onChange={(e) => {
                    setYearTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  min="1000"
                  max={new Date().getFullYear()}
                />
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Sort and Results Count */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-surface-dark/30 p-4 rounded-xl border border-white/5 backdrop-blur-sm sticky top-24 z-30">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">{totalBooks}</span>
                <span className="text-gray-400 text-sm">Books Found</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setFiltersVisible(!filtersVisible)}
                  className="lg:hidden flex items-center gap-2 text-sm text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">filter_list</span>
                  Filters
                </button>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-400 hidden sm:block">Sort by:</label>
                  <div className="relative">
                    <select
                      className="appearance-none bg-[#121212] border border-white/20 text-white text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-3 pr-8 py-2 cursor-pointer hover:border-primary/50 transition-colors"
                      value={getCurrentSortValue()}
                      onChange={handleSortChange}
                    >
                      <option value="newest">Newest Arrivals</option>
                      <option value="top-rated">Top Rated</option>
                      <option value="author-asc">Author (A-Z)</option>
                      <option value="title-asc">Title (A-Z)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                      <span className="material-symbols-outlined text-sm">expand_more</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Books Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-gray-400">Loading books...</div>
              </div>
            ) : books.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">
                  book
                </span>
                <p className="text-gray-400 text-lg">No books found matching your criteria.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGenres([]);
                    setAvailability('all');
                    setYearFrom('');
                    setYearTo('');
                    setCurrentPage(1);
                  }}
                  className="mt-4 text-primary hover:text-primary-hover text-sm font-medium"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                  {books.map((book) => (
                    <div key={book._id} className="group">
                      <Link
                        href={user ? `/member/books/${book._id}` : `/browse`}
                        onClick={(e) => {
                          if (!user) {
                            e.preventDefault();
                            togglePricingModal();
                          }
                        }}
                      >
                        <div className="card-hover-effect relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg shadow-black/50 mb-4 cursor-pointer">
                          <Image
                            src={book.coverImage || '/placeholder-book.png'}
                            alt={`${book.title} by ${book.author}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                          {isNewBook(book) && (
                            <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-sm shadow-sm">
                              NEW
                            </div>
                          )}
                          {getAvailabilityBadge(book)}
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-4 gap-3">
                            <button className="bg-white text-black font-bold py-2.5 px-6 rounded-full text-sm hover:bg-primary hover:text-white transition-all transform hover:scale-105 flex items-center gap-2">
                              View Details
                            </button>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-white text-base font-bold truncate group-hover:text-primary transition-colors">
                            {book.title}
                          </h3>
                          <p className="text-gray-400 text-sm mb-1">{book.author}</p>
                          {book.rating > 0 && renderStars(book.rating)}
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-16 flex justify-center">
                    <nav className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      {[...Array(totalPages)].map((_, index) => {
                        const page = index + 1;
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`w-10 h-10 flex items-center justify-center rounded-full font-bold transition-colors ${
                                currentPage === page
                                  ? 'bg-primary text-white shadow-[0_0_15px_rgba(170,31,239,0.3)]'
                                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <span key={page} className="text-gray-500 px-2">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/50 border-t border-white/5 py-16 px-6 mt-auto">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-primary">auto_stories</span>
              <h2 className="text-white text-xl font-bold">Bookflix</h2>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Reinventing the way you discover, borrow, and read books. The modern library experience.
            </p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Browse</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link className="hover:text-primary transition-colors" href="/browse">
                  Top Rated
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="/browse">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="/browse">
                  Genres
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="/browse">
                  Audiobooks
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Support</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link className="hover:text-primary transition-colors" href="#">
                  Library Policies
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="#">
                  Help Center
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="#">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="#">
                  Locations
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Connect</h3>
            <div className="flex gap-4">
              <Link
                className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-white hover:bg-primary transition-colors"
                href="#"
              >
                <span className="material-symbols-outlined text-lg">public</span>
              </Link>
              <Link
                className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-white hover:bg-primary transition-colors"
                href="#"
              >
                <span className="material-symbols-outlined text-lg">mail</span>
              </Link>
              <Link
                className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-white hover:bg-primary transition-colors"
                href="#"
              >
                <span className="material-symbols-outlined text-lg">group</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto mt-12 pt-8 border-t border-white/5 text-center text-gray-500 text-xs">
          © 2024 Bookflix Library Services. All rights reserved.
        </div>
      </footer>

      {/* Pricing Modal */}
      {pricingModalOpen && (
        <div
          aria-labelledby="modal-title"
          aria-modal="true"
          className="fixed inset-0 z-[100]"
          role="dialog"
        >
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm transition-opacity"
            onClick={togglePricingModal}
          ></div>
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-2xl bg-[#121212] border border-white/10 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-5xl">
                <div className="absolute top-4 right-4 z-20">
                  <button
                    className="text-gray-400 hover:text-white transition-colors"
                    onClick={togglePricingModal}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-2xl">close</span>
                  </button>
                </div>
                <div className="px-8 py-10 sm:p-12">
                  <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-2">Choose Your Plan</h2>
                    <p className="text-gray-400">Unlock the full potential of your library experience.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Free Plan */}
                    <div className="rounded-xl border border-white/10 bg-[#1c1c1c] p-6 hover:border-primary/50 transition-colors flex flex-col">
                      <h3 className="text-xl font-bold text-white">Free Plan</h3>
                      <div className="mt-4 flex items-baseline text-white">
                        <span className="text-4xl font-black tracking-tight">0 ৳</span>
                        <span className="ml-1 text-sm text-gray-400">/month</span>
                      </div>
                      <ul className="mt-6 space-y-4 flex-1 text-sm text-gray-300">
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          7-day borrowing
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          15% standard late fine
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          Basic reservation queue
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          In-library pickup only
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          Email notifications
                        </li>
                      </ul>
                      <button
                        onClick={handleFreeRegistration}
                        className="mt-8 w-full rounded-md border border-white/20 bg-transparent px-4 py-2 text-sm font-bold text-white hover:bg-white/5 transition-colors"
                      >
                        Free registration
                      </button>
                    </div>

                    {/* Monthly Premium */}
                    <div className="rounded-xl border border-primary bg-[#22152e] p-6 relative flex flex-col transform md:-translate-y-2 shadow-[0_4px_20px_rgba(170,31,239,0.15)]">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                        Popular
                      </div>
                      <h3 className="text-xl font-bold text-white">Monthly Premium</h3>
                      <div className="mt-4 flex items-baseline text-white">
                        <span className="text-4xl font-black tracking-tight">200 ৳</span>
                        <span className="ml-1 text-sm text-gray-400">/month</span>
                      </div>
                      <ul className="mt-6 space-y-4 flex-1 text-sm text-gray-300">
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          20-day borrowing
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          5% late fine discount
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          Advance reservation
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          Home delivery
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          Push & SMS notifications
                        </li>
                      </ul>
                      <button
                        onClick={() => handlePlanSelection('monthly')}
                        className="mt-8 w-full rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[#9216d1] transition-colors shadow-lg shadow-primary/25"
                      >
                        Get Monthly
                      </button>
                    </div>

                    {/* Yearly Premium */}
                    <div className="rounded-xl border border-white/10 bg-[#1c1c1c] p-6 hover:border-primary/50 transition-colors flex flex-col">
                      <h3 className="text-xl font-bold text-white">Yearly Premium</h3>
                      <div className="mt-4 flex flex-col text-white">
                        <div className="flex items-baseline">
                          <span className="text-4xl font-black tracking-tight">2,000 ৳</span>
                          <span className="ml-1 text-sm text-gray-400">/year</span>
                        </div>
                        <span className="text-xs text-green-400 mt-1 font-semibold">Save 17%</span>
                      </div>
                      <ul className="mt-6 space-y-4 flex-1 text-sm text-gray-300">
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          20-day borrowing
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          10% late fine discount
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          Priority advance reservation
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          Free home delivery
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">
                            check
                          </span>
                          Push, SMS & priority support
                        </li>
                      </ul>
                      <button
                        onClick={() => handlePlanSelection('yearly')}
                        className="mt-8 w-full rounded-md border border-white/20 bg-transparent px-4 py-2 text-sm font-bold text-white hover:bg-white/5 transition-colors"
                      >
                        Get Yearly
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

