'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  
  // Determine member status
  const isPremiumMember = userData?.subscription?.type && 
    ['monthly', 'yearly'].includes(userData.subscription.type) && 
    userData.subscription.status === 'active';
  const memberStatus = isPremiumMember ? 'Premium Member' : 'General Member';
  
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
        <span className="text-white font-medium text-sm">{displayName}</span>
        <span className="material-symbols-outlined text-white/60 text-lg">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-gradient-to-b from-surface-dark to-black/90 border border-white/20 shadow-2xl backdrop-blur-xl overflow-hidden z-50 transition-all duration-200 opacity-100">
          {/* Header Section with Profile */}
          <div className="relative p-5 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {profilePhoto && !imageError ? (
                  <img
                    src={profilePhoto}
                    alt={displayName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-primary/60 shadow-lg shadow-primary/30"
                    onError={(e) => {
                      console.error('Image load error:', profilePhoto, e);
                      setImageError(true);
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border-2 border-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                    <span className="material-symbols-outlined text-primary text-2xl">person</span>
                  </div>
                )}
                {isPremiumMember && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary border-2 border-surface-dark flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-xs">star</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{displayName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isPremiumMember 
                      ? 'bg-primary/20 text-primary border border-primary/40' 
                      : 'bg-white/10 text-gray-300 border border-white/20'
                  }`}>
                    {isPremiumMember && (
                      <span className="material-symbols-outlined text-xs">diamond</span>
                    )}
                    {memberStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="group w-full flex items-center gap-3 px-5 py-3 text-sm text-white hover:bg-gradient-to-r hover:from-primary/20 hover:to-transparent transition-all duration-200 text-left border-l-2 border-transparent hover:border-primary"
            >
              <span className="material-symbols-outlined text-lg text-gray-400 group-hover:text-primary transition-colors">dashboard</span>
              <span className="font-medium">Dashboard</span>
              <span className="ml-auto material-symbols-outlined text-xs text-gray-500 group-hover:text-primary transition-colors">chevron_right</span>
            </Link>
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-1"></div>
            <button
              onClick={handleSignOut}
              className="group w-full flex items-center gap-3 px-5 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-all duration-200 text-left border-l-2 border-transparent hover:border-red-500/50"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

