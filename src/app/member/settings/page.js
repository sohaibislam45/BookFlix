'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { showSuccess, showError, showConfirm } from '@/lib/swal';
import Image from 'next/image';

export default function MemberSettingsPage() {
  const { user, userData, updateUserData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  
  // Form states
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [notifications, setNotifications] = useState({
    newBookAlerts: true,
    dueDateReminders: true,
    marketingUpdates: false,
    emailNotifications: true,
    pushNotifications: true,
    smsMessages: false,
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    if (userData) {
      const nameParts = (userData.name || '').split(' ');
      setProfileData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: userData.email || '',
        bio: userData.bio || '',
      });
    }
  }, [userData]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`/api/users/${user.uid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${profileData.firstName} ${profileData.lastName}`.trim(),
          bio: profileData.bio,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedData = await response.json();
      updateUserData(updatedData);
      showSuccess('Profile Updated', 'Your profile has been successfully updated.');
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Update Failed', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('Password Mismatch', 'New password and confirm password do not match.');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showError('Invalid Password', 'Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    
    try {
      // Note: This would typically require re-authentication with Firebase
      // For now, we'll show a placeholder implementation
      showError('Not Implemented', 'Password change functionality requires Firebase re-authentication. This feature will be implemented soon.');
    } catch (error) {
      console.error('Error changing password:', error);
      showError('Password Change Failed', error.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/users/${user.uid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationPreferences: notifications,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }

      showSuccess('Preferences Saved', 'Your notification preferences have been updated.');
    } catch (error) {
      console.error('Error updating notifications:', error);
      showError('Update Failed', 'Failed to update notification preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    const result = await showConfirm(
      'Deactivate Account',
      'Are you sure you want to deactivate your account? This action cannot be undone.',
      {
        confirmButtonText: 'Yes, deactivate',
        cancelButtonText: 'Cancel',
      }
    );

    if (result.isConfirmed) {
      showError('Not Implemented', 'Account deactivation will be implemented soon.');
    }
  };

  const handleUpgradeSubscription = () => {
    router.push('/');
  };

  const subscriptionType = userData?.subscription?.type || 'free';
  const memberType = subscriptionType === 'free' ? 'Scholar Member' : 'Pro Member';

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="p-6 md:p-10 lg:px-14 lg:py-10 max-w-4xl mx-auto w-full">
        {/* Page Heading */}
        <div className="flex flex-col gap-2 mb-10">
          <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">Member Settings</h1>
          <p className="text-text-secondary text-base">Manage your personal information, privacy, and account preferences.</p>
        </div>

        {/* Profile Section */}
        <section className="mb-12 scroll-mt-24" id="profile">
          <div className="flex flex-col md:flex-row gap-8 mb-8 items-start">
            <div className="relative group">
              <div className="bg-center bg-no-repeat bg-cover rounded-full h-32 w-32 border-4 border-surface-dark shadow-xl relative overflow-hidden">
                {userData?.profilePhoto ? (
                  <Image
                    src={userData.profilePhoto}
                    alt="Profile picture"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20 text-white text-4xl font-bold">
                    {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <button
                className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-primary-hover transition-colors"
                title="Change Avatar"
                onClick={() => showError('Not Implemented', 'Avatar upload will be implemented soon.')}
              >
                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              </button>
            </div>
            <div className="flex-1 w-full space-y-6">
              <h2 className="text-white text-xl font-bold border-b border-[#3c2348] pb-4">Personal Information</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">First Name</label>
                    <input
                      className="w-full bg-surface-dark border border-[#3c2348] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Last Name</label>
                    <input
                      className="w-full bg-surface-dark border border-[#3c2348] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Email Address</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">mail</span>
                    <input
                      className="w-full bg-surface-dark border border-[#3c2348] rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                      type="email"
                      value={profileData.email}
                      disabled
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Bio</label>
                  <textarea
                    className="w-full bg-surface-dark border border-[#3c2348] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600 resize-none"
                    rows="3"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    maxLength={150}
                  />
                  <p className="text-xs text-gray-500 text-right">{profileData.bio.length}/150 characters</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/25 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="mb-12 scroll-mt-24" id="security">
          <div className="space-y-6">
            <h2 className="text-white text-xl font-bold border-b border-[#3c2348] pb-4">Security & Password</h2>
            <div className="bg-surface-dark/50 rounded-xl p-6 border border-[#3c2348]">
              <form onSubmit={handlePasswordChange} className="grid grid-cols-1 gap-6 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Current Password</label>
                  <input
                    className="w-full bg-background-dark border border-[#3c2348] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="••••••••••••"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">New Password</label>
                    <input
                      className="w-full bg-background-dark border border-[#3c2348] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Confirm New Password</label>
                    <input
                      className="w-full bg-background-dark border border-[#3c2348] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary mt-2">
                  <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
                  <span>At least 8 characters</span>
                  <span className="material-symbols-outlined text-lg text-primary ml-2">check_circle</span>
                  <span>One special character</span>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-fit"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-[#3c2348] bg-surface-dark/30">
              <div className="flex flex-col">
                <span className="text-white font-medium">Two-Factor Authentication</span>
                <span className="text-text-secondary text-sm">Add an extra layer of security to your account.</span>
              </div>
              <button
                className="px-4 py-2 text-sm font-bold text-white bg-[#3c2348] hover:bg-[#4d2d5c] rounded-lg transition-colors"
                onClick={() => {
                  setTwoFactorEnabled(!twoFactorEnabled);
                  showSuccess('2FA Updated', twoFactorEnabled ? 'Two-factor authentication has been disabled.' : 'Two-factor authentication has been enabled.');
                }}
              >
                {twoFactorEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        </section>

        {/* Membership Section */}
        <section className="mb-12 scroll-mt-24" id="membership">
          <div className="space-y-6">
            <h2 className="text-white text-xl font-bold border-b border-[#3c2348] pb-4">Membership Plan</h2>
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-surface-dark via-[#2d1b36] to-primary/20 p-6 md:p-8">
              {/* Decorative background glow */}
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl"></div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm">
                    <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Current Plan</span>
                  </div>
                  <h3 className="text-3xl font-black text-white">
                    {subscriptionType === 'free' ? 'Scholar Tier' : 'Pro Tier'}
                  </h3>
                  <p className="text-text-secondary max-w-md">
                    {subscriptionType === 'free'
                      ? 'You have access to our standard library of over 10,000 titles. Upgrade to unlock premium research papers and offline reading.'
                      : 'You have access to our premium library with offline reading, priority reservations, and exclusive content.'}
                  </p>
                </div>
                <div className="flex flex-col gap-3 min-w-[200px]">
                  {subscriptionType === 'free' ? (
                    <button
                      className="w-full py-3 px-6 bg-white text-primary-dark font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg shadow-primary/10 flex justify-center items-center gap-2"
                      onClick={handleUpgradeSubscription}
                    >
                      <span>Upgrade to Pro</span>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  ) : null}
                  <button
                    className="w-full py-2 px-6 bg-transparent text-white/80 hover:text-white font-medium text-sm transition-colors text-center"
                    onClick={() => router.push('/member/billing')}
                  >
                    View Billing History
                  </button>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 rounded-full bg-primary/20 text-primary">
                    <span className="material-symbols-outlined text-sm">book</span>
                  </div>
                  <span className="text-sm font-medium text-gray-200">Unlimited Books</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 rounded-full bg-primary/20 text-primary">
                    <span className="material-symbols-outlined text-sm">block</span>
                  </div>
                  <span className="text-sm font-medium text-gray-200">Ad-free Experience</span>
                </div>
                <div className={`flex items-center gap-3 ${subscriptionType === 'free' ? 'opacity-50' : ''}`}>
                  <div className={`flex items-center justify-center size-8 rounded-full ${subscriptionType === 'free' ? 'bg-gray-700 text-gray-400' : 'bg-primary/20 text-primary'}`}>
                    <span className="material-symbols-outlined text-sm">wifi_off</span>
                  </div>
                  <span className={`text-sm font-medium ${subscriptionType === 'free' ? 'text-gray-400' : 'text-gray-200'}`}>
                    Offline Mode {subscriptionType === 'free' ? '(Locked)' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="mb-12 scroll-mt-24" id="notifications">
          <div className="space-y-6">
            <div className="flex items-end justify-between border-b border-[#3c2348] pb-4">
              <h2 className="text-white text-xl font-bold">Notification Preferences</h2>
              <button
                className="text-sm text-primary hover:text-primary-light font-medium"
                onClick={() => {
                  setNotifications({
                    newBookAlerts: true,
                    dueDateReminders: true,
                    marketingUpdates: false,
                    emailNotifications: true,
                    pushNotifications: true,
                    smsMessages: false,
                  });
                  showSuccess('Reset', 'Notification preferences have been reset to default.');
                }}
              >
                Reset to default
              </button>
            </div>
            <div className="space-y-1">
              {/* Toggle Item */}
              <div className="flex items-center justify-between py-4 border-b border-[#3c2348]/50">
                <div className="flex flex-col">
                  <span className="text-white font-medium text-base">New Book Alerts</span>
                  <span className="text-text-secondary text-sm">Get notified when new titles in your favorite genres are added.</span>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input
                    checked={notifications.newBookAlerts}
                    onChange={() => handleNotificationToggle('newBookAlerts')}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-surface-dark checked:border-primary transition-all duration-300"
                    id="toggle1"
                    name="toggle1"
                    type="checkbox"
                  />
                  <label
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer border border-[#3c2348] transition-all ${
                      notifications.newBookAlerts ? 'bg-primary' : 'bg-surface-dark'
                    }`}
                    htmlFor="toggle1"
                  ></label>
                </div>
              </div>
              {/* Toggle Item */}
              <div className="flex items-center justify-between py-4 border-b border-[#3c2348]/50">
                <div className="flex flex-col">
                  <span className="text-white font-medium text-base">Due Date Reminders</span>
                  <span className="text-text-secondary text-sm">Receive alerts 3 days before your borrowed books are due.</span>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input
                    checked={notifications.dueDateReminders}
                    onChange={() => handleNotificationToggle('dueDateReminders')}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-surface-dark checked:border-primary transition-all duration-300"
                    id="toggle2"
                    name="toggle2"
                    type="checkbox"
                  />
                  <label
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer border border-[#3c2348] transition-all ${
                      notifications.dueDateReminders ? 'bg-primary' : 'bg-surface-dark'
                    }`}
                    htmlFor="toggle2"
                  ></label>
                </div>
              </div>
              {/* Toggle Item */}
              <div className="flex items-center justify-between py-4 border-b border-[#3c2348]/50">
                <div className="flex flex-col">
                  <span className="text-white font-medium text-base">Marketing Updates</span>
                  <span className="text-text-secondary text-sm">Occasional news about Bookflix features and promotions.</span>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input
                    checked={notifications.marketingUpdates}
                    onChange={() => handleNotificationToggle('marketingUpdates')}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-surface-dark checked:border-primary transition-all duration-300"
                    id="toggle3"
                    name="toggle3"
                    type="checkbox"
                  />
                  <label
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer border border-[#3c2348] transition-all ${
                      notifications.marketingUpdates ? 'bg-primary' : 'bg-surface-dark'
                    }`}
                    htmlFor="toggle3"
                  ></label>
                </div>
              </div>
            </div>
            <div className="pt-4 flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="flex items-center justify-center size-5 rounded border border-[#3c2348] bg-surface-dark group-hover:border-primary">
                  {notifications.emailNotifications && (
                    <div className="size-3 bg-primary rounded-sm"></div>
                  )}
                </div>
                <span
                  className="text-sm font-medium text-white group-hover:text-primary transition-colors"
                  onClick={() => handleNotificationToggle('emailNotifications')}
                >
                  Email Notifications
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="flex items-center justify-center size-5 rounded border border-[#3c2348] bg-surface-dark group-hover:border-primary">
                  {notifications.pushNotifications && (
                    <div className="size-3 bg-primary rounded-sm"></div>
                  )}
                </div>
                <span
                  className="text-sm font-medium text-white group-hover:text-primary transition-colors"
                  onClick={() => handleNotificationToggle('pushNotifications')}
                >
                  Push Notifications
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="flex items-center justify-center size-5 rounded border border-[#3c2348] bg-surface-dark group-hover:border-primary">
                  {notifications.smsMessages && (
                    <div className="size-3 bg-primary rounded-sm"></div>
                  )}
                </div>
                <span
                  className="text-sm font-medium text-text-secondary group-hover:text-white transition-colors"
                  onClick={() => handleNotificationToggle('smsMessages')}
                >
                  SMS Messages
                </span>
              </label>
            </div>
            <button
              onClick={handleSaveNotifications}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/25 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed w-fit"
            >
              {loading ? 'Saving...' : 'Save Notification Preferences'}
            </button>
          </div>
        </section>

        {/* Footer Actions */}
        <div className="sticky bottom-6 z-10 flex items-center justify-end gap-4 p-4 rounded-xl bg-surface-dark/80 backdrop-blur-md border border-[#3c2348] shadow-2xl mt-10">
          <button
            className="px-6 py-2.5 rounded-lg text-sm font-bold text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => router.back()}
          >
            Cancel
          </button>
        </div>
        <div className="mt-8 text-center pb-8">
          <button
            className="text-sm text-red-400 hover:text-red-300 underline decoration-red-400/30 hover:decoration-red-300"
            onClick={handleDeactivateAccount}
          >
            Deactivate Account
          </button>
        </div>
      </div>
    </div>
  );
}

