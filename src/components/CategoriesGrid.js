'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const iconMap = {
  'fiction': 'theater_comedy',
  'sci-fi': 'rocket_launch',
  'biography': 'history_edu',
  'mystery': 'search',
  'mistry': 'search',
  'business': 'trending_up',
  'history': 'account_balance',
  'science': 'biotech',
  'art': 'palette',
  'novel': 'auto_stories',
};

const colorMap = {
  'fiction': 'from-blue-500/20 to-blue-600/20',
  'sci-fi': 'from-purple-500/20 to-purple-600/20',
  'biography': 'from-amber-500/20 to-amber-600/20',
  'mystery': 'from-red-500/20 to-red-600/20',
  'mistry': 'from-red-500/20 to-red-600/20',
  'business': 'from-emerald-500/20 to-emerald-600/20',
  'history': 'from-orange-500/20 to-orange-600/20',
  'science': 'from-cyan-500/20 to-cyan-600/20',
  'art': 'from-pink-500/20 to-pink-600/20',
  'novel': 'from-indigo-500/20 to-indigo-600/20',
};

const CategoriesGrid = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <section className="py-20 px-6">
        <div className="max-w-[1400px] mx-auto text-center">
          <div className="animate-pulse text-gray-500 font-bold tracking-widest uppercase text-sm">Loading Categories...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6" id="categories">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] mb-4">Browse by Genre</h2>
            <h3 className="text-3xl md:text-5xl font-black text-white">Find Your Next Story</h3>
          </div>
          <Link href="/explore" className="text-primary hover:text-white font-bold flex items-center gap-2 group transition-colors">
            View All Categories <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.slice(0, 8).map((cat) => (
            <Link 
              key={cat._id}
              href={`/explore?category=${cat._id}`}
              className={`p-8 rounded-3xl bg-gradient-to-br ${colorMap[cat.name.toLowerCase()] || 'from-gray-500/20 to-gray-600/20'} border border-white/5 hover:border-primary/30 transition-all duration-300 group text-center flex flex-col items-center justify-center gap-4 animate-on-scroll`}
            >
              <span className={`material-symbols-outlined text-4xl text-white group-hover:scale-110 transition-transform duration-300`}>
                {cat.icon || iconMap[cat.name.toLowerCase()] || 'book'}
              </span>
              <span className="text-xl font-bold text-white group-hover:text-primary transition-colors capitalize">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesGrid;
