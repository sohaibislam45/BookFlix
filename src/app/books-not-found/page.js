'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import ErrorNavbar from '@/components/ErrorNavbar';
import Lottie from 'lottie-react';

function BooksNotFoundContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchQuery = searchParams.get('q') || searchParams.get('query') || 'your search';
  const [searchValue, setSearchValue] = useState(searchQuery === 'your search' ? '' : searchQuery);
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    // Load Lottie animation from public directory
    fetch('/animations/empty-books.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => {
        console.error('Failed to load animation:', err);
        // Fallback: set null to hide animation
        setAnimationData(null);
      });
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const handleClearFilters = () => {
    router.push('/explore');
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display text-gray-900 dark:text-white overflow-x-hidden">
      <ErrorNavbar />
      
      {/* Main Content Container */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-12 relative w-full">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
        
        <div className="relative z-10 w-full max-w-[960px] flex flex-col items-center text-center">
          {/* Empty State Illustration */}
          {animationData && (
            <div className="mb-8 relative">
              <div className="w-[240px] h-[180px] opacity-80 mx-auto">
                <Lottie
                  animationData={animationData}
                  loop={true}
                  autoplay={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          )}
          
          {/* Hero Message */}
          <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight mb-3">
            No books found
          </h1>
          <p className="text-white/60 text-base md:text-lg font-normal leading-relaxed max-w-[540px] mb-10">
            We couldn&apos;t find a match for &quot;{searchQuery}&quot;. Try adjusting your keywords, checking for typos, or browse our categories.
          </p>
          
          {/* Search Bar */}
          <div className="w-full max-w-[580px] mb-8">
            <form onSubmit={handleSearch} className="relative flex flex-col w-full group">
              <div className="flex w-full items-stretch rounded-xl h-14 bg-surface-dark border border-border-dark group-focus-within:border-primary group-focus-within:ring-2 group-focus-within:ring-primary/30 transition-all duration-200 overflow-hidden shadow-lg shadow-black/20">
                <div className="text-primary/70 flex items-center justify-center pl-5 pr-2">
                  <span className="material-symbols-outlined text-[24px]">search</span>
                </div>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="flex w-full min-w-0 flex-1 resize-none bg-transparent text-white focus:outline-0 placeholder:text-white/30 px-2 text-lg font-normal leading-normal"
                  placeholder="Search for titles, authors, or genres..."
                />
                {/* Clear/Search Action */}
                <button
                  type="submit"
                  className="pr-2 flex items-center justify-center"
                >
                  <div className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-sm flex items-center justify-center transition-colors">
                    Search
                  </div>
                </button>
              </div>
            </form>
          </div>
          
          {/* Chips / Suggestions */}
          <div className="flex flex-wrap justify-center gap-3 w-full max-w-[700px]">
            <button
              onClick={handleClearFilters}
              className="flex h-9 items-center justify-center gap-x-2 rounded-full border border-border-dark bg-white/5 hover:bg-white/10 px-5 transition-all cursor-pointer group"
            >
              <span className="text-white/80 group-hover:text-white text-sm font-medium">Clear Filters</span>
              <span className="material-symbols-outlined text-[16px] text-white/50 group-hover:text-white">close</span>
            </button>
            <Link
              href="/explore"
              className="flex h-9 items-center justify-center gap-x-2 rounded-full border border-border-dark bg-white/5 hover:bg-white/10 px-5 transition-all cursor-pointer group"
            >
              <span className="text-white/80 group-hover:text-white text-sm font-medium">Browse Categories</span>
              <span className="material-symbols-outlined text-[16px] text-white/50 group-hover:text-white">category</span>
            </Link>
            <Link
              href="/explore?sort=rating"
              className="flex h-9 items-center justify-center gap-x-2 rounded-full border border-border-dark bg-white/5 hover:bg-white/10 px-5 transition-all cursor-pointer group"
            >
              <span className="text-white/80 group-hover:text-white text-sm font-medium">View Top Rated</span>
              <span className="material-symbols-outlined text-[16px] text-white/50 group-hover:text-white">trending_up</span>
            </Link>
          </div>
        </div>
      </main>
      
      {/* Recommendations Footer */}
      <section className="w-full bg-gradient-to-t from-black/40 to-transparent py-12 border-t border-border-dark/50">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white tracking-tight text-xl md:text-2xl font-bold leading-tight">
              While you&apos;re here, check out these popular reads
            </h3>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-full bg-surface-dark hover:bg-primary/20 flex items-center justify-center text-white transition-colors border border-border-dark">
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded-full bg-surface-dark hover:bg-primary/20 flex items-center justify-center text-white transition-colors border border-border-dark">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
          
          {/* Book Grid/Carousel - Placeholder */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            <div className="text-center text-white/50 text-sm py-8 col-span-full">
              Popular books will be displayed here
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function BooksNotFound() {
  return (
    <Suspense fallback={
      <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display text-gray-900 dark:text-white overflow-x-hidden">
        <ErrorNavbar />
        <main className="flex-grow flex flex-col items-center justify-center px-4 py-12">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Loading...</h1>
          </div>
        </main>
      </div>
    }>
      <BooksNotFoundContent />
    </Suspense>
  );
}
