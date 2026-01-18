'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import UserProfile from '@/components/UserProfile';
import { USER_ROLES } from '@/lib/constants';

const Navbar = ({ togglePricingModal }) => {
  const { user, userData } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loggedOutRoutes = [
    { name: 'Home', href: '/' },
    { name: 'Explore', href: '/browse' },
    { name: 'Pricing', href: '/#pricing' },
    { name: 'About', href: '/#about' },
  ];

  const loggedInRoutes = [
    { name: 'Home', href: '/' },
    { name: 'Explore', href: '/browse' },
    { name: 'My Borrowings', href: '/member/my-borrowings', roles: [USER_ROLES.MEMBER] },
    { name: 'Dashboard', href: userData?.role === USER_ROLES.ADMIN ? '/admin/overview' : userData?.role === USER_ROLES.LIBRARIAN ? '/librarian/overview' : '/member/overview' },
    { name: 'Premium', href: '/#pricing', roles: [USER_ROLES.MEMBER] },
  ];

  const routes = user ? loggedInRoutes : loggedOutRoutes;

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${
      isScrolled ? 'bg-black/80 backdrop-blur-lg border-b border-white/10 py-3' : 'bg-transparent py-5'
    }`}>
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="material-symbols-outlined text-3xl text-primary group-hover:rotate-12 transition-transform duration-300">auto_stories</span>
          <h1 className="text-white text-2xl font-black tracking-tighter">Bookflix</h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {routes.map((route) => (
            (!route.roles || (userData && (route.roles.includes(userData.role) || userData.role === USER_ROLES.ADMIN))) && (
              <Link
                key={route.name}
                href={route.href}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors relative group"
              >
                {route.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            )
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <UserProfile />
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:block text-white/80 hover:text-white text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <button
                className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-[0_0_15px_rgba(170,31,239,0.3)] hover:scale-105 active:scale-95"
                onClick={togglePricingModal}
              >
                Join Now
              </button>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="material-symbols-outlined text-2xl">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[72px] bg-black/95 backdrop-blur-xl z-[49] animate-fade-in flex flex-col p-8">
           <nav className="flex flex-col gap-6 items-start">
            {routes.map((route) => (
              (!route.roles || (userData && (route.roles.includes(userData.role) || userData.role === USER_ROLES.ADMIN))) && (
                <Link
                  key={route.name}
                  href={route.href}
                  className="text-2xl font-bold text-white hover:text-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {route.name}
                </Link>
              )
            ))}
            {!user && (
              <Link
                href="/login"
                className="text-2xl font-bold text-white/60 hover:text-white transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
            {!user && (
               <button
               className="w-full bg-primary hover:bg-primary-hover text-white px-6 py-4 rounded-xl text-lg font-bold transition-all"
               onClick={() => {
                 setIsMobileMenuOpen(false);
                 togglePricingModal();
               }}
             >
               Join Now
             </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
