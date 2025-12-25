'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user data from MongoDB
        try {
          const response = await fetch(`/api/users?firebaseUid=${firebaseUser.uid}`);
          if (response.ok) {
            const data = await response.json();
            // If userData doesn't have profilePhoto but Firebase user has photoURL, update it
            if (!data.profilePhoto && firebaseUser.photoURL) {
              // Update user profile photo in MongoDB
              try {
                const updateResponse = await fetch(`/api/users/${firebaseUser.uid}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ profilePhoto: firebaseUser.photoURL }),
                });
                if (updateResponse.ok) {
                  data.profilePhoto = firebaseUser.photoURL;
                }
              } catch (error) {
                console.error('Error updating profile photo:', error);
              }
            }
            // Ensure profilePhoto is set from Firebase if MongoDB doesn't have it
            if (!data.profilePhoto && firebaseUser.photoURL) {
              data.profilePhoto = firebaseUser.photoURL;
            }
            setUserData(data);
          } else {
            // User doesn't exist in MongoDB yet - create userData from Firebase
            const fallbackData = {
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email,
            };
            if (firebaseUser.photoURL) {
              fallbackData.profilePhoto = firebaseUser.photoURL;
            }
            setUserData(fallbackData);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fallback to Firebase user data if MongoDB fetch fails
          const fallbackData = {
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email,
          };
          if (firebaseUser.photoURL) {
            fallbackData.profilePhoto = firebaseUser.photoURL;
          }
          setUserData(fallbackData);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email, password, displayName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserData(null);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    setUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

