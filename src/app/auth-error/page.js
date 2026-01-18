'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ErrorNavbar from '@/components/ErrorNavbar';
import Lottie from 'lottie-react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('message') || 'You need to be authenticated to access this page.';
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    // Load Lottie animation from public directory
    fetch('/animations/auth-error.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
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
          {/* Error Hero */}
          <div className="flex flex-col items-center text-center gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="relative">
              {/* Lottie Animation */}
              {animationData && (
                <div className="w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
                  <Lottie
                    animationData={animationData}
                    loop={true}
                    autoplay={true}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              )}
              {/* Decorative glow */}
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full -z-10"></div>
            </div>
            
            <div className="space-y-4 max-w-[600px]">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                Authentication Required
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed">
                {errorMessage}
              </p>
              <p className="text-gray-500 text-base leading-relaxed">
                Please sign in to your account to continue.
              </p>
            </div>
            
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[480px] mt-2">
              <Link
                href="/login"
                className="flex-1 cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-primary text-white text-base font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex-1 cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-[#2b1934] border border-[#3c2348] text-white text-base font-bold hover:bg-[#3c2348] hover:border-[#553267] transition-all duration-200 flex"
              >
                Create Account
              </Link>
            </div>
          </div>
          
          {/* Helpful Links */}
          <div className="w-full mt-8">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="h-px bg-[#3c2348] flex-1"></div>
                <span className="text-[#b791ca] text-sm uppercase tracking-wider font-semibold">Need help?</span>
                <div className="h-px bg-[#3c2348] flex-1"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[600px] mx-auto">
                {/* Card 1 */}
                <Link
                  href="/"
                  className="group relative flex flex-col gap-3 rounded-xl border border-[#3c2348] bg-[#2b1934]/50 p-6 transition-all duration-300 hover:bg-[#2b1934] hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
                >
                  <div className="bg-primary/10 rounded-lg w-12 h-12 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                    <span className="material-symbols-outlined text-2xl">home</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-white text-lg font-bold group-hover:text-primary transition-colors">Go Home</h3>
                    <p className="text-gray-400 text-sm">Return to the homepage and explore our library.</p>
                  </div>
                </Link>
                
                {/* Card 2 */}
                <Link
                  href="/explore"
                  className="group relative flex flex-col gap-3 rounded-xl border border-[#3c2348] bg-[#2b1934]/50 p-6 transition-all duration-300 hover:bg-[#2b1934] hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
                >
                  <div className="bg-primary/10 rounded-lg w-12 h-12 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
                    <span className="material-symbols-outlined text-2xl">menu_book</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-white text-lg font-bold group-hover:text-primary transition-colors">Browse Books</h3>
                    <p className="text-gray-400 text-sm">Discover our collection of books and magazines.</p>
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
            © 2024 Bookflix Library Services. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display text-gray-900 dark:text-white overflow-x-hidden">
        <ErrorNavbar />
        <main className="flex-grow flex flex-col items-center justify-center px-4 py-12 md:py-20">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
              Loading...
            </h1>
          </div>
        </main>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
