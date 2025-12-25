'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(email, password);
    
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Failed to sign in');
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    const result = await signInWithGoogle();
    
    if (result.success) {
      // Check if user exists in MongoDB, if not redirect to complete registration
      try {
        const response = await fetch(`/api/users?firebaseUid=${result.user.uid}`);
        if (!response.ok) {
          router.push('/register?complete=true');
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking user:', error);
        router.push('/register?complete=true');
      }
    } else {
      setError(result.error || 'Failed to sign in with Google');
    }
    
    setLoading(false);
  };

  return (
    <div className="bg-background-dark min-h-screen flex items-center justify-center relative overflow-hidden text-white transition-colors duration-300">
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          alt="Abstract blurred dark library bookshelf background"
          className="w-full h-full object-cover opacity-20 blur-sm scale-110"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrkBpYjLhjVBQK6K_A1QaUVbEISijO_-GU1oBHfIYBro1ARZUrc_1PmGPycfAMSKxGng9F-fVCW9iUQ-XIQGiZy_4ZQEfCUs6vQAOKMkTjWKJVSnVUUPmYcRyHYJuTph36eEw_-Bh9YiL1mn8aMnmExnNq8w_Teo5ttE_kctOCALUeNNLsIYo7XIE04KSz0yVZgyGoEdzPZ3-hcF7KOysKxL4AddZPanWOzeAdA1y6T4HnA9U-pgiVDVj1_u1bEO7NOFw3ve26JKg"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/95 to-background-dark/80"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      </div>

      {/* Login Form */}
      <main className="relative z-10 w-full max-w-[400px] px-4">
        <div className="glass-panel w-full rounded-2xl p-8 flex flex-col gap-6 relative">
          {/* Close Button */}
          <Link
            href="/"
            className="absolute top-4 right-4 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/50 text-text-muted hover:text-white transition-all cursor-pointer"
            aria-label="Close and go to home"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              close
            </span>
          </Link>
          
          <div className="flex flex-col items-center text-center gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">Bookflix</h1>
            <p className="text-text-muted text-sm font-medium">Welcome back to your digital library.</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-4 mt-2" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider ml-1" htmlFor="email">
                Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-500 group-focus-within:text-primary transition-colors text-[20px]">
                    mail
                  </span>
                </div>
                <input
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all text-sm"
                  id="email"
                  type="email"
                  placeholder="user@library.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider" htmlFor="password">
                  Password
                </label>
                <Link className="text-xs font-medium text-primary hover:text-primary/80 transition-colors" href="#">
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-500 group-focus-within:text-primary transition-colors text-[20px]">
                    lock
                  </span>
                </div>
                <input
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all text-sm"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              className="w-full h-10 mt-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg shadow-[0_0_15px_rgba(170,31,239,0.4)] hover:shadow-[0_0_20px_rgba(170,31,239,0.6)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-[10px] font-medium text-white/30 uppercase tracking-widest">
              Or continue with
            </span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <div className="grid grid-cols-1">
            <button
              className="flex items-center justify-center gap-3 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGoogleSignIn}
              disabled={loading}
              type="button"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                Google
              </span>
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-text-muted">
              New to Bookflix?{' '}
              <Link
                className="font-semibold text-white hover:text-primary transition-colors hover:underline decoration-primary decoration-2 underline-offset-4"
                href="/register"
              >
                Join Bookflix
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-white/20">
            © 2024 Bookflix Library Services. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}

