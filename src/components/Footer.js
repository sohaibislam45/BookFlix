'use client';

import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-black/95 border-t border-white/5 pt-20 pb-10 px-6 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
      
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-sm relative z-10">
        {/* Brand & Mission */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-primary">auto_stories</span>
            <h2 className="text-white text-2xl font-black tracking-tighter">Bookflix</h2>
          </div>
          <p className="text-gray-400 leading-relaxed text-base max-w-xs">
            Reinventing the way you discover, borrow, and read books. The modern library experience, delivered to your screen and your doorstep.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-primary transition-all hover:-translate-y-1">
              <span className="material-symbols-outlined text-lg">public</span>
            </Link>
            <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-primary transition-all hover:-translate-y-1">
              <span className="material-symbols-outlined text-lg">share</span>
            </Link>
            <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-primary transition-all hover:-translate-y-1">
              <span className="material-symbols-outlined text-lg">videocam</span>
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Explore</h3>
          <ul className="space-y-4 text-gray-400">
            <li>
              <Link className="hover:text-primary transition-colors flex items-center gap-2" href="/browse">
                <span className="material-symbols-outlined text-base">explore</span> Browse All
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary transition-colors flex items-center gap-2" href="/browse?sort=rating">
                <span className="material-symbols-outlined text-base">star</span> Top Rated
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary transition-colors flex items-center gap-2" href="/browse?sort=createdAt">
                <span className="material-symbols-outlined text-base">new_releases</span> New Arrivals
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary transition-colors flex items-center gap-2" href="/#pricing">
                <span className="material-symbols-outlined text-base">diamond</span> Premium Plans
              </Link>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Support</h3>
          <ul className="space-y-4 text-gray-400">
            <li><Link className="hover:text-primary transition-colors" href="#">Library Policies</Link></li>
            <li><Link className="hover:text-primary transition-colors" href="#">Help Center / FAQ</Link></li>
            <li><Link className="hover:text-primary transition-colors" href="#">Contact Support</Link></li>
            <li><Link className="hover:text-primary transition-colors" href="#">Locations</Link></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-6">
          <h3 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Contact Us</h3>
          <ul className="space-y-4 text-gray-400">
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-primary">location_on</span>
              <span>123 Library Lane, Digital City, DC 54321</span>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-primary">call</span>
              <span>+1 (555) 012-3456</span>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-primary">mail</span>
              <span>support@bookflix.com</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-xs text-center md:text-left">
        <p>© 2024 Bookflix Library Services. All rights reserved.</p>
        <div className="flex gap-8">
          <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-white transition-colors">Cookies</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
