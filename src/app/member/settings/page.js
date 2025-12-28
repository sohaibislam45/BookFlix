'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LOCATION_DATA } from '@/lib/locationData';
import { validateForm, isValidPhone, validatePassword } from '@/lib/validation';
import { showSuccess, showError, showConfirm, showToast } from '@/lib/swal';
import OptimizedImage from '@/components/OptimizedImage';
import Loader from '@/components/Loader';

export default function MemberSettingsPage() {
  const { userData, user, changePassword, setUserData } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    division: '',
    city: '',
    area: '',
    landmark: '',
  });
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);
  const [profileErrors, setProfileErrors] = useState({});

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  // Subscription state
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Initialize form data from userData
  useEffect(() => {
    if (userData) {
      setProfileForm({
        name: userData.name || '',
        phone: userData.phone || '',
        division: userData.address?.division || '',
        city: userData.address?.city || '',
        area: userData.address?.area || '',
        landmark: userData.address?.landmark || '',
      });
      setProfilePhotoUrl(userData.profilePhoto || null);
    }
  }, [userData]);

  // Fetch subscription data
  useEffect(() => {
    if (userData?._id) {
      fetchSubscription();
    }
  }, [userData]);

  const fetchSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      const response = await fetch(`/api/subscriptions?userId=${userData._id}`);
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Get available cities based on selected division
  const getAvailableCities = () => {
    if (!profileForm.division || !LOCATION_DATA[profileForm.division]) {
      return [];
    }
    return Object.keys(LOCATION_DATA[profileForm.division]);
  };

  // Get available areas based on selected division and city
  const getAvailableAreas = () => {
    if (!profileForm.division || !profileForm.city || !LOCATION_DATA[profileForm.division]) {
      return [];
    }
    return LOCATION_DATA[profileForm.division][profileForm.city] || [];
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle cascading dropdowns
    if (name === 'division') {
      setProfileForm(prev => ({
        ...prev,
        division: value,
        city: '',
        area: '',
      }));
    } else if (name === 'city') {
      setProfileForm(prev => ({
        ...prev,
        city: value,
        area: '',
      }));
    } else {
      setProfileForm(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    // Clear error for this field
    if (profileErrors[name]) {
      setProfileErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('Image Upload Failed', 'Image size must be less than 5MB');
      return;
    }

    setUploading(true);

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
      showToast('Profile photo uploaded successfully', 'success');
    } catch (error) {
      showError('Upload Failed', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileErrors({});
    setLoading(true);

    // Validation
    const validationRules = {
      name: { required: true, label: 'Name', minLength: 2 },
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

    const validation = validateForm(profileForm, validationRules);
    if (!validation.isValid) {
      setProfileErrors(validation.errors);
      setLoading(false);
      return;
    }

    try {
      const updateData = {
        name: profileForm.name.trim(),
        phone: profileForm.phone?.trim() || '',
        profilePhoto: profilePhotoUrl,
        address: {
          division: profileForm.division,
          city: profileForm.city,
          area: profileForm.area,
          landmark: profileForm.landmark?.trim() || '',
        },
      };

      const response = await fetch(`/api/users/${user.uid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const data = await response.json();
      setUserData(data.user);
      showSuccess('Profile Updated', 'Your profile has been updated successfully.');
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Update Failed', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (passwordErrors[name]) {
      setPasswordErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrors({});
    setLoading(true);

    // Validation
    const errors = {};
    
    if (!passwordForm.currentPassword) {
      errors.currentPassword = ['Current password is required'];
    }

    const newPasswordValidation = validatePassword(passwordForm.newPassword);
    if (!newPasswordValidation.isValid) {
      errors.newPassword = [newPasswordValidation.message];
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = ['Passwords do not match'];
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = ['New password must be different from current password'];
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      if (result.success) {
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        showSuccess('Password Changed', 'Your password has been changed successfully.');
      } else {
        showError('Password Change Failed', result.error || 'Failed to change password. Please try again.');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showError('Password Change Failed', 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeSubscription = async (plan) => {
    try {
      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData._id,
          plan: plan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      showError('Subscription Error', error.message || 'Failed to start subscription upgrade. Please try again.');
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = await showConfirm(
      'Cancel Subscription',
      'Are you sure you want to cancel your premium subscription? You will lose access to premium features at the end of your billing period.',
      {
        confirmButtonText: 'Yes, Cancel',
        cancelButtonText: 'Keep Subscription',
      }
    );

    if (!confirmed.isConfirmed) return;

    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData._id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      await fetchSubscription();
      showSuccess('Subscription Cancelled', 'Your subscription will remain active until the end of the current billing period.');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      showError('Cancellation Failed', error.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData._id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reactivate subscription');
      }

      await fetchSubscription();
      showSuccess('Subscription Reactivated', 'Your premium subscription has been reactivated.');
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      showError('Reactivation Failed', error.message || 'Failed to reactivate subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isPremium = subscription?.type === 'monthly' || subscription?.type === 'yearly';
  const subscriptionStatus = subscription?.status || 'active';

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'person' },
    { id: 'security', label: 'Security', icon: 'lock' },
    { id: 'subscription', label: 'Subscription', icon: 'stars' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-20 scroll-smooth">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Settings</h2>
          <p className="text-text-secondary text-sm md:text-base">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#3c2348]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
              )}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-6">
            <div className="bg-surface-dark rounded-2xl border border-[#3c2348] p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Profile Information
              </h3>

              {/* Profile Photo */}
              <div className="flex items-center gap-5 p-4 rounded-xl bg-[#1c1022] border border-[#3c2348] mb-6">
                <div className="relative h-20 w-20 md:h-24 md:w-24 shrink-0 rounded-full border border-[#3c2348] bg-[#1c1022] flex items-center justify-center overflow-hidden">
                  {profilePhotoUrl ? (
                    <OptimizedImage
                      src={profilePhotoUrl}
                      alt="Profile"
                      width={96}
                      height={96}
                      className="rounded-full"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-text-secondary text-4xl">person</span>
                  )}
                </div>
                <div className="flex flex-col flex-1 gap-2">
                  <label className="text-white text-sm font-medium">Profile Photo</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 px-4 h-10 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary text-primary hover:text-white rounded-lg cursor-pointer transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        cloud_upload
                      </span>
                      <span>{uploading ? 'Uploading...' : 'Change Photo'}</span>
                      <input
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        type="file"
                        onChange={handlePhotoChange}
                        disabled={uploading || loading}
                      />
                    </label>
                    <span className="text-xs text-text-secondary">Max 5MB. JPG, PNG</span>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="flex flex-col">
                  <span className="text-white text-sm font-medium mb-2">Full Name *</span>
                  <input
                    className="form-input flex w-full rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#3c2348] bg-[#1c1022] focus:border-primary h-12 placeholder:text-text-secondary px-4 py-3 text-base transition-colors"
                    placeholder="John Doe"
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileInputChange}
                    disabled={loading}
                  />
                  {profileErrors.name && (
                    <span className="text-red-400 text-xs mt-1">{profileErrors.name[0]}</span>
                  )}
                </label>

                <label className="flex flex-col">
                  <span className="text-white text-sm font-medium mb-2">Email</span>
                  <input
                    className="flex w-full rounded-lg text-text-secondary border border-[#3c2348] bg-[#1c1022] h-12 px-4 py-3 text-base cursor-not-allowed opacity-50"
                    type="email"
                    value={userData?.email || ''}
                    disabled
                  />
                  <span className="text-text-secondary text-xs mt-1">Email cannot be changed</span>
                </label>

                <label className="flex flex-col">
                  <span className="text-white text-sm font-medium mb-2">Phone Number</span>
                  <input
                    className="form-input flex w-full rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#3c2348] bg-[#1c1022] focus:border-primary h-12 placeholder:text-text-secondary px-4 py-3 text-base transition-colors"
                    placeholder="+880 1234 567890"
                    type="tel"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileInputChange}
                    disabled={loading}
                  />
                  {profileErrors.phone && (
                    <span className="text-red-400 text-xs mt-1">{profileErrors.phone[0]}</span>
                  )}
                </label>

                <label className="flex flex-col">
                  <span className="text-white text-sm font-medium mb-2">Division *</span>
                  <select
                    className="form-input flex w-full rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#3c2348] bg-[#1c1022] focus:border-primary h-12 px-4 py-3 text-base transition-colors cursor-pointer"
                    name="division"
                    value={profileForm.division}
                    onChange={handleProfileInputChange}
                    disabled={loading}
                  >
                    <option value="" className="bg-[#1c1022] text-white">Select Division</option>
                    {Object.keys(LOCATION_DATA).map((division) => (
                      <option key={division} value={division} className="bg-[#1c1022] text-white">
                        {division}
                      </option>
                    ))}
                  </select>
                  {profileErrors.division && (
                    <span className="text-red-400 text-xs mt-1">{profileErrors.division[0]}</span>
                  )}
                </label>

                <label className="flex flex-col">
                  <span className="text-white text-sm font-medium mb-2">City *</span>
                  <select
                    className="form-input flex w-full rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#3c2348] bg-[#1c1022] focus:border-primary h-12 px-4 py-3 text-base transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    name="city"
                    value={profileForm.city}
                    onChange={handleProfileInputChange}
                    disabled={loading || !profileForm.division}
                  >
                    <option value="" className="bg-[#1c1022] text-white">Select City</option>
                    {getAvailableCities().map((city) => (
                      <option key={city} value={city} className="bg-[#1c1022] text-white">
                        {city}
                      </option>
                    ))}
                  </select>
                  {profileErrors.city && (
                    <span className="text-red-400 text-xs mt-1">{profileErrors.city[0]}</span>
                  )}
                </label>

                <label className="flex flex-col">
                  <span className="text-white text-sm font-medium mb-2">Area *</span>
                  <select
                    className="form-input flex w-full rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#3c2348] bg-[#1c1022] focus:border-primary h-12 px-4 py-3 text-base transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    name="area"
                    value={profileForm.area}
                    onChange={handleProfileInputChange}
                    disabled={loading || !profileForm.city}
                  >
                    <option value="" className="bg-[#1c1022] text-white">Select Area</option>
                    {getAvailableAreas().map((area) => (
                      <option key={area} value={area} className="bg-[#1c1022] text-white">
                        {area}
                      </option>
                    ))}
                  </select>
                  {profileErrors.area && (
                    <span className="text-red-400 text-xs mt-1">{profileErrors.area[0]}</span>
                  )}
                </label>

                <label className="flex flex-col md:col-span-2">
                  <span className="text-white text-sm font-medium mb-2">Landmark</span>
                  <input
                    className="form-input flex w-full rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#3c2348] bg-[#1c1022] focus:border-primary h-12 placeholder:text-text-secondary px-4 py-3 text-base transition-colors"
                    placeholder="Near Public Library"
                    type="text"
                    name="landmark"
                    value={profileForm.landmark}
                    onChange={handleProfileInputChange}
                    disabled={loading}
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={loading || uploading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>
                        sync
                      </span>
                      <span>Saving...</span>
                    </span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        save
                      </span>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-6">
            <div className="bg-surface-dark rounded-2xl border border-[#3c2348] p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">lock</span>
                Change Password
              </h3>

              <div className="flex flex-col gap-5 max-w-md">
                <label className="flex flex-col">
                  <span className="text-white text-sm font-medium mb-2">Current Password *</span>
                  <div className="relative">
                    <input
                      className="form-input flex w-full rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#3c2348] bg-[#1c1022] focus:border-primary h-12 placeholder:text-text-secondary px-4 py-3 pr-12 text-base transition-colors"
                      placeholder="••••••••"
                      type={showPasswords.current ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordInputChange}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-full flex items-center pr-4 text-text-secondary hover:text-white transition-colors"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {showPasswords.current ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <span className="text-red-400 text-xs mt-1">{passwordErrors.currentPassword[0]}</span>
                  )}
                </label>

                <label className="flex flex-col">
                  <span className="text-white text-sm font-medium mb-2">New Password *</span>
                  <div className="relative">
                    <input
                      className="form-input flex w-full rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#3c2348] bg-[#1c1022] focus:border-primary h-12 placeholder:text-text-secondary px-4 py-3 pr-12 text-base transition-colors"
                      placeholder="••••••••"
                      type={showPasswords.new ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordInputChange}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-full flex items-center pr-4 text-text-secondary hover:text-white transition-colors"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {showPasswords.new ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <span className="text-red-400 text-xs mt-1">{passwordErrors.newPassword[0]}</span>
                  )}
                  <span className="text-text-secondary text-xs mt-1">Must be at least 6 characters</span>
                </label>

                <label className="flex flex-col">
                  <span className="text-white text-sm font-medium mb-2">Confirm New Password *</span>
                  <div className="relative">
                    <input
                      className="form-input flex w-full rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#3c2348] bg-[#1c1022] focus:border-primary h-12 placeholder:text-text-secondary px-4 py-3 pr-12 text-base transition-colors"
                      placeholder="••••••••"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordInputChange}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-full flex items-center pr-4 text-text-secondary hover:text-white transition-colors"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {showPasswords.confirm ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <span className="text-red-400 text-xs mt-1">{passwordErrors.confirmPassword[0]}</span>
                  )}
                </label>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>
                        sync
                      </span>
                      <span>Changing...</span>
                    </span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        lock_reset
                      </span>
                      <span>Change Password</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="flex flex-col gap-6">
            <div className="bg-surface-dark rounded-2xl border border-[#3c2348] p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">stars</span>
                Membership & Subscription
              </h3>

              {subscriptionLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader />
                </div>
              ) : (
                <>
                  {/* Current Membership Status */}
                  <div className="bg-[#1c1022] rounded-xl border border-[#3c2348] p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-white mb-1">
                          {isPremium ? 'Premium Member' : 'General Member'}
                        </h4>
                        <p className="text-text-secondary text-sm">
                          {isPremium 
                            ? subscription?.type === 'monthly' 
                              ? 'Monthly Premium Plan'
                              : 'Yearly Premium Plan'
                            : 'Free membership with basic features'
                          }
                        </p>
                      </div>
                      <div className={`px-4 py-2 rounded-lg font-bold text-sm ${
                        isPremium && subscriptionStatus === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {subscriptionStatus === 'active' ? 'Active' : subscriptionStatus || 'Active'}
                      </div>
                    </div>

                    {isPremium && subscription?.endDate && (
                      <p className="text-text-secondary text-sm">
                        {subscriptionStatus === 'cancelled' ? 'Expires' : 'Renews'} on{' '}
                        {new Date(subscription.endDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>

                  {/* Membership Benefits */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-[#1c1022] rounded-xl border border-[#3c2348] p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>
                          book
                        </span>
                        <span className="text-white font-bold">Borrowing Limit</span>
                      </div>
                      <p className="text-text-secondary text-sm">
                        {isPremium ? '4 books' : '1 book'} at once
                      </p>
                    </div>

                    <div className="bg-[#1c1022] rounded-xl border border-[#3c2348] p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>
                          event
                        </span>
                        <span className="text-white font-bold">Borrowing Period</span>
                      </div>
                      <p className="text-text-secondary text-sm">
                        {isPremium ? '20 days' : '7 days'} per book
                      </p>
                    </div>

                    <div className="bg-[#1c1022] rounded-xl border border-[#3c2348] p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>
                          attach_money
                        </span>
                        <span className="text-white font-bold">Late Fine Rate</span>
                      </div>
                      <p className="text-text-secondary text-sm">
                        {isPremium ? '15 BDT/day' : '30 BDT/day'}
                      </p>
                    </div>

                    <div className="bg-[#1c1022] rounded-xl border border-[#3c2348] p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>
                          star
                        </span>
                        <span className="text-white font-bold">Premium Features</span>
                      </div>
                      <p className="text-text-secondary text-sm">
                        {isPremium ? 'All features unlocked' : 'Limited features'}
                      </p>
                    </div>
                  </div>

                  {/* Subscription Actions */}
                  <div className="flex flex-col gap-4">
                    {!isPremium ? (
                      <div className="flex flex-col gap-4">
                        <p className="text-white font-medium">Upgrade to Premium</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button
                            onClick={() => handleUpgradeSubscription('monthly')}
                            className="bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary text-primary hover:text-white rounded-xl p-6 transition-all text-left flex flex-col gap-2"
                            disabled={loading}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-lg">Monthly Plan</span>
                              <span className="material-symbols-outlined text-primary">arrow_forward</span>
                            </div>
                            <p className="text-text-secondary text-sm">Best for regular readers</p>
                          </button>

                          <button
                            onClick={() => handleUpgradeSubscription('yearly')}
                            className="bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary text-primary hover:text-white rounded-xl p-6 transition-all text-left flex flex-col gap-2"
                            disabled={loading}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-lg">Yearly Plan</span>
                              <span className="material-symbols-outlined text-primary">arrow_forward</span>
                            </div>
                            <p className="text-text-secondary text-sm">Save more with annual subscription</p>
                          </button>
                        </div>
                      </div>
                    ) : subscriptionStatus === 'cancelled' ? (
                      <button
                        onClick={handleReactivateSubscription}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                      >
                        {loading ? 'Reactivating...' : 'Reactivate Subscription'}
                      </button>
                    ) : (
                      <button
                        onClick={handleCancelSubscription}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                      >
                        {loading ? 'Cancelling...' : 'Cancel Subscription'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
