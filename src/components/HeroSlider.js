'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';

const slides = [
  {
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBCyDl6Ydl0fjXvdPpWK70bp9YmcxzROe9R8B6O9TQ2RHas7rIWvoNAiylNrZwXf5bUdZGXamxLoHuaQ6W8Bghg0P3g8gRItLPO2U5PyBQKtQJCliTZOoeKK07Lak-RZlAWwVY-ldaPqTLQjxA7ME5uUi7BYhpK77Lc8Q9VyHVgpud7xSs_yJJZXvzl0mYJGkHIfbClEDgxpjOWWJkeSUcva2YiDmLH7plqW280-oEaVwdPcclydgX074xXCDbGwVreuqDKEIqc1kY",
    title: "Your Library, Reimagined.",
    subtitle: "Reserve online, pick up in-store, or get it delivered directly to your doorstep.",
    cta: "Explore Collection",
    link: "/explore"
  },
  {
    image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=2000",
    title: "1000+ Titles Await.",
    subtitle: "From timeless classics to modern bestsellers, find your next favorite read today.",
    cta: "Top Borrowed",
    link: "/explore?sort=rating&order=desc"
  },
  {
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=2000",
    title: "Premium Reading Experience.",
    subtitle: "Unlock unlimited audiobooks and priority reservations with our Elite membership.",
    cta: "Go Premium",
    link: "/#pricing"
  }
];

const HeroSlider = () => {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    // GSAP Animation for current slide
    if (containerRef.current) {
      const activeSlide = containerRef.current.querySelector(`.slide-${current}`);
      if (activeSlide) {
        const title = activeSlide.querySelector('h2');
        const subtitle = activeSlide.querySelector('p');
        const buttons = activeSlide.querySelector('.button-group');

        // Reset previous states
        if (title || subtitle || buttons) {
          const targets = [title, subtitle, buttons].filter(Boolean);
          gsap.set(targets, { opacity: 0, y: 30 });

          // Animate
          const tl = gsap.timeline();
          if (title) tl.to(title, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
          if (subtitle) tl.to(subtitle, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.3');
          if (buttons) tl.to(buttons, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.3');
        }
      }
    }

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 3000); // Increased time slightly for animations
    return () => clearInterval(timer);
  }, [current]);

  const nextSlide = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <section ref={containerRef} className="relative w-full h-[65vh] min-h-[500px] overflow-hidden bg-black">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-600 ease-in-out ${
            index === current ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'
          }`}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover opacity-30"
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/20 to-black/30 blur-sm"></div>
          </div>

          {/* Content */}
          <div className={`slide-${index} relative h-full flex items-center justify-center text-center px-6`}>
            <div className={`max-w-4xl`}>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight mb-8 drop-shadow-2xl">
                {slide.title.split(',').map((part, i) => (
                  <span key={i} className={part.includes('Reimagined') || part.includes('Await') || part.includes('Experience') ? "text-primary block md:inline" : ""}>
                    {part}{i === 0 && slide.title.includes(',') ? ',' : ''}
                  </span>
                ))}
              </h2>
              <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
                {slide.subtitle}
              </p>
              <div className="button-group flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href={slide.link}
                  className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_15px_rgba(170,31,239,0.3)] hover:scale-105 active:scale-95"
                >
                  {slide.cta}
                </Link>
                <button 
                  onClick={() => document.getElementById('browse-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-white/10 hover:bg-white/80 backdrop-blur-lg text-white px-8 py-4 rounded-full font-bold text-lg transition-all border border-white/20 hover:scale-105"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Controls */}
      <button 
        onClick={prevSlide}
        className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 backdrop-blur-lg border border-white/10 text-white flex items-center justify-center hover:bg-primary transition-all z-20 group"
      >
        <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/80 backdrop-blur-lg border border-white/10 text-white flex items-center justify-center hover:bg-primary transition-all z-20 group"
      >
        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
      </button>

      {/* Progress Indicators */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'w-8 bg-primary' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>

      {/* Scroll Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <span className="material-symbols-outlined text-white/50 text-2xl">keyboard_double_arrow_down</span>
      </div>
    </section>
  );
};

export default HeroSlider;
