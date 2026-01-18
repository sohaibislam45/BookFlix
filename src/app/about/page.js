'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Features from '@/components/Features';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function AboutPage() {
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const storyRef = useRef(null);

  useEffect(() => {
    // Hero Text Animation
    const heroTitle = heroRef.current.querySelector('h1');
    const heroSubtitle = heroRef.current.querySelector('p');
    
    gsap.fromTo(heroTitle,
      { opacity: 0, x: -100 },
      { opacity: 1, x: 0, duration: 1.2, ease: 'power4.out' }
    );
    
    gsap.fromTo(heroSubtitle,
      { opacity: 0, x: 100 },
      { opacity: 1, x: 0, duration: 1.2, ease: 'power4.out', delay: 0.2 }
    );

    // Stats Counter Animation
    const stats = statsRef.current.querySelectorAll('.stat-item');
    gsap.fromTo(stats,
      { opacity: 0, scale: 0.5 },
      { 
        opacity: 1, 
        scale: 1, 
        duration: 0.8, 
        stagger: 0.2, 
        ease: 'back.out(1.7)',
        scrollTrigger: {
          trigger: statsRef.current,
          start: 'top 85%',
        }
      }
    );

    // Story Section Reveal
    gsap.fromTo(storyRef.current,
      { opacity: 0, y: 100 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 1.5, 
        ease: 'power3.out',
        scrollTrigger: {
          trigger: storyRef.current,
          start: 'top 80%',
        }
      }
    );

    // Global animate-on-scroll elements
    const scrollElements = document.querySelectorAll('.animate-on-scroll');
    scrollElements.forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });
    });
  }, []);

  return (
    <div className="bg-background-dark min-h-screen flex flex-col font-display selection:bg-primary selection:text-white">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <section ref={heroRef} className="relative h-[80vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image 
              src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=2070" 
              alt="Beautiful library bookshelf"
              fill
              className="object-cover opacity-20 scale-110 blur-[2px]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background-dark/80 via-transparent to-background-dark"></div>
          </div>
          
          <div className="relative z-10 text-center max-w-5xl px-6">
            <h1 className="text-5xl md:text-8xl font-black text-white leading-none tracking-tighter mb-8 opacity-0">
              Reinventing the <span className="text-primary italic">Library</span> Experience
            </h1>
            <p className="text-gray-400 text-xl md:text-2xl font-light leading-relaxed max-w-2xl mx-auto opacity-0">
              Bookflix bridges the gap between traditional wisdom and modern technology, 
              bringing thousands of titles to your doorstep.
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section ref={statsRef} className="py-20 px-6 bg-surface-dark/30 border-y border-white/5">
          <div className="max-w-[1400px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { label: 'Books Available', val: '15,000+', icon: 'auto_stories' },
              { label: 'Active Members', val: '12,500+', icon: 'groups' },
              { label: 'Genres Covered', val: '80+', icon: 'category' },
              { label: 'Branches', val: '12', icon: 'location_on' },
            ].map((stat, i) => (
              <div key={i} className="stat-item flex flex-col items-center text-center opacity-0">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl text-primary">{stat.icon}</span>
                </div>
                <h3 className="text-3xl md:text-5xl font-black text-white mb-2">{stat.val}</h3>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Story Section */}
        <section ref={storyRef} className="py-24 px-6 max-w-7xl mx-auto opacity-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="relative aspect-square rounded-[3rem] overflow-hidden group">
              <Image 
                src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=2190" 
                alt="Modern collaborative library"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-primary/20 mix-blend-overlay"></div>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-primary uppercase tracking-[0.4em]">Our Story</h2>
                <h3 className="text-4xl md:text-6xl font-black text-white leading-tight">
                  Born from a Passion for <span className="text-primary italic">Reading</span>.
                </h3>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed font-light">
                Founded in 2024, Bookflix started with a simple belief: that everyone should have easy 
                access to the world's collective knowledge. We saw traditional libraries struggling 
                with outdated systems and decided to build something better.
              </p>
              <div className="space-y-6">
                {[
                  { title: 'Modern Technology', desc: 'Seamless reservation and real-time tracking systems.' },
                  { title: 'Global Collection', desc: 'Curated titles from both local authors and international bestsellers.' },
                  { title: 'Community Focused', desc: 'Spaces designed for collaboration, learning, and quiet reflection.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                    </div>
                    <div>
                      <h4 className="text-white font-bold mb-1">{item.title}</h4>
                      <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <Features />
      </main>

      <Footer />
    </div>
  );
}
