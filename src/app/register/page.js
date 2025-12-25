'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LOCATION_DATA } from '@/lib/locationData';
import { getRoleOverviewRoute } from '@/lib/utils';
import Loader from '@/components/Loader';
import { isValidEmail, validatePassword, isValidPhone, validateForm } from '@/lib/validation';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    division: '',
    city: '',
    area: '',
    landmark: '',
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const fileInputRef = useRef(null);
  const { signUp, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const completeRegistration = searchParams.get('complete') === 'true';

  // If user is already logged in and completing registration
  useEffect(() => {
    if (completeRegistration && user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        name: user.displayName || '',
      }));
      // Set Google profile photo if available
      if (user.photoURL && !profilePhotoUrl) {
        setProfilePhotoUrl(user.photoURL);
      }
    }
  }, [completeRegistration, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle cascading dropdowns
    if (name === 'division') {
      setFormData(prev => ({
        ...prev,
        division: value,
        city: '', // Reset city when division changes
        area: '', // Reset area when division changes
      }));
    } else if (name === 'city') {
      setFormData(prev => ({
        ...prev,
        city: value,
        area: '', // Reset area when city changes
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Get available cities based on selected division
  const getAvailableCities = () => {
    if (!formData.division || !LOCATION_DATA[formData.division]) {
      return [];
    }
    return Object.keys(LOCATION_DATA[formData.division]);
  };

  // Get available areas based on selected division and city
  const getAvailableAreas = () => {
    if (!formData.division || !formData.city || !LOCATION_DATA[formData.division]) {
      return [];
    }
    return LOCATION_DATA[formData.division][formData.city] || [];
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setProfilePhoto(file);
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setProfilePhotoUrl(data.url);
    } catch (error) {
      setError('Failed to upload image. Please try again.');
      setProfilePhoto(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!termsAccepted) {
      setError('Please accept the Terms & Conditions and Privacy Policy');
      return;
    }

    // Client-side validation
    const validationRules = {
      name: { required: true, label: 'Name', minLength: 2 },
      email: { required: true, label: 'Email', email: true },
      password: { required: true, label: 'Password', password: true },
      phone: { required: false, label: 'Phone', custom: (value) => {
        if (value && !isValidPhone(value)) {
          return { isValid: false, message: 'Please enter a valid phone number' };
        }
        return { isValid: true };
      }},
      division: { required: true, label: 'Division' },
      city: { required: true, label: 'City' },
      area: { required: true, label: 'Area' },
    };

    const validation = validateForm(formData, validationRules);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setError('Please fix the errors below');
      return;
    }

    setLoading(true);

    try {
      let firebaseUser;
      
      if (completeRegistration && user) {
        // User already authenticated via Google, just save to MongoDB
        firebaseUser = user;
      } else {
        // Additional validation
        if (!formData.email || !formData.email.trim()) {
          setError('Email is required.');
          setLoading(false);
          return;
        }

        if (!formData.password || !formData.password.trim()) {
          setError('Password is required.');
          setLoading(false);
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          setError('Please enter a valid email address.');
          setLoading(false);
          return;
        }

        // Validate password before attempting signup
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        // Create Firebase account
        try {
          const result = await signUp(formData.email.trim(), formData.password, formData.name?.trim());
          if (!result.success) {
            // Check if email is already in use
            if (result.code === 'auth/email-already-in-use' || 
                result.error?.includes('email-already-in-use') || 
                result.error?.includes('already in use') || 
                result.error?.includes('already registered') ||
                result.error?.includes('EMAIL_EXISTS')) {
              setError('already_registered');
            } else {
              // Display the user-friendly error message
              setError(result.error || 'Failed to create account. Please check your email and password.');
            }
            setLoading(false);
            return;
          }
          firebaseUser = result.user;
        } catch (signupError) {
          console.error('Signup error:', signupError);
          setError(signupError.message || 'Failed to create account. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Save user to MongoDB
      const userData = {
        firebaseUid: firebaseUser.uid,
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        profilePhoto: profilePhotoUrl || firebaseUser.photoURL || null, // Use Google photo if available
        address: {
          division: formData.division,
          city: formData.city,
          area: formData.area,
          landmark: formData.landmark,
        },
      };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if user already exists
        if (response.status === 409 || errorData.error === 'User already exists') {
          setError('already_registered');
          setLoading(false);
          return;
        }
        
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to create user profile';
        throw new Error(errorMessage);
      }

      // Fetch user data to get role for navigation
      const userResponse = await fetch(`/api/users?firebaseUid=${firebaseUser.uid}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        const role = userData.role || 'member';
        router.push(getRoleOverviewRoute(role));
      } else {
        // Fallback to dashboard if user data fetch fails
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    const result = await signInWithGoogle();
    
    if (result.success) {
      // Check if user exists in MongoDB
      try {
        const response = await fetch(`/api/users?firebaseUid=${result.user.uid}`);
        if (response.ok) {
          router.push('/dashboard');
        } else {
          // Redirect to complete registration
          router.push('/register?complete=true');
        }
      } catch (error) {
        router.push('/register?complete=true');
      }
    } else {
      setError(result.error || 'Failed to sign up with Google');
    }
    
    setLoading(false);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-white relative min-h-screen flex flex-col overflow-x-hidden selection:bg-primary selection:text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-40 mix-blend-screen"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[600px] h-[600px] bg-purple-50/40 rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <div className="layout-container flex grow flex-col items-center justify-center p-4 py-12 md:py-16">
        <div className="relative w-full max-w-[900px] flex flex-col rounded-2xl border border-border-dark bg-purple-300/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Close Button */}
          <Link
            href="/"
            className="absolute top-4 right-4 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-card-dark/50 hover:bg-card-dark border border-border-dark hover:border-primary/50 text-text-muted hover:text-white transition-all cursor-pointer"
            aria-label="Close and go to home"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              close
            </span>
          </Link>
          
          {/* Header */}
          <div className="flex flex-col items-center justify-center pt-10 pb-6 px-6 text-center z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_stories
              </span>
              <h1 className="text-3xl font-black tracking-tight text-white">Bookflix</h1>
            </div>
            <p className="text-white tracking-tight text-2xl md:text-3xl font-bold leading-tight">
              Start your reading journey
            </p>
            <p className="text-text-muted text-sm font-normal leading-normal mt-2">
              Join the world's largest digital library today.
            </p>
          </div>

          {/* Form */}
          <div className="layout-content-container flex flex-col w-full p-6 md:p-10 md:pt-2">
            {error && (
              <div className={`${error === 'already_registered' ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' : 'bg-red-500/20 border-red-500/50 text-red-200'} px-4 py-3 rounded-lg text-sm mb-4 flex items-start gap-2`}>
                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '20px' }}>
                  {error === 'already_registered' ? 'info' : 'error'}
                </span>
                <div className="flex-1">
                  {error === 'already_registered' ? (
                    <span>
                      You are already registered. Please{' '}
                      <Link className="text-primary hover:text-white font-medium transition-colors underline" href="/login">
                        login
                      </Link>
                      {' '}instead.
                    </span>
                  ) : (
                    <span>{error}</span>
                  )}
                </div>
              </div>
            )}

            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              {/* Profile Photo */}
              <div className="flex items-center gap-5 p-4 rounded-xl bg-card-dark/30 border border-border-dark/30">
                <div className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 rounded-full border border-border-dark bg-card-dark flex items-center justify-center overflow-hidden">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-text-muted text-3xl md:text-4xl">person</span>
                  )}
                </div>
                <div className="flex flex-col flex-1 gap-1.5">
                  <label className="text-white text-sm font-medium ml-1">Profile Photo</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 px-4 h-10 bg-card-dark hover:bg-border-dark/50 border border-border-dark hover:border-primary/50 rounded-lg cursor-pointer transition-colors text-sm text-white font-medium group disabled:opacity-50 disabled:cursor-not-allowed">
                      <span className="material-symbols-outlined text-primary group-hover:text-white transition-colors" style={{ fontSize: '20px' }}>
                        cloud_upload
                      </span>
                      <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                      <input
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        type="file"
                        onChange={handlePhotoChange}
                        disabled={uploading || loading}
                      />
                    </label>
                    <span className="text-xs text-text-muted">Max 5MB.</span>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="flex flex-col flex-1">
                  <p className="text-white text-sm font-medium leading-normal pb-2 ml-1">Full Name</p>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border border-border-dark bg-card-dark focus:border-primary h-12 placeholder:text-text-muted px-4 py-3 text-base font-normal leading-normal transition-colors"
                    placeholder="John Doe"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={loading || completeRegistration}
                  />
                </label>

                <label className="flex flex-col flex-1">
                  <p className="text-white text-sm font-medium leading-normal pb-2 ml-1">Phone Number</p>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border border-border-dark bg-card-dark focus:border-primary h-12 placeholder:text-text-muted px-4 py-3 text-base font-normal leading-normal transition-colors"
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </label>

                <label className="flex flex-col flex-1">
                  <p className="text-white text-sm font-medium leading-normal pb-2 ml-1">Email Address</p>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border border-border-dark bg-card-dark focus:border-primary h-12 placeholder:text-text-muted px-4 py-3 text-base font-normal leading-normal transition-colors"
                    placeholder="you@example.com"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={loading || completeRegistration}
                  />
                </label>

                {!completeRegistration && (
                  <label className="flex flex-col flex-1">
                    <p className="text-white text-sm font-medium leading-normal pb-2 ml-1">Password</p>
                    <div className="flex w-full flex-1 items-stretch rounded-lg relative group">
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border border-border-dark bg-card-dark focus:border-primary h-12 placeholder:text-text-muted px-4 py-3 pr-12 text-base font-normal leading-normal transition-colors"
                        placeholder="••••••••"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        minLength={6}
                        disabled={loading}
                      />
                      <div
                        className="absolute right-0 top-0 h-full flex items-center pr-4 text-text-muted cursor-pointer hover:text-white transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </div>
                    </div>
                    {formData.password && formData.password.length < 6 && (
                      <p className="text-xs text-red-400 mt-1 ml-1">Password must be at least 6 characters</p>
                    )}
                  </label>
                )}

                <label className="flex flex-col flex-1">
                  <p className="text-white text-sm font-medium leading-normal pb-2 ml-1">Division</p>
                  <select
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border border-border-dark bg-card-dark focus:border-primary h-12 placeholder:text-text-muted px-4 py-3 text-base font-normal leading-normal transition-colors cursor-pointer"
                    name="division"
                    value={formData.division}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="" className="bg-card-dark text-white">Select Division</option>
                    {Object.keys(LOCATION_DATA).map((division) => (
                      <option key={division} value={division} className="bg-card-dark text-white">
                        {division}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col flex-1">
                  <p className="text-white text-sm font-medium leading-normal pb-2 ml-1">City</p>
                  <select
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border border-border-dark bg-card-dark focus:border-primary h-12 placeholder:text-text-muted px-4 py-3 text-base font-normal leading-normal transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    disabled={loading || !formData.division}
                  >
                    <option value="" className="bg-card-dark text-white">Select City</option>
                    {getAvailableCities().map((city) => (
                      <option key={city} value={city} className="bg-card-dark text-white">
                        {city}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col flex-1">
                  <p className="text-white text-sm font-medium leading-normal pb-2 ml-1">Area</p>
                  <select
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border border-border-dark bg-card-dark focus:border-primary h-12 placeholder:text-text-muted px-4 py-3 text-base font-normal leading-normal transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    name="area"
                    value={formData.area}
                    onChange={handleInputChange}
                    disabled={loading || !formData.city}
                  >
                    <option value="" className="bg-card-dark text-white">Select Area</option>
                    {getAvailableAreas().map((area) => (
                      <option key={area} value={area} className="bg-card-dark text-white">
                        {area}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col flex-1">
                  <p className="text-white text-sm font-medium leading-normal pb-2 ml-1">Landmark</p>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border border-border-dark bg-card-dark focus:border-primary h-12 placeholder:text-text-muted px-4 py-3 text-base font-normal leading-normal transition-colors"
                    placeholder="Near Public Library"
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </label>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-center gap-3 px-1 mt-2">
                <input
                  className="w-5 h-5 rounded border-border-dark bg-card-dark text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer transition-all"
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={loading}
                />
                <label className="text-sm text-text-muted select-none cursor-pointer" htmlFor="terms">
                  I agree to the{' '}
                  <Link className="text-primary hover:text-white transition-colors hover:underline" href="#">
                    Terms & Conditions
                  </Link>{' '}
                  and{' '}
                  <Link className="text-primary hover:text-white transition-colors hover:underline" href="#">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col items-center gap-4 mt-2">
                <button
                  className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 bg-primary hover:bg-primary-hover transition-colors text-white text-base font-bold leading-normal tracking-wide shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading || uploading}
                >
                  {loading ? <Loader /> : 'Join Bookflix'}
                </button>

                {!completeRegistration && (
                  <button
                    className="relative flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl h-14 bg-card-dark border border-border-dark hover:bg-purple-100 hover:border-primary/30 transition-all duration-200 text-white text-base font-medium leading-normal disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    onClick={handleGoogleSignUp}
                    disabled={loading || uploading}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                    <span>Sign up with Google</span>
                  </button>
                )}

                <p className="text-text-muted text-sm font-normal">
                  Already have an account?{' '}
                  <Link className="text-primary hover:text-white font-medium transition-colors ml-1" href="/login">
                    Sign In instead
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-600 dark:text-gray-500">© 2024 Bookflix Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

