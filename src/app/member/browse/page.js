'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { showSuccess, showError, showConfirm, showInfo } from '@/lib/swal';
import Loader from '@/components/Loader';

function BrowseContent() {
  const { userData } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'createdAt');
  const [availability, setAvailability] = useState(searchParams.get('availability') || 'all');
  const [language, setLanguage] = useState(searchParams.get('language') || 'all');
  
  // Dropdown states
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch books
  useEffect(() => {
    fetchBooks();
  }, [search, selectedCategory, sortBy, availability, language, pagination.page]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?isActive=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '12',
        sort: sortBy,
        order: 'desc',
      });

      if (search) params.append('search', search);
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (availability && availability !== 'all') {
        params.append('availability', availability);
      }
      if (language && language !== 'all') {
        params.append('language', language);
      }

      const response = await fetch(`/api/books?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    setPagination({ ...pagination, page: 1 });
    updateURL({ search: value, page: 1 });
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setPagination({ ...pagination, page: 1 });
    updateURL({ category: categoryId === 'all' ? '' : categoryId, page: 1 });
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
    setSortOpen(false);
    updateURL({ sort });
  };

  const handleAvailabilityChange = (avail) => {
    setAvailability(avail);
    setAvailabilityOpen(false);
    setPagination({ ...pagination, page: 1 });
    updateURL({ availability: avail === 'all' ? '' : avail, page: 1 });
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setLanguageOpen(false);
    setPagination({ ...pagination, page: 1 });
    updateURL({ language: lang === 'all' ? '' : lang, page: 1 });
  };

  const updateURL = (updates) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.keys(updates).forEach((key) => {
      if (updates[key]) {
        params.set(key, updates[key]);
      } else {
        params.delete(key);
      }
    });
    router.push(`/member/browse?${params.toString()}`, { scroll: false });
  };

  const loadMore = () => {
    if (pagination.page < pagination.pages) {
      setPagination({ ...pagination, page: pagination.page + 1 });
    }
  };

  const handleBorrow = async (bookId) => {
    if (!userData?._id) {
      showInfo('Login Required', 'Please log in to borrow books');
      return;
    }

    const result = await showConfirm('Borrow Book', 'Are you sure you want to borrow this book?');
    if (!result.isConfirmed) return;

    try {
      setBorrowing(true);
      const response = await fetch('/api/borrowings/borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: userData._id, bookId }),
      });

      if (response.ok) {
        showSuccess('Success!', 'Book borrowed successfully!');
        // Refresh books to update available copies
        fetchBooks();
      } else {
        const error = await response.json();
        showError('Error', error.error || 'Failed to borrow book');
      }
    } catch (error) {
      console.error('Error borrowing book:', error);
      showError('Error', 'Failed to borrow book');
    } finally {
      setBorrowing(false);
    }
  };

  const handleReserve = async (bookId) => {
    if (!userData?._id) {
      showInfo('Login Required', 'Please log in to reserve books');
      return;
    }

    const result = await showConfirm('Reserve Book', 'Reserve this book? You will be added to the waitlist.');
    if (!result.isConfirmed) return;

    try {
      setBorrowing(true);
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: userData._id, bookId }),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess('Reservation Created!', `Your queue position: #${data.reservation.queuePosition}`);
        // Refresh books to update available copies
        fetchBooks();
      } else {
        const error = await response.json();
        showError('Error', error.error || 'Failed to reserve book');
      }
    } catch (error) {
      console.error('Error reserving book:', error);
      showError('Error', 'Failed to reserve book');
    } finally {
      setBorrowing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-20">
      <div className="max-w-[1440px] mx-auto w-full">
        {/* Hero Search Section */}
        <div className="relative w-full rounded-2xl overflow-hidden mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-background-dark via-background-dark/90 to-primary/20"></div>
          <div className="relative z-10 px-6 py-12 md:px-12 md:py-16 flex flex-col items-start justify-center max-w-4xl">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Find your next <span className="text-primary">great read</span>.
            </h1>
            <div className="w-full max-w-2xl">
              <label className="flex flex-col w-full">
                <div className="flex w-full items-center rounded-xl bg-surface-dark border border-white/10 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all h-14 shadow-lg">
                  <div className="text-gray-400 flex items-center justify-center pl-4">
                    <span className="material-symbols-outlined">search</span>
                  </div>
                  <input
                    className="flex w-full bg-transparent border-none text-white placeholder:text-gray-500 focus:ring-0 px-4 text-base"
                    placeholder="Search by title, author, ISBN or keyword..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => handleSearch(search)}
                    className="mr-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
                  >
                    Search
                  </button>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Filters & Categories */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8 sticky top-[72px] z-30 py-2 bg-background-dark/95 backdrop-blur-sm -mx-4 px-4 md:-mx-10 md:px-10 border-b border-white/5">
          {/* Category Chips */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-4 transition-colors border ${
                selectedCategory === 'all'
                  ? 'bg-primary text-white border-primary/50'
                  : 'bg-surface-dark-hover text-gray-200 border-white/10 hover:bg-surface-dark-hover/80'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {selectedCategory === 'all' ? 'check' : ''}
              </span>
              <span className="text-sm font-medium whitespace-nowrap">All Genres</span>
            </button>
            {categories.map((category) => (
              <button
                key={category._id}
                onClick={() => handleCategoryChange(category._id)}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-4 transition-colors border ${
                  selectedCategory === category._id
                    ? 'bg-primary text-white border-primary/50'
                    : 'bg-surface-dark-hover text-gray-200 border-white/10 hover:bg-surface-dark-hover/80'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {category.icon || 'menu_book'}
                </span>
                <span className="text-sm font-medium whitespace-nowrap">{category.name}</span>
              </button>
            ))}
          </div>

          {/* Sort & Filter Dropdowns */}
          <div className="flex gap-3 shrink-0 w-full md:w-auto">
            {/* Availability Dropdown */}
            <div className="relative flex-1 md:w-auto">
              <button
                onClick={() => {
                  setAvailabilityOpen(!availabilityOpen);
                  setSortOpen(false);
                  setLanguageOpen(false);
                }}
                className="flex h-9 w-full md:w-auto items-center justify-between gap-2 rounded-lg bg-surface-dark border border-white/10 px-3 hover:border-white/20 transition-colors"
              >
                <span className="text-sm text-gray-300">
                  Availability: <strong>
                    {availability === 'all' ? 'All' : availability === 'available' ? 'Available' : 'Waitlist'}
                  </strong>
                </span>
                <span className={`material-symbols-outlined text-gray-400 text-[18px] transition-transform ${availabilityOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {availabilityOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setAvailabilityOpen(false)}
                  ></div>
                  <div className="absolute top-full left-0 mt-1 z-20 w-full md:w-48 bg-surface-dark border border-white/10 rounded-lg shadow-lg overflow-hidden">
                    {['all', 'available', 'waitlist'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleAvailabilityChange(option)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          availability === option
                            ? 'bg-primary/20 text-primary'
                            : 'text-gray-300 hover:bg-surface-hover'
                        }`}
                      >
                        {option === 'all' ? 'All' : option === 'available' ? 'Available' : 'Waitlist'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sort By Dropdown */}
            <div className="relative flex-1 md:w-auto">
              <button
                onClick={() => {
                  setSortOpen(!sortOpen);
                  setAvailabilityOpen(false);
                  setLanguageOpen(false);
                }}
                className="flex h-9 w-full md:w-auto items-center justify-between gap-2 rounded-lg bg-surface-dark border border-white/10 px-3 hover:border-white/20 transition-colors"
              >
                <span className="text-sm text-gray-300">
                  Sort by: <strong>
                    {sortBy === 'createdAt' ? 'Newest' : 
                     sortBy === 'rating' ? 'Popular' : 
                     sortBy === 'title' ? 'Title' :
                     sortBy === 'author' ? 'Author' :
                     sortBy === 'publishedDate' ? 'Publication Date' : 'Newest'}
                  </strong>
                </span>
                <span className={`material-symbols-outlined text-gray-400 text-[18px] transition-transform ${sortOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {sortOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setSortOpen(false)}
                  ></div>
                  <div className="absolute top-full left-0 mt-1 z-20 w-full md:w-48 bg-surface-dark border border-white/10 rounded-lg shadow-lg overflow-hidden">
                    {[
                      { value: 'createdAt', label: 'Newest' },
                      { value: 'rating', label: 'Popular' },
                      { value: 'title', label: 'Title' },
                      { value: 'author', label: 'Author' },
                      { value: 'publishedDate', label: 'Publication Date' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleSortChange(option.value)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          sortBy === option.value
                            ? 'bg-primary/20 text-primary'
                            : 'text-gray-300 hover:bg-surface-hover'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Language Dropdown */}
            <div className="relative flex-1 md:w-auto">
              <button
                onClick={() => {
                  setLanguageOpen(!languageOpen);
                  setAvailabilityOpen(false);
                  setSortOpen(false);
                }}
                className="flex h-9 w-full md:w-auto items-center justify-between gap-2 rounded-lg bg-surface-dark border border-white/10 px-3 hover:border-white/20 transition-colors"
              >
                <span className="text-sm text-gray-300">
                  Language: <strong>
                    {language === 'all' ? 'All' : 
                     language === 'en' ? 'English' : 
                     language === 'bn' ? 'Bangla' : language}
                  </strong>
                </span>
                <span className={`material-symbols-outlined text-gray-400 text-[18px] transition-transform ${languageOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {languageOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setLanguageOpen(false)}
                  ></div>
                  <div className="absolute top-full left-0 mt-1 z-20 w-full md:w-48 bg-surface-dark border border-white/10 rounded-lg shadow-lg overflow-hidden">
                    {[
                      { value: 'all', label: 'All Languages' },
                      { value: 'en', label: 'English' },
                      { value: 'bn', label: 'Bangla' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleLanguageChange(option.value)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          language === option.value
                            ? 'bg-primary/20 text-primary'
                            : 'text-gray-300 hover:bg-surface-hover'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Books Grid */}
        <section className="mb-12">
          <div className="flex items-center gap-4 mb-6 px-2">
            <h2 className="text-white text-2xl font-bold tracking-tight">Browse Collection</h2>
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-gray-400 text-sm">
              Showing {books.length} of {pagination.total} books
            </span>
          </div>

          {loading && books.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <div className="flex justify-center mb-3">
                <Loader />
              </div>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-50">search</span>
              <p className="text-lg">No books found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
                {books.map((book) => (
                  <div key={book._id} className="flex flex-col group relative">
                    <Link href={`/member/books/${book._id}`}>
                      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden mb-3 bg-surface-dark shadow-md group-hover:shadow-primary/20 group-hover:shadow-xl transition-all duration-300">
                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                          {book.availableCopies > 0 ? (
                            <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider backdrop-blur-sm">
                              Available
                            </span>
                          ) : (
                            <span className="bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider backdrop-blur-sm">
                              Waitlist
                            </span>
                          )}
                        </div>
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                          style={{ backgroundImage: `url('${book.coverImage}')` }}
                        ></div>
                        {/* Hover Action Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 translate-y-2 group-hover:translate-y-0">
                          <p className="text-white text-xs line-clamp-3 mb-3">
                            {book.description || 'No description available'}
                          </p>
                          <div className="flex gap-2">
                            {book.availableCopies > 0 ? (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleBorrow(book._id);
                                }}
                                disabled={borrowing}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white text-xs font-bold py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {borrowing ? 'Processing...' : 'Borrow'}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleReserve(book._id);
                                }}
                                disabled={borrowing}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {borrowing ? 'Processing...' : 'Reserve'}
                              </button>
                            )}
                            <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-colors" title="Add to List">
                              <span className="material-symbols-outlined text-[18px] leading-none">bookmark_add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className="flex flex-col">
                      <h3 className="text-white font-semibold text-base leading-tight truncate pr-2" title={book.title}>
                        {book.title}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-gray-400 text-sm truncate">{book.author}</p>
                        {book.rating > 0 && (
                          <div className="flex items-center gap-0.5 text-amber-400">
                            <span className="material-symbols-outlined text-[14px] fill-current">star</span>
                            <span className="text-xs font-medium">{book.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {pagination.page < pagination.pages && (
                <div className="mt-16 flex flex-col items-center justify-center gap-4">
                  <button
                    onClick={loadMore}
                    className="bg-surface-dark-hover hover:bg-primary/20 text-white font-medium py-3 px-8 rounded-lg border border-white/10 hover:border-primary/50 transition-all shadow-lg flex items-center gap-2"
                  >
                    Load More Books
                    <span className="material-symbols-outlined text-sm">expand_more</span>
                  </button>
                  <p className="text-gray-500 text-sm">
                    You've viewed {books.length} of {pagination.total} items
                  </p>
                  <div className="w-48 h-1 bg-surface-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(books.length / pagination.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-20">
        <div className="max-w-[1440px] mx-auto w-full text-center py-12 text-text-secondary">
          <div className="flex justify-center mb-3">
            <Loader />
          </div>
        </div>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}

