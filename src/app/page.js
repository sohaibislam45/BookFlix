'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSlider from '@/components/HeroSlider';
import Features from '@/components/Features';
import CategoriesGrid from '@/components/CategoriesGrid';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import Newsletter from '@/components/Newsletter';
import { showError } from '@/lib/swal';
import { USER_ROLES } from '@/lib/constants';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Home() {
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [processingSubscription, setProcessingSubscription] = useState(false);
  const { user, userData } = useAuth();
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const statsRef = useRef(null);
  const sectionsRef = useRef([]);

  // Stats state
  const [stats, setStats] = useState({
    totalBooks: 0,
    activeMembers: 0,
    totalLibraries: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Book sections state
  const [topBorrowedBooks, setTopBorrowedBooks] = useState([]);
  const [newArrivalsBooks, setNewArrivalsBooks] = useState([]);
  const [banglaBooks, setBanglaBooks] = useState([]);
  const [englishBooks, setEnglishBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState({
    topBorrowed: true,
    newArrivals: true,
    bangla: true,
    english: true,
  });

  // Determine if user is a general member (member role, not premium, not admin/librarian)
  const isGeneralMember = user && userData && 
    userData.role === USER_ROLES.MEMBER &&
    (!userData.subscription?.type || 
     userData.subscription.type === 'free' || 
     userData.subscription.status !== 'active' ||
     !['monthly', 'yearly'].includes(userData.subscription.type));

  // GSAP Animations
  useEffect(() => {
    // Stats Animation
    if (statsRef.current) {
      gsap.fromTo(statsRef.current,
        { opacity: 0, scale: 0.95, y: 30 },
        { 
          opacity: 1, 
          scale: 1, 
          y: 0, 
          duration: 1, 
          ease: 'power4.out',
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 90%',
          }
        }
      );
    }

    sectionsRef.current.forEach((section, index) => {
      if (!section) return;

      const title = section.querySelector('h2');
      const content = section.querySelector('.section-content');
      const cards = section.querySelectorAll('.animate-on-scroll');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      });

      if (title) tl.from(title, { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out' });
      if (content) tl.from(content, { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out' }, '-=0.5');
      if (cards.length > 0) {
        tl.from(cards, { 
          opacity: 0, 
          y: 40, 
          duration: 0.8, 
          stagger: 0.15, 
          ease: 'power2.out' 
        }, '-=0.5');
      }
    });
  }, [loadingStats]); // Recalculate if stats load

  // Handle scroll for parallax
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // Auto-close pricing modal and redirect after 5 seconds
  useEffect(() => {
    let interval;
    if (pricingModalOpen) {
      setCountdown(5); // Reset countdown when modal opens
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setPricingModalOpen(false);
            router.push('/register');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pricingModalOpen, router]);

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalBooks: data.totalBooks || 0,
            activeMembers: data.activeMembers || 0,
            totalLibraries: data.totalLibraries || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // Fetch top borrowed books
  useEffect(() => {
    const fetchTopBorrowed = async () => {
      try {
        const response = await fetch('/api/books/top-borrowed?limit=10');
        if (response.ok) {
          const data = await response.json();
          setTopBorrowedBooks(data.books || []);
        }
      } catch (error) {
        console.error('Error fetching top borrowed books:', error);
      } finally {
        setLoadingBooks(prev => ({ ...prev, topBorrowed: false }));
      }
    };
    fetchTopBorrowed();
  }, []);

  // Fetch new arrivals books
  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        const response = await fetch('/api/books?limit=12&sort=createdAt&order=desc');
        if (response.ok) {
          const data = await response.json();
          setNewArrivalsBooks(data.books || []);
        }
      } catch (error) {
        console.error('Error fetching new arrivals books:', error);
      } finally {
        setLoadingBooks(prev => ({ ...prev, newArrivals: false }));
      }
    };
    fetchNewArrivals();
  }, []);

  // Fetch Bangla books
  useEffect(() => {
    const fetchBanglaBooks = async () => {
      try {
        const response = await fetch('/api/books/by-language?language=bn&limit=12');
        if (response.ok) {
          const data = await response.json();
          setBanglaBooks(data.books || []);
        }
      } catch (error) {
        console.error('Error fetching Bangla books:', error);
      } finally {
        setLoadingBooks(prev => ({ ...prev, bangla: false }));
      }
    };
    fetchBanglaBooks();
  }, []);

  // Fetch English books
  useEffect(() => {
    const fetchEnglishBooks = async () => {
      try {
        const response = await fetch('/api/books/by-language?language=en&limit=12');
        if (response.ok) {
          const data = await response.json();
          setEnglishBooks(data.books || []);
        }
      } catch (error) {
        console.error('Error fetching English books:', error);
      } finally {
        setLoadingBooks(prev => ({ ...prev, english: false }));
      }
    };
    fetchEnglishBooks();
  }, []);

  const togglePricingModal = () => {
    setPricingModalOpen(!pricingModalOpen);
  };

  const handleFreeRegistration = () => {
    setPricingModalOpen(false);
    router.push('/member/overview');
  };

  const handlePlanSelection = (plan) => {
    setPricingModalOpen(false);
    router.push('/member/upgrade#choose-plan');
  };

  const handleUpgradeSubscription = async (plan) => {
    if (!user || !userData) {
      // Redirect to login if not logged in
      window.location.href = '/login';
      return;
    }

    // Validate plan value
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      showError('Invalid Plan', 'Please select a valid subscription plan.');
      return;
    }

    // Validate user ID
    if (!userData._id) {
      showError('User Error', 'User information is incomplete. Please try logging in again.');
      return;
    }

    try {
      setProcessingSubscription(true);

      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData._id,
          plan: plan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Error creating subscription checkout:', err);
      showError('Subscription Error', err.message || 'Failed to start subscription. Please try again.');
      setProcessingSubscription(false);
    }
  };

  // Format number with K suffix for thousands
  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-x-hidden">
      <Navbar togglePricingModal={togglePricingModal} />
      <HeroSlider />

      {/* Main Content */}
      <main className="relative z-20 -mt-20 pb-20 space-y-24 px-6 md:px-12 max-w-[1600px] mx-auto w-full">
        {/* Stats */}
        <div 
          ref={statsRef}
          className="glass-panel w-full rounded-[2rem] p-3 border border-white/10 shadow-2xl backdrop-blur-xl bg-black/40 mb-8 opacity-0"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-white/10 text-center">
            <div className="flex flex-col items-center justify-center p-4">
              <span className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-tight">
                {!loadingStats ? (stats.totalBooks >= 1000 ? formatNumber(stats.totalBooks) : stats.totalBooks) : '0'}
              </span>
              <span className="text-sm text-primary font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">auto_stories</span>
                Books
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <span className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-tight">
                {!loadingStats ? (stats.activeMembers >= 1000 ? formatNumber(stats.activeMembers) : stats.activeMembers) : '0'}
              </span>
              <span className="text-sm text-primary font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">group</span>
                Active Members
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <span className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-tight">
                {!loadingStats ? stats.totalLibraries : '0'}
              </span>
              <span className="text-sm text-primary font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">domain</span>
                Libraries
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <span className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-tight">24/7</span>
              <span className="text-sm text-primary font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">public</span>
                Access
              </span>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <Features />

        {/* Categories Section */}
        <CategoriesGrid />

        {/* Top Borrowed Section */}
        <div 
          ref={(el) => (sectionsRef.current[0] = el)}
          className="flex flex-col gap-4 opacity-0"
        >
          <div className="flex items-end justify-between px-2">
            <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">Top Borrowed This Week</h2>
            <Link
              className="text-xs font-semibold text-primary hover:text-white uppercase tracking-wider flex items-center gap-1 hover:gap-2 transition-all"
              href="/explore?sort=rating&order=desc"
            >
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="relative group/carousel">
            <div className="flex overflow-x-auto gap-4 md:gap-6 pb-8 pt-4 px-2 no-scrollbar scroll-smooth snap-x">
              {loadingBooks.topBorrowed ? (
                <div className="flex items-center justify-center w-full py-8 text-gray-400">
                  Loading...
                </div>
              ) : topBorrowedBooks.length === 0 ? (
                <div className="flex items-center justify-center w-full py-8 text-gray-400">
                  No books borrowed this week yet.
                </div>
              ) : (
                topBorrowedBooks.map((book, index) => (
                  <Link
                    key={book._id}
                    href={`/book/${book._id}`}
                    className="flex-none w-[160px] md:w-[200px] snap-start group cursor-pointer opacity-0 animate-on-scroll"
                  >
                    <div className="card-hover-effect relative aspect-[2/3] rounded-md overflow-hidden shadow-lg shadow-black/50 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20">
                      <Image
                        src={book.coverImage || '/placeholder-book.png'}
                        alt={`${book.title} by ${book.author}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 160px, 200px"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <div className="bg-primary/20 backdrop-blur-md border border-white/20 text-white font-medium py-2 px-4 rounded-sm text-sm text-center">
                          View Details
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-white text-sm font-semibold truncate">{book.title}</h3>
                      <p className="text-gray-400 text-xs">{book.author}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Fresh New Arrivals Section */}
        <div 
          ref={(el) => (sectionsRef.current[1] = el)}
          className="flex flex-col gap-4 opacity-0"
        >
          <div className="flex items-end justify-between px-2">
            <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">Fresh New Arrivals</h2>
            <Link
              className="text-xs font-semibold text-primary hover:text-white uppercase tracking-wider flex items-center gap-1 hover:gap-2 transition-all"
              href="/explore?sort=createdAt&order=desc"
            >
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="relative group/carousel">
            <div className="flex overflow-x-auto gap-4 md:gap-6 pb-8 pt-4 px-2 no-scrollbar scroll-smooth snap-x">
              {loadingBooks.newArrivals ? (
                <div className="flex items-center justify-center w-full py-8 text-gray-400">
                  Loading...
                </div>
              ) : newArrivalsBooks.length === 0 ? (
                <div className="flex items-center justify-center w-full py-8 text-gray-400">
                  No new books available yet.
                </div>
              ) : (
                newArrivalsBooks.map((book, index) => (
                  <Link
                    key={book._id}
                    href={`/book/${book._id}`}
                    className="flex-none w-[160px] md:w-[200px] snap-start group cursor-pointer opacity-0 animate-on-scroll"
                  >
                    <div className="card-hover-effect relative aspect-[2/3] rounded-md overflow-hidden shadow-lg shadow-black/50 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20">
                      <Image
                        src={book.coverImage || '/placeholder-book.png'}
                        alt={`${book.title} by ${book.author}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 160px, 200px"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <div className="bg-primary/20 backdrop-blur-md border border-white/20 text-white font-medium py-2 px-4 rounded-sm text-sm text-center">
                          View Details
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-white text-sm font-semibold truncate">{book.title}</h3>
                      <p className="text-gray-400 text-xs">{book.author}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bangla Books Section */}
        <div 
          ref={(el) => (sectionsRef.current[2] = el)}
          className="flex flex-col gap-4 opacity-0"
        >
          <div className="flex items-end justify-between px-2">
            <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">Bangla Books</h2>
            <Link
              className="text-xs font-semibold text-primary hover:text-white uppercase tracking-wider flex items-center gap-1 hover:gap-2 transition-all"
              href="/explore?language=bn"
            >
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="relative group/carousel">
            <div className="flex overflow-x-auto gap-4 md:gap-6 pb-8 pt-4 px-2 no-scrollbar scroll-smooth snap-x">
              {loadingBooks.bangla ? (
                <div className="flex items-center justify-center w-full py-8 text-gray-400">
                  Loading...
                </div>
              ) : banglaBooks.length === 0 ? (
                <div className="flex items-center justify-center w-full py-8 text-gray-400">
                  No Bangla books available yet.
                </div>
              ) : (
                banglaBooks.map((book, index) => (
                  <Link
                    key={book._id}
                    href={`/book/${book._id}`}
                    className="flex-none w-[160px] md:w-[200px] snap-start group cursor-pointer opacity-0 animate-on-scroll"
                  >
                    <div className="card-hover-effect relative aspect-[2/3] rounded-md overflow-hidden shadow-lg shadow-black/50 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20">
                      <Image
                        src={book.coverImage || '/placeholder-book.png'}
                        alt={`${book.title} by ${book.author}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 160px, 200px"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <div className="bg-primary/20 backdrop-blur-md border border-white/20 text-white font-medium py-2 px-4 rounded-sm text-sm text-center">
                          View Details
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-white text-sm font-semibold truncate">{book.title}</h3>
                      <p className="text-gray-400 text-xs">{book.author}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* English Books Section */}
        <div 
          ref={(el) => (sectionsRef.current[3] = el)}
          className="flex flex-col gap-4 opacity-0"
        >
          <div className="flex items-end justify-between px-2">
            <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">English Books</h2>
            <Link
              className="text-xs font-semibold text-primary hover:text-white uppercase tracking-wider flex items-center gap-1 hover:gap-2 transition-all"
              href="/explore?language=en"
            >
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="relative group/carousel">
            <div className="flex overflow-x-auto gap-4 md:gap-6 pb-8 pt-4 px-2 no-scrollbar scroll-smooth snap-x">
              {loadingBooks.english ? (
                <div className="flex items-center justify-center w-full py-8 text-gray-400">
                  Loading...
                </div>
              ) : englishBooks.length === 0 ? (
                <div className="flex items-center justify-center w-full py-8 text-gray-400">
                  No English books available yet.
                </div>
              ) : (
                englishBooks.map((book, index) => (
                  <Link
                    key={book._id}
                    href={`/book/${book._id}`}
                    className="flex-none w-[160px] md:w-[200px] snap-start group cursor-pointer opacity-0 animate-on-scroll"
                  >
                    <div className="card-hover-effect relative aspect-[2/3] rounded-md overflow-hidden shadow-lg shadow-black/50 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20">
                      <Image
                        src={book.coverImage || '/placeholder-book.png'}
                        alt={`${book.title} by ${book.author}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 160px, 200px"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <div className="bg-primary/20 backdrop-blur-md border border-white/20 text-white font-medium py-2 px-4 rounded-sm text-sm text-center">
                          View Details
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className="text-white text-sm font-semibold truncate">{book.title}</h3>
                      <p className="text-gray-400 text-xs">{book.author}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CTA Section - Show for general members and non-logged-in users */}
        {(isGeneralMember || !user) && (
          <div 
            ref={(el) => (sectionsRef.current[4] = el)}
            className={`relative rounded-[3rem] overflow-hidden mt-12 group`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-900 opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10 px-8 py-16 md:px-20 md:py-24 flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left border border-white/10 rounded-[3rem] bg-background-dark/60 backdrop-blur-xl transform transition-all duration-500 hover:scale-[1.01]">
              <div className="max-w-2xl space-y-6">
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  Ready to Reimagine Your <span className="text-primary">Reading?</span>
                </h2>
                <p className="text-gray-300 text-xl font-light leading-relaxed">
                  Join Bookflix today and get instant access to our curated collection. No late fees, no hassles, just pure stories.
                </p>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-400 pt-4">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400">check_circle</span>
                    Cancel anytime
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400">check_circle</span>
                    Free 7-day trial
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400">check_circle</span>
                    15k+ Titles
                  </span>
                </div>
              </div>
              <button
                className="shrink-0 bg-primary hover:bg-primary-hover text-white px-12 py-6 rounded-full font-bold text-xl transition-all shadow-glow hover:scale-105 active:scale-95 flex items-center gap-3"
                onClick={togglePricingModal}
              >
                Get Started Now <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Testimonials Section */}
        <Testimonials />

        {/* FAQ Section */}
        <FAQ />

        {/* Newsletter Section */}
        <Newsletter />
      </main>

      <Footer />

      {/* Pricing Modal */}
      {pricingModalOpen && (
        <div
          aria-labelledby="modal-title"
          aria-modal="true"
          className="fixed inset-0 z-[100]"
          id="pricing-modal"
          role="dialog"
        >
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm transition-opacity" onClick={togglePricingModal}></div>
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-2xl bg-background-dark border border-white/10 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-5xl">
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
                    <div className="rounded-xl border border-white/10 bg-surface-dark p-6 hover:border-primary/50 transition-colors flex flex-col">
                      <h3 className="text-xl font-bold text-white">Free Plan</h3>
                      <div className="mt-4 flex items-baseline text-white">
                        <span className="text-4xl font-black tracking-tight">0 ৳</span>
                        <span className="ml-1 text-sm text-gray-400">/month</span>
                      </div>
                      <ul className="mt-6 space-y-4 flex-1 text-sm text-gray-300">
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          7-day borrowing
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          15% standard late fine
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Basic reservation queue
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          In-library pickup only
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
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
                    <div className="rounded-xl border border-primary bg-purple-200 p-6 relative flex flex-col transform md:-translate-y-2 shadow-[0_4px_20px_rgba(170,31,239,0.15)]">
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
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          20-day borrowing
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          5% late fine discount
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Advance reservation
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Home delivery
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Push & SMS notifications
                        </li>
                      </ul>
                      <button
                        onClick={() => handlePlanSelection('monthly')}
                        className="mt-8 w-full rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25"
                      >
                        {user ? 'Get Monthly' : 'Sign Up for Monthly'}
                      </button>
                    </div>

                    {/* Yearly Premium */}
                    <div className="rounded-xl border border-white/10 bg-surface-dark p-6 hover:border-primary/50 transition-colors flex flex-col">
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
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          20-day borrowing
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          10% late fine discount
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Priority advance reservation
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Free home delivery
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Push, SMS & priority support
                        </li>
                      </ul>
                      <button
                        onClick={() => handlePlanSelection('yearly')}
                        className="mt-8 w-full rounded-md border border-white/20 bg-transparent px-4 py-2 text-sm font-bold text-white hover:bg-white/5 transition-colors"
                      >
                        {user ? 'Get Yearly' : 'Sign Up for Yearly'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-10 pt-6 border-t border-white/5 text-center">
                    <p className="text-gray-500 text-md">
                      Redirecting to registration in <span className="text-primary font-bold">{countdown}</span> seconds...
                    </p>
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
