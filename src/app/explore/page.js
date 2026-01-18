'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import UserProfile from '@/components/UserProfile';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Loader from '@/components/Loader';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

function ExplorePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const titleRef = useRef(null);
  const gridRef = useRef(null);

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedGenres, setSelectedGenres] = useState(searchParams.get('category') ? [searchParams.get('category')] : []);
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

  // GSAP Animations
  useEffect(() => {
    if (loading || books.length === 0) return;

    // Title animation
    gsap.fromTo(titleRef.current, 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
    );

    // Staggered grid animation
    const cards = gridRef.current?.querySelectorAll('.book-card');
    if (cards?.length > 0) {
      gsap.fromTo(cards,
        { opacity: 0, y: 40 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.8, 
          stagger: 0.1, 
          ease: 'power2.out',
          scrollTrigger: {
            trigger: gridRef.current,
            start: 'top 80%',
          }
        }
      );
    }
  }, [loading, books.length]);

  // Fetch books with filters
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const hasYearFilter = yearFrom || yearTo;
      params.set('page', hasYearFilter ? '1' : currentPage.toString());
      params.set('limit', hasYearFilter ? '500' : '16');
      params.set('sort', sortBy);
      params.set('order', sortOrder);
      
      if (searchQuery) params.set('search', searchQuery);
      if (selectedGenres.length > 0) params.set('category', selectedGenres[0]);
      if (availability !== 'all') params.set('availability', availability);
      if (language && language !== 'all') params.set('language', language);

      const response = await fetch(`/api/books?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let filteredBooks = data.books || [];
        
        if (hasYearFilter) {
          filteredBooks = filteredBooks.filter(book => {
            if (!book.publishedDate) return false;
            const bookYear = new Date(book.publishedDate).getFullYear();
            const from = yearFrom ? parseInt(yearFrom, 10) : 0;
            const to = yearTo ? parseInt(yearTo, 10) : new Date().getFullYear();
            return bookYear >= from && bookYear <= to;
          });
        }
        
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
        
        const newParams = new URLSearchParams();
        if (searchQuery) newParams.set('search', searchQuery);
        if (availability !== 'all') newParams.set('availability', availability);
        if (language && language !== 'all') newParams.set('language', language);
        if (selectedGenres.length > 0) newParams.set('category', selectedGenres[0]);
        if (sortBy !== 'createdAt') newParams.set('sort', sortBy);
        if (sortOrder !== 'desc') newParams.set('order', sortOrder);
        if (currentPage > 1) newParams.set('page', currentPage.toString());
        const newUrl = `/explore${newParams.toString() ? '?' + newParams.toString() : ''}`;
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

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBooks();
  };

  const toggleGenre = (genreId) => {
    if (genreId === 'all') {
      setSelectedGenres([]);
    } else {
      setSelectedGenres(prev => prev.includes(genreId) ? [] : [genreId]);
    }
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    let newSort = 'createdAt';
    let newOrder = 'desc';
    
    switch (value) {
      case 'newest': newSort = 'createdAt'; newOrder = 'desc'; break;
      case 'top-rated': newSort = 'rating'; newOrder = 'desc'; break;
      case 'author-asc': newSort = 'author'; newOrder = 'asc'; break;
      case 'title-asc': newSort = 'title'; newOrder = 'asc'; break;
      default: newSort = 'createdAt'; newOrder = 'desc';
    }
    
    setSortBy(newSort);
    setSortOrder(newOrder);
    setCurrentPage(1);
  };

  const getCurrentSortValue = () => {
    if (sortBy === 'createdAt' && sortOrder === 'desc') return 'newest';
    if (sortBy === 'rating' && sortOrder === 'desc') return 'top-rated';
    if (sortBy === 'author' && sortOrder === 'asc') return 'author-asc';
    if (sortBy === 'title' && sortOrder === 'asc') return 'title-asc';
    return 'newest';
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex items-center gap-1 text-yellow-500 text-xs">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="material-symbols-outlined text-[14px] fill-1">star</span>
        ))}
        {hasHalfStar && <span className="material-symbols-outlined text-[14px] fill-1">star_half</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="material-symbols-outlined text-[14px] fill-0">star</span>
        ))}
        <span className="text-gray-500 ml-1 font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getAvailabilityBadge = (book) => (
    <div className={`absolute top-2 right-2 ${book.availableCopies > 0 ? 'bg-green-500/90' : 'bg-surface-dark/90'} text-white text-[10px] font-extrabold px-2 py-1 rounded-sm shadow-sm flex items-center gap-1 backdrop-blur-sm`}>
      <span className="material-symbols-outlined text-[10px] font-bold">{book.availableCopies > 0 ? 'check' : 'schedule'}</span>
      {book.availableCopies > 0 ? 'AVAIL' : 'WAITLIST'}
    </div>
  );

  return (
    <div className="relative min-h-screen flex flex-col bg-background-dark text-white font-display overflow-x-hidden">
      <Navbar togglePricingModal={() => setPricingModalOpen(!pricingModalOpen)} />

      {/* Full Page Loader */}
      {loading && books.length === 0 && (
        <div className="fixed inset-0 z-[60] bg-background-dark/95 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center animate-fade-in-up">
            <Loader />
            <div className="text-white text-xl font-bold mb-2 mt-6">Loading Collection</div>
            <div className="text-gray-400 text-sm">Fetching books from our library...</div>
          </div>
        </div>
      )}

      <main className="flex-grow pt-32 px-4 md:px-8 lg:px-12 max-w-[1600px] mx-auto w-full pb-20">
        {/* Header Section */}
        <div ref={titleRef} className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 mb-12 border-b border-white/5 pb-8 opacity-0">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-primary mb-2">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <Link href="/" className="text-xs font-bold uppercase tracking-wider hover:underline">
                Back to Home
              </Link>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-3">
              Explore Collection
            </h1>
            <p className="text-gray-400 text-lg font-light">
              Explore thousands of titles, from timeless classics to contemporary bestsellers.
            </p>
          </div>
          <form onSubmit={handleSearch} className="w-full lg:w-auto lg:min-w-[450px] group relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-500 group-focus-within:text-primary transition-colors">search</span>
            </div>
            <input
              className="block w-full pl-12 pr-4 py-4 border border-white/10 rounded-xl bg-surface-dark/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-base shadow-lg"
              placeholder="Search by Title, Author, or ISBN..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Filters Sidebar */}
          <aside className={`w-full lg:w-64 flex-shrink-0 space-y-8 ${filtersVisible ? 'block' : 'hidden lg:block'}`}>
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Genres</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-white/20 bg-surface-dark focus:ring-primary" checked={selectedGenres.length === 0} onChange={() => toggleGenre('all')} />
                  <span className="text-gray-300 text-sm group-hover:text-white transition-colors">All Genres</span>
                </label>
                {categories.map((category) => (
                  <label key={category._id} className="flex items-center space-x-3 cursor-pointer group">
                    <input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-white/20 bg-surface-dark focus:ring-primary" checked={selectedGenres.includes(category._id)} onChange={() => toggleGenre(category._id)} />
                    <span className="text-gray-300 text-sm group-hover:text-white transition-colors capitalize">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Availability</h3>
              <div className="space-y-3">
                {['all', 'available', 'waitlist'].map(val => (
                  <label key={val} className="flex items-center space-x-3 cursor-pointer group">
                    <input type="radio" name="availability" className="form-radio h-4 w-4 text-primary border-white/20 bg-surface-dark" checked={availability === val} onChange={() => { setAvailability(val); setCurrentPage(1); }} />
                    <span className="text-gray-300 text-sm group-hover:text-white transition-colors capitalize">{val === 'all' ? 'Show All' : val === 'available' ? 'Available Now' : 'Waitlist Only'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Language</h3>
              <div className="space-y-3">
                {['all', 'en', 'bn'].map(val => (
                  <label key={val} className="flex items-center space-x-3 cursor-pointer group">
                    <input type="radio" name="language" className="form-radio h-4 w-4 text-primary border-white/20 bg-surface-dark" checked={language === val} onChange={() => { setLanguage(val); setCurrentPage(1); }} />
                    <span className="text-gray-300 text-sm group-hover:text-white transition-colors capitalize">{val === 'all' ? 'All Languages' : val === 'en' ? 'English' : 'Bangla'}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-surface-dark/30 p-4 rounded-xl border border-white/5 backdrop-blur-sm sticky top-24 z-30">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">{totalBooks}</span>
                <span className="text-gray-400 text-sm">Books Found</span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setFiltersVisible(!filtersVisible)} className="lg:hidden flex items-center gap-2 text-sm text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-lg">filter_list</span>
                  Filters
                </button>
                <div className="flex items-center gap-2">
                  <select className="appearance-none bg-[#121212] border border-white/20 text-white text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-3 pr-8 py-2 cursor-pointer transition-colors" value={getCurrentSortValue()} onChange={handleSortChange}>
                    <option value="newest">Newest Arrivals</option>
                    <option value="top-rated">Top Rated</option>
                    <option value="author-asc">Author (A-Z)</option>
                    <option value="title-asc">Title (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {loading && books.length === 0 ? (
              <div className="text-center py-12">
                <Loader />
              </div>
            ) : books.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">book</span>
                <p className="text-gray-400 text-lg">No books found matching your criteria.</p>
              </div>
            ) : (
              <>
                <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                  {books.map((book) => (
                    <div key={book._id} className="book-card opacity-0 group">
                      <Link href={`/book/${book._id}`}>
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg mb-4 cursor-pointer hover:scale-105 transition-all duration-300">
                          <Image src={book.coverImage || '/placeholder-book.png'} alt={book.title} fill className="object-cover" />
                          {getAvailabilityBadge(book)}
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-4">
                            <button className="bg-white text-black font-bold py-2.5 px-6 rounded-full text-sm hover:bg-primary hover:text-white transition-all">View Details</button>
                          </div>
                        </div>
                        <h3 className="text-white text-base font-bold truncate group-hover:text-primary transition-colors">{book.title}</h3>
                        <p className="text-gray-400 text-sm">{book.author}</p>
                        {book.rating > 0 && renderStars(book.rating)}
                      </Link>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-16 flex justify-center gap-2">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 disabled:opacity-50">
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button key={i} onClick={() => handlePageChange(i + 1)} className={`w-10 h-10 flex items-center justify-center rounded-full font-bold transition-colors ${currentPage === i + 1 ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/10'}`}>
                        {i + 1}
                      </button>
                    ))}
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 disabled:opacity-50">
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<Loader />}>
      <ExplorePageContent />
    </Suspense>
  );
}
