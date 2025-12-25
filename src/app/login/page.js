'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleOverviewRoute } from '@/lib/utils';
import Loader from '@/components/Loader';

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

    try {
      const result = await signIn(email, password);
      
      if (result.success) {
        // Fetch user data to get role for navigation
        try {
          console.log('[Login] Fetching user from MongoDB with firebaseUid:', result.user.uid);
          let response = await fetch(`/api/users?firebaseUid=${result.user.uid}`);
          console.log('[Login] Response status:', response.status);
          
          // If user doesn't exist in MongoDB, create them automatically
          if (response.status === 404) {
            console.warn('[Login] User not found in MongoDB (404), creating user automatically...');
            console.log('[Login] Creating user with data:', {
              firebaseUid: result.user.uid,
              email: result.user.email,
              name: result.user.displayName || result.user.email?.split('@')[0] || 'User',
            });
            
            const createResponse = await fetch('/api/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                firebaseUid: result.user.uid,
                email: result.user.email?.toLowerCase().trim() || result.user.email,
                name: (result.user.displayName || result.user.email?.split('@')[0] || 'User').trim(),
                profilePhoto: result.user.photoURL || null,
                role: 'member',
                subscription: {
                  type: 'free',
                  status: 'active',
                },
              }),
            });
            
            console.log('[Login] Create user response status:', createResponse.status);
            
            if (createResponse.ok) {
              const newUserData = await createResponse.json();
              console.log('[Login] User data received:', newUserData);
              // API returns { message, user } structure
              // Handle both "created" (201) and "already exists" (200) cases
              const user = newUserData.user || newUserData;
              const role = user?.role || 'member';
              console.log('[Login] Navigating to role overview:', getRoleOverviewRoute(role));
              router.push(getRoleOverviewRoute(role));
            } else {
              // If creation fails, try to fetch user anyway
              const errorData = await createResponse.json().catch(() => ({}));
              console.error('[Login] Failed to create user in MongoDB');
              console.error('[Login] Error details:', errorData);
              
              // Try to fetch user as fallback
              console.log('[Login] Attempting to fetch user data as fallback...');
              const fetchResponse = await fetch(`/api/users?firebaseUid=${result.user.uid}`);
              if (fetchResponse.ok) {
                const userData = await fetchResponse.json();
                const role = userData.role || 'member';
                console.log('[Login] User found, navigating to role overview:', getRoleOverviewRoute(role));
                router.push(getRoleOverviewRoute(role));
              } else {
                console.log('[Login] Navigating to member overview as fallback');
                router.push('/member/overview');
              }
            }
          } else if (response.ok) {
            const userData = await response.json();
            console.log('[Login] User found in MongoDB:', { email: userData.email, role: userData.role });
            const role = userData.role || 'member';
            // Navigate to role-based overview page
            console.log('[Login] Navigating to role overview:', getRoleOverviewRoute(role));
            router.push(getRoleOverviewRoute(role));
          } else {
            // Other error - still navigate to member overview
            console.error('[Login] Error fetching user data, status:', response.status);
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('[Login] Error response:', errorText);
            router.push('/member/overview');
          }
        } catch (error) {
          console.error('[Login] Error fetching user data:', error);
          console.error('[Login] Error stack:', error.stack);
          // Fallback to member overview on error
          router.push('/member/overview');
        }
        // Don't set loading to false here - navigation will handle it
      } else {
        // Display the user-friendly error message from AuthContext
        setError(result.error || 'Failed to sign in. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithGoogle();
      
      if (result.success) {
        // Check if user exists in MongoDB, if not create them automatically
        try {
          console.log('[Google Login] Fetching user from MongoDB with firebaseUid:', result.user.uid);
          let response = await fetch(`/api/users?firebaseUid=${result.user.uid}`);
          console.log('[Google Login] Response status:', response.status);
          
          // If user doesn't exist in MongoDB, create them automatically
          if (response.status === 404) {
            console.warn('[Google Login] User not found in MongoDB (404), creating user automatically...');
            console.log('[Google Login] Creating user with data:', {
              firebaseUid: result.user.uid,
              email: result.user.email,
              name: result.user.displayName || result.user.email?.split('@')[0] || 'User',
            });
            
            const createResponse = await fetch('/api/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                firebaseUid: result.user.uid,
                email: result.user.email?.toLowerCase().trim() || result.user.email,
                name: (result.user.displayName || result.user.email?.split('@')[0] || 'User').trim(),
                profilePhoto: result.user.photoURL || null,
                role: 'member',
                subscription: {
                  type: 'free',
                  status: 'active',
                },
              }),
            });
            
            console.log('[Google Login] Create user response status:', createResponse.status);
            
            if (createResponse.ok) {
              const newUserData = await createResponse.json();
              console.log('[Google Login] User data received:', newUserData);
              // API returns { message, user } structure
              // Handle both "created" (201) and "already exists" (200) cases
              const user = newUserData.user || newUserData;
              const role = user?.role || 'member';
              console.log('[Google Login] Navigating to role overview:', getRoleOverviewRoute(role));
              router.push(getRoleOverviewRoute(role));
            } else {
              // Log the error details for debugging
              try {
                const errorData = await createResponse.json();
                console.error('[Google Login] User creation failed:', errorData);
              } catch (e) {
                console.error('[Google Login] User creation failed with status:', createResponse.status, 'Could not parse error response');
              }
              
              // If creation fails, try to fetch user anyway in case they exist
              // (user might have been created by another request or already exists)
              console.log('[Google Login] User creation returned non-OK status, checking if user exists...');
              const fetchResponse = await fetch(`/api/users?firebaseUid=${result.user.uid}`);
              if (fetchResponse.ok) {
                const userData = await fetchResponse.json();
                const role = userData.role || 'member';
                console.log('[Google Login] User found after creation failed, navigating to role overview:', getRoleOverviewRoute(role));
                router.push(getRoleOverviewRoute(role));
              } else {
                // If Firebase auth succeeded but user creation/lookup failed,
                // still redirect to member dashboard since user is authenticated
                // The user can complete their profile later if needed
                console.log('[Google Login] Firebase auth succeeded but user not in MongoDB. Redirecting to member dashboard.');
                router.push('/member/overview');
              }
            }
          } else if (response.ok) {
            // Fetch user data to get role for navigation
            const userData = await response.json();
            console.log('[Google Login] User found in MongoDB:', { email: userData.email, role: userData.role });
            const role = userData.role || 'member';
            console.log('[Google Login] Navigating to role overview:', getRoleOverviewRoute(role));
            router.push(getRoleOverviewRoute(role));
          } else {
            // Other error - if Firebase auth succeeded, redirect to dashboard anyway
            console.error('[Google Login] Error fetching user data, status:', response.status);
            // Since Firebase authentication succeeded, redirect to member dashboard
            // User can complete profile later if needed
            console.log('[Google Login] Firebase auth succeeded. Redirecting to member dashboard.');
            router.push('/member/overview');
          }
        } catch (error) {
          console.error('[Google Login] Error checking user:', error);
          // Since Firebase authentication succeeded, redirect to member dashboard
          // User can complete profile later if needed
          console.log('[Google Login] Firebase auth succeeded. Redirecting to member dashboard.');
          router.push('/member/overview');
        }
      } else {
        setError(result.error || 'Failed to sign in with Google');
        setLoading(false);
      }
    } catch (error) {
      console.error('[Google Login] Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
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
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '20px' }}>
                error
              </span>
              <span className="flex-1">{error}</span>
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
              {loading ? <Loader /> : 'Sign In'}
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
                Sign in with Google
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

