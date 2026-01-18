'use client';

import { useState } from 'react';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    // Simulate submission
    setTimeout(() => {
      setStatus('success');
      setEmail('');
    }, 1500);
  };

  return (
    <section className="py-20 px-6" id="newsletter">
      <div className="max-w-[1400px] mx-auto">
        <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-primary/20 to-purple-900/40 p-12 md:p-24 border border-white/10 text-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Join the Reading Revolution</h2>
            <p className="text-xl text-gray-300 mb-10 leading-relaxed font-light">
              Get weekly book recommendations, exclusive author interviews, and sneak peeks at new arrivals directly in your inbox.
            </p>
            
            {status === 'success' ? (
              <div className="animate-fade-in-up bg-green-500/20 border border-green-500/50 text-green-400 p-6 rounded-2xl flex items-center justify-center gap-3">
                <span className="material-symbols-outlined">check_circle</span>
                <span className="font-bold">You're on the list! Welcome to the family.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 bg-black/40 border border-white/10 rounded-full px-8 py-5 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary transition-all text-lg"
                  required
                />
                <button 
                  type="submit"
                  disabled={status === 'loading'}
                  className="bg-primary hover:bg-primary-hover text-white px-10 py-5 rounded-full font-bold text-lg transition-all shadow-glow hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {status === 'loading' ? 'Joining...' : (
                    <>Subscribe Now <span className="material-symbols-outlined">send</span></>
                  )}
                </button>
              </form>
            )}
            <p className="mt-6 text-gray-500 text-sm">We respect your privacy. Unsubscribe at any time.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
