'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
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
          const response = await fetch(`/api/users?firebaseUid=${encodeURIComponent(firebaseUser.uid)}`);
          
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
                console.error('[AuthContext] Error updating profile photo:', error);
              }
            }
            // Ensure profilePhoto is set from Firebase if MongoDB doesn't have it
            if (!data.profilePhoto && firebaseUser.photoURL) {
              data.profilePhoto = firebaseUser.photoURL;
            }
            setUserData(data);
          } else if (response.status === 404) {
            // User doesn't exist in MongoDB yet - this is expected for new logins
            // The login handler will create the user, so we just use fallback data here
            const fallbackData = {
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email,
            };
            if (firebaseUser.photoURL) {
              fallbackData.profilePhoto = firebaseUser.photoURL;
            }
            setUserData(fallbackData);
          } else {
            // Other error
            console.error('[AuthContext] Error fetching user data, status:', response.status);
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
          console.error('[AuthContext] Error fetching user data:', error);
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
      // Log full error for debugging
      console.error('Firebase signin error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Provide user-friendly error messages based on error code
      let errorMessage = 'Failed to sign in. Please try again.';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
          case 'auth/user-not-found':
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password sign-in is not enabled. Please contact support.';
            break;
          case 'auth/invalid-api-key':
            errorMessage = 'Authentication service error. Please contact support.';
            break;
          default:
            // For other errors, try to extract meaningful message
            if (error.message) {
              if (error.message.includes('INVALID_LOGIN_CREDENTIALS')) {
                errorMessage = 'Invalid email or password. Please check your credentials and try again.';
              } else if (error.message.includes('EMAIL_NOT_FOUND')) {
                errorMessage = 'No account found with this email address. Please sign up instead.';
              } else if (error.message.includes('INVALID_PASSWORD')) {
                errorMessage = 'Invalid password. Please try again or reset your password.';
              } else {
                errorMessage = `Sign in failed: ${error.message}`;
              }
            }
        }
      } else if (error.message) {
        // Fallback to error message if no code
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage, code: error.code || 'unknown' };
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
      // Log full error for debugging
      console.error('Firebase signup error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Provide user-friendly error messages based on error code
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Please sign in instead.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password should be at least 6 characters long.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password accounts are not enabled. Please contact support.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          case 'auth/invalid-api-key':
            errorMessage = 'Authentication service error. Please contact support.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many requests. Please try again later.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            break;
          default:
            // For 400 Bad Request or other errors, try to extract meaningful message
            if (error.message) {
              if (error.message.includes('EMAIL_EXISTS')) {
                errorMessage = 'This email is already registered. Please sign in instead.';
              } else if (error.message.includes('INVALID_EMAIL')) {
                errorMessage = 'Please enter a valid email address.';
              } else if (error.message.includes('WEAK_PASSWORD')) {
                errorMessage = 'Password should be at least 6 characters long.';
              } else if (error.message.includes('MISSING_PASSWORD')) {
                errorMessage = 'Password is required.';
              } else if (error.message.includes('MISSING_EMAIL')) {
                errorMessage = 'Email is required.';
              } else {
                errorMessage = `Registration failed: ${error.message}`;
              }
            }
        }
      } else if (error.message) {
        // Fallback to error message if no code
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage, code: error.code || 'unknown' };
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

  const changePassword = async (currentPassword, newPassword) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
      let errorMessage = 'Failed to change password. Please try again.';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/wrong-password':
            errorMessage = 'Current password is incorrect.';
            break;
          case 'auth/weak-password':
            errorMessage = 'New password should be at least 6 characters long.';
            break;
          case 'auth/requires-recent-login':
            errorMessage = 'For security, please log out and log back in before changing your password.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage, code: error.code || 'unknown' };
    }
  };

  // Function to refresh user data from MongoDB
  const refreshUserData = async () => {
    if (!user) {
      console.warn('[AuthContext] Cannot refresh user data: no user authenticated');
      return { success: false, error: 'No user authenticated' };
    }

    try {
      const response = await fetch(`/api/users?firebaseUid=${encodeURIComponent(user.uid)}`);
      
      if (response.ok) {
        const data = await response.json();
        // If userData doesn't have profilePhoto but Firebase user has photoURL, update it
        if (!data.profilePhoto && user.photoURL) {
          // Update user profile photo in MongoDB
          try {
            const updateResponse = await fetch(`/api/users/${user.uid}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ profilePhoto: user.photoURL }),
            });
            if (updateResponse.ok) {
              data.profilePhoto = user.photoURL;
            }
          } catch (error) {
            console.error('[AuthContext] Error updating profile photo:', error);
          }
        }
        // Ensure profilePhoto is set from Firebase if MongoDB doesn't have it
        if (!data.profilePhoto && user.photoURL) {
          data.profilePhoto = user.photoURL;
        }
        setUserData(data);
        return { success: true, data };
      } else {
        console.error('[AuthContext] Error refreshing user data, status:', response.status);
        return { success: false, error: `Failed to refresh user data: ${response.status}` };
      }
    } catch (error) {
      console.error('[AuthContext] Error refreshing user data:', error);
      return { success: false, error: error.message || 'Failed to refresh user data' };
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
    changePassword,
    setUserData,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

