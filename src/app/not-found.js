'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ErrorNavbar from '@/components/ErrorNavbar';
import dynamic from 'next/dynamic';

// Dynamically import Lottie with SSR disabled to prevent server-side errors
const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => null,
});

export default function NotFound() {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    // Load Lottie animation from public directory
    fetch('/animations/404-error.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch animation: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        // Validate animation data structure
        if (data && typeof data === 'object' && data.v && data.fr !== undefined) {
          setAnimationData(data);
        } else {
          console.error('Invalid animation data structure');
          setAnimationData(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load animation:', err);
        // Fallback: set null to hide animation
        setAnimationData(null);
      });
  }, []);

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display text-gray-900 dark:text-white overflow-x-hidden">
      <ErrorNavbar />
      
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-12 md:py-20">
        <div className="layout-content-container flex flex-col max-w-[960px] w-full items-center gap-12">
          {/* 404 Hero */}
          <div className="flex flex-col items-center text-center gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="relative">
              <h1 className="text-[120px] md:text-[180px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white/90 to-white/10 select-none">
                404
              </h1>
              {/* Decorative glow */}
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full -z-10"></div>
            </div>
            
            {/* Lottie Animation */}
            {animationData && (
              <div className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] -mt-12">
                <Lottie
                  animationData={animationData}
                  loop={true}
                  autoplay={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            )}
            
            <div className="space-y-4 max-w-[600px]">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
                Looks like you've wandered off the map.
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                The chapter you are looking for is missing from our collection. It might have been moved, deleted, or perhaps it never existed in this timeline.
              </p>
            </div>
            
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[480px] mt-2">
              <Link
                href="/"
                className="flex-1 cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-primary text-white text-base font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex"
              >
                Go to Homepage
              </Link>
              <Link
                href="/member/browse"
                className="flex-1 cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-[#2b1934] border border-[#3c2348] text-white text-base font-bold hover:bg-[#3c2348] hover:border-[#553267] transition-all duration-200 flex"
              >
                Browse Books
              </Link>
            </div>
          </div>
          
          {/* Search Bar Integration */}
          <div className="w-full max-w-[560px] relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-[#553267] rounded-lg opacity-30 group-hover:opacity-60 transition duration-500 blur"></div>
            <div className="relative flex w-full items-center bg-[#1c1122] rounded-lg h-14 border border-[#3c2348] shadow-2xl">
              <div className="pl-4 pr-3 text-[#b791ca]">
                <span className="material-symbols-outlined text-2xl">search</span>
              </div>
              <Link href="/member/browse" className="w-full bg-transparent border-none text-white placeholder-[#7a5c8a] focus:ring-0 text-base h-full rounded-r-lg flex items-center text-[#7a5c8a]">
                Search for titles, authors, or genres to get back on track...
              </Link>
            </div>
          </div>
          
          {/* Helpful Links Grid */}
          <div className="w-full mt-8">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="h-px bg-[#3c2348] flex-1"></div>
                <span className="text-[#b791ca] text-sm uppercase tracking-wider font-semibold">Or jump to a section</span>
                <div className="h-px bg-[#3c2348] flex-1"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1 */}
                <Link
                  href="/member/browse"
                  className="group relative flex flex-col gap-3 rounded-xl border border-[#3c2348] bg-[#2b1934]/50 p-6 transition-all duration-300 hover:bg-[#2b1934] hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
                >
                  <div className="bg-primary/10 rounded-lg w-12 h-12 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                    <span className="material-symbols-outlined text-2xl">menu_book</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-white text-lg font-bold group-hover:text-primary transition-colors">Browse Books</h3>
                    <p className="text-gray-400 text-sm">Explore our vast collection of digital books and magazines.</p>
                  </div>
                </Link>
                
                {/* Card 2 */}
                <Link
                  href="/dashboard"
                  className="group relative flex flex-col gap-3 rounded-xl border border-[#3c2348] bg-[#2b1934]/50 p-6 transition-all duration-300 hover:bg-[#2b1934] hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
                >
                  <div className="bg-primary/10 rounded-lg w-12 h-12 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                    <span className="material-symbols-outlined text-2xl">dashboard</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-white text-lg font-bold group-hover:text-primary transition-colors">My Dashboard</h3>
                    <p className="text-gray-400 text-sm">Check your current loans, holds, and reading history.</p>
                  </div>
                </Link>
                
                {/* Card 3 */}
                <Link
                  href="/member/browse?sort=new"
                  className="group relative flex flex-col gap-3 rounded-xl border border-[#3c2348] bg-[#2b1934]/50 p-6 transition-all duration-300 hover:bg-[#2b1934] hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
                >
                  <div className="bg-primary/10 rounded-lg w-12 h-12 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                    <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-white text-lg font-bold group-hover:text-primary transition-colors">New Arrivals</h3>
                    <p className="text-gray-400 text-sm">See the latest additions freshly added to the library.</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-[#3c2348] bg-[#1a0f20] py-10 mt-auto">
        <div className="max-w-[960px] mx-auto px-5 flex flex-col gap-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <Link href="/help" className="text-[#b791ca] text-sm hover:text-white transition-colors">
              Help Center
            </Link>
            <Link href="/terms" className="text-[#b791ca] text-sm hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-[#b791ca] text-sm hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
          <p className="text-gray-500 text-xs">
            © 2024 Bookflix Library Services. All rights reserved. <br/>
            "Bookflix" is a fictional service created for demonstration.
          </p>
        </div>
      </footer>
    </div>
  );
}
