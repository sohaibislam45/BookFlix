'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FAQ from '@/components/FAQ';
import Testimonials from '@/components/Testimonials';
import { useAuth } from '@/contexts/AuthContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const titleRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    // Title Animation
    gsap.fromTo(titleRef.current,
      { opacity: 0, scale: 0.9, y: 50 },
      { opacity: 1, scale: 1, y: 0, duration: 1.2, ease: 'power4.out' }
    );

    // Cards Staggered Entry
    const cards = cardsRef.current.children;
    gsap.fromTo(cards,
      { opacity: 0, y: 60 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        stagger: 0.2, 
        ease: 'back.out(1.7)',
        scrollTrigger: {
          trigger: cardsRef.current,
          start: 'top 80%',
        }
      }
    );
  }, []);

  const handlePlanSelection = (plan) => {
    if (user) {
      router.push('/member/upgrade#choose-plan');
    } else {
      router.push('/register');
    }
  };

  return (
    <div className="bg-background-dark min-h-screen flex flex-col font-display selection:bg-primary selection:text-white">
      <Navbar />
      
      <main className="flex-grow pt-32 pb-20">
        {/* Header */}
        <section className="px-6 text-center max-w-4xl mx-auto mb-20">
          <div ref={titleRef} className="opacity-0">
            <h1 className="text-sm font-bold text-primary uppercase tracking-[0.4em] mb-4">Pricing Plans</h1>
            <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-6">
              Choose the <span className="text-primary italic">Perfect </span> Fit
            </h2>
            <p className="text-gray-400 text-xl font-light leading-relaxed">
              Unlock unlimited possibilities with our flexible membership tiers. 
              Find the right level of access for your reading journey.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="px-6 max-w-[1400px] mx-auto">
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <div className="rounded-[2.5rem] border border-white/10 bg-surface-dark/50 p-10 flex flex-col transition-all duration-300 hover:border-primary/30 group opacity-0">
              <div className="mb-8">
                <span className="material-symbols-outlined text-4xl text-gray-400 mb-4 group-hover:scale-110 transition-transform">eco</span>
                <h3 className="text-2xl font-bold text-white mb-2">Free Explorer</h3>
                <p className="text-gray-500 text-sm">Perfect for occasional readers starting their journey.</p>
              </div>
              <div className="mb-10 flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">0৳</span>
                <span className="text-gray-500 font-medium">/month</span>
              </div>
              <ul className="space-y-5 mb-12 flex-grow">
                {[
                  '7-day standard borrowing',
                  '15% standard late fine',
                  'Basic reservation queue',
                  'In-library pickup only',
                  'Email notifications'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => router.push('/register')}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all active:scale-95"
              >
                Join for Free
              </button>
            </div>

            {/* Monthly Premium */}
            <div className="rounded-[2.5rem] border-2 border-primary bg-primary/5 p-10 flex flex-col relative shadow-[0_0_50px_rgba(170,31,239,0.1)] transform md:-translate-y-4 opacity-0">
              <div className="absolute top-0 right-10 -translate-y-1/2 bg-primary text-white text-xs font-black uppercase tracking-widest px-6 py-2 rounded-full">
                Most Popular
              </div>
              <div className="mb-8">
                <span className="material-symbols-outlined text-4xl text-primary mb-4 drop-shadow-[0_0_10px_rgba(170,31,239,0.5)]">auto_awesome</span>
                <h3 className="text-2xl font-bold text-white mb-2">Monthly Pro</h3>
                <p className="text-gray-500 text-sm">Advanced features for active library members.</p>
              </div>
              <div className="mb-10 flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">200৳</span>
                <span className="text-gray-500 font-medium">/month</span>
              </div>
              <ul className="space-y-5 mb-12 flex-grow">
                {[
                  '20-day extended borrowing',
                  '5% late fine discount',
                  'Advance reservation perks',
                  'Home delivery available',
                  'SMS & Push notifications'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-100 text-sm">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handlePlanSelection('monthly')}
                className="w-full py-4 rounded-2xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg shadow-primary/30 transition-all active:scale-95"
              >
                Get Premium
              </button>
            </div>

            {/* Yearly Premium */}
            <div className="rounded-[2.5rem] border border-white/10 bg-surface-dark/50 p-10 flex flex-col transition-all duration-300 hover:border-primary/30 group opacity-0">
              <div className="mb-8 flex justify-between items-start">
                <div>
                  <span className="material-symbols-outlined text-4xl text-amber-400 mb-4 group-hover:scale-110 transition-transform">military_tech</span>
                  <h3 className="text-2xl font-bold text-white mb-2">Elite Yearly</h3>
                </div>
                <div className="bg-green-500/20 text-green-400 text-[10px] font-black uppercase px-2 py-1 rounded">Save 17%</div>
              </div>
              <p className="text-gray-500 text-sm mb-8">The ultimate library experience with maximum savings.</p>
              <div className="mb-10 flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-white">2,000৳</span>
                  <span className="text-gray-500 font-medium">/year</span>
                </div>
                <span className="text-xs text-gray-500 mt-1 italic">Equivalent to 166৳/month</span>
              </div>
              <ul className="space-y-5 mb-12 flex-grow">
                {[
                  '20-day extended borrowing',
                  '10% late fine discount',
                  'Priority reservation queue',
                  'Free home delivery',
                  'Priority support access'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handlePlanSelection('yearly')}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all active:scale-95"
              >
                Go Elite
              </button>
            </div>
          </div>
        </section>

        {/* FAQ Integration */}
        <FAQ />

        {/* Social Proof */}
        <Testimonials />
      </main>

      <Footer />
    </div>
  );
}
