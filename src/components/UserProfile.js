'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getRoleOverviewRoute } from '@/lib/utils';

export default function UserProfile() {
  const { user, userData, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    router.push('/');
  };

  if (!user) return null;

  const displayName = userData?.name || user?.displayName || user?.email?.split('@')[0] || 'User';
  // Prioritize userData profilePhoto, but fallback to Firebase photoURL
  const profilePhoto = userData?.profilePhoto || user?.photoURL || null;
  
  // Debug logging (remove in production)
  useEffect(() => {
    if (user) {
      console.log('UserProfile Debug:', {
        hasUserData: !!userData,
        userDataPhoto: userData?.profilePhoto,
        firebasePhotoURL: user?.photoURL,
        finalPhoto: profilePhoto,
        imageError,
        willShowImage: profilePhoto && !imageError,
      });
    }
  }, [user, userData, profilePhoto, imageError]);
  
  // Reset image error when profile photo changes
  useEffect(() => {
    setImageError(false);
  }, [profilePhoto]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
        type="button"
      >
        <div className="relative w-10 h-10 shrink-0">
          {profilePhoto && !imageError ? (
            <img
              src={profilePhoto}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover border-2 border-primary/50"
              style={{ 
                display: 'block', 
                visibility: 'visible', 
                opacity: 1,
                width: '40px',
                height: '40px',
                flexShrink: 0
              }}
              onError={(e) => {
                console.error('Image load error:', profilePhoto, e);
                setImageError(true);
              }}
              onLoad={(e) => {
                const img = e.target;
                const computed = window.getComputedStyle(img);
                console.log('Image loaded successfully:', profilePhoto);
                console.log('Image dimensions:', img.width, 'x', img.height);
                console.log('Image display:', computed.display);
                console.log('Image visibility:', computed.visibility);
                console.log('Image opacity:', computed.opacity);
                console.log('Image position:', computed.position);
                console.log('Image z-index:', computed.zIndex);
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">person</span>
            </div>
          )}
        </div>
        <span className="text-white font-medium text-sm hidden md:block">{displayName}</span>
        <span className="material-symbols-outlined text-white/60 text-lg">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-dark border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden z-50">
          <div className="p-4 border-b border-white/10">
            <p className="text-white font-semibold text-sm truncate">{displayName}</p>
            <p className="text-gray-400 text-xs truncate mt-1">{userData?.email || user?.email}</p>
          </div>
          <div className="py-2">
            <Link
              href={getRoleOverviewRoute(userData?.role || 'member')}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">dashboard</span>
              Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

