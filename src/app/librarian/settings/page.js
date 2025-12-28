'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LibrarianHeader from '@/components/LibrarianHeader';
import { showSuccess, showError, showLoading, close } from '@/lib/swal';
import Loader from '@/components/Loader';
import { LOCATION_DATA } from '@/lib/locationData';

export default function LibrarianSettingsPage() {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Profile form data
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    profilePhoto: null,
    profilePhotoPreview: null,
    address: {
      division: '',
      city: '',
      area: '',
      landmark: '',
    },
  });

  // Preferences
  const [preferences, setPreferences] = useState({
    itemsPerPage: 20,
    autoRefreshInterval: 30,
    emailNotifications: {
      overdueAlerts: true,
      newMembers: true,
      highPriorityRequests: true,
      systemMaintenance: true,
    },
    inAppNotifications: true,
  });

  useEffect(() => {
    if (userData) {
      setProfileData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        profilePhoto: null,
        profilePhotoPreview: userData.profilePhoto || null,
        address: {
          division: userData.address?.division || '',
          city: userData.address?.city || '',
          area: userData.address?.area || '',
          landmark: userData.address?.landmark || '',
        },
      });
    }

    // Load preferences from localStorage
    const savedPreferences = localStorage.getItem('librarianPreferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  }, [userData]);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivityLogs();
    }
  }, [activeTab]);

  const fetchActivityLogs = async () => {
    try {
      setActivityLoading(true);
      const response = await fetch('/api/librarian/activity');
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleProfileChange = (field, value) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setProfileData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setProfileData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError('Invalid file type', 'Please upload a valid image file (JPG, PNG, or WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('File too large', 'Image must be less than 5MB');
      return;
    }

    // Upload image
    const formData = new FormData();
    formData.append('image', file);

    try {
      setLoading(true);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        setProfileData((prev) => ({
          ...prev,
          profilePhoto: uploadData.url,
          profilePhotoPreview: uploadData.url,
        }));
        showSuccess('Image uploaded', 'Profile photo updated');
      } else {
        showError('Upload failed', 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('Error', 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const updateData = {
        name: profileData.name,
        phone: profileData.phone,
        address: profileData.address,
      };

      if (profileData.profilePhoto) {
        updateData.profilePhoto = profileData.profilePhoto;
      }

      // Get firebaseUid from user object or userData
      const firebaseUid = user?.uid || userData?.firebaseUid;
      if (!firebaseUid) {
        showError('Error', 'User ID not found');
        return;
      }

      const response = await fetch(`/api/users/${firebaseUid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        showSuccess('Profile Updated', 'Your profile has been updated successfully');
        // Refresh user data
        window.location.reload();
      } else {
        const error = await response.json();
        showError('Update Failed', error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      // Store preferences in localStorage for now (could be moved to API)
      localStorage.setItem('librarianPreferences', JSON.stringify(preferences));
      showSuccess('Preferences Saved', 'Your preferences have been saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      showError('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const getAvailableCities = () => {
    if (!profileData.address.division) return [];
    return LOCATION_DATA[profileData.address.division] || {};
  };

  const getAvailableAreas = () => {
    if (!profileData.address.city) return [];
    const cities = getAvailableCities();
    return cities[profileData.address.city] || [];
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'person' },
    { id: 'preferences', label: 'Preferences', icon: 'settings' },
    { id: 'activity', label: 'Activity', icon: 'history' },
  ];

  return (
    <>
      <LibrarianHeader title="Settings" subtitle="Manage your account and preferences" />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-white/5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 flex items-center gap-2 font-medium text-sm transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-primary border-primary'
                    : 'text-white/50 border-transparent hover:text-white/80 hover:border-white/20'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-card-dark rounded-2xl border border-white/5 p-6 md:p-8 shadow-lg">
              <h3 className="text-white text-xl font-bold mb-6">Profile Information</h3>
              
              {/* Profile Photo */}
              <div className="mb-8">
                <label className="text-white/80 text-sm font-medium mb-3 block">Profile Photo</label>
                <div className="flex items-center gap-6">
                  <div className="size-24 rounded-full bg-surface-dark border-2 border-white/10 overflow-hidden relative">
                    {profileData.profilePhotoPreview ? (
                      <img
                        src={profileData.profilePhotoPreview}
                        alt={profileData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold bg-gradient-to-br from-primary/20 to-purple-500/20">
                        {getInitials(profileData.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={loading}
                      />
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-medium transition-colors">
                        <span className="material-symbols-outlined text-[18px]">upload</span>
                        {loading ? 'Uploading...' : 'Change Photo'}
                      </span>
                    </label>
                    {profileData.profilePhotoPreview && (
                      <button
                        onClick={() => {
                          setProfileData((prev) => ({
                            ...prev,
                            profilePhoto: null,
                            profilePhotoPreview: null,
                          }));
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="mb-6">
                <label className="text-white/80 text-sm font-medium mb-2 block">Full Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  className="w-full bg-surface-dark border border-white/5 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email (Read-only) */}
              <div className="mb-6">
                <label className="text-white/80 text-sm font-medium mb-2 block">Email Address</label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full bg-surface-dark/50 border border-white/5 text-white/50 rounded-lg px-4 py-3 cursor-not-allowed"
                />
                <p className="text-white/40 text-xs mt-1">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div className="mb-6">
                <label className="text-white/80 text-sm font-medium mb-2 block">Phone Number</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  className="w-full bg-surface-dark border border-white/5 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Address */}
              <div className="mb-6">
                <label className="text-white/80 text-sm font-medium mb-4 block">Address</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/60 text-xs mb-2 block">Division</label>
                    <div className="relative">
                      <select
                        value={profileData.address.division}
                        onChange={(e) => {
                          handleProfileChange('address.division', e.target.value);
                          handleProfileChange('address.city', '');
                          handleProfileChange('address.area', '');
                        }}
                        className="w-full bg-surface-dark border border-white/5 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select Division</option>
                        {Object.keys(LOCATION_DATA).map((division) => (
                          <option key={division} value={division}>{division}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">expand_more</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-2 block">City</label>
                    <div className="relative">
                      <select
                        value={profileData.address.city}
                        onChange={(e) => {
                          handleProfileChange('address.city', e.target.value);
                          handleProfileChange('address.area', '');
                        }}
                        disabled={!profileData.address.division}
                        className="w-full bg-surface-dark border border-white/5 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select City</option>
                        {Object.keys(getAvailableCities()).map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">expand_more</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-2 block">Area (Thana)</label>
                    <div className="relative">
                      <select
                        value={profileData.address.area}
                        onChange={(e) => handleProfileChange('address.area', e.target.value)}
                        disabled={!profileData.address.city}
                        className="w-full bg-surface-dark border border-white/5 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Area</option>
                        {getAvailableAreas().map((area) => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">expand_more</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-2 block">Landmark</label>
                    <input
                      type="text"
                      value={profileData.address.landmark}
                      onChange={(e) => handleProfileChange('address.landmark', e.target.value)}
                      className="w-full bg-surface-dark border border-white/5 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      placeholder="e.g. Near Public Library"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader />
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* Dashboard Preferences */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6 md:p-8 shadow-lg">
                <h3 className="text-white text-xl font-bold mb-6">Dashboard Preferences</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-white/80 text-sm font-medium mb-2 block">Items Per Page</label>
                    <select
                      value={preferences.itemsPerPage}
                      onChange={(e) => setPreferences((prev) => ({ ...prev, itemsPerPage: parseInt(e.target.value) }))}
                      className="w-full bg-surface-dark border border-white/5 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-white/80 text-sm font-medium mb-2 block">Auto-Refresh Interval (seconds)</label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={preferences.autoRefreshInterval}
                      onChange={(e) => setPreferences((prev) => ({ ...prev, autoRefreshInterval: parseInt(e.target.value) || 30 }))}
                      className="w-full bg-surface-dark border border-white/5 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    <p className="text-white/40 text-xs mt-1">Stats will auto-refresh every {preferences.autoRefreshInterval} seconds</p>
                  </div>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6 md:p-8 shadow-lg">
                <h3 className="text-white text-xl font-bold mb-6">Notification Preferences</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-dark/50 rounded-lg border border-white/5">
                    <div>
                      <p className="text-white font-medium">Email Notifications</p>
                      <p className="text-white/50 text-sm">Receive notifications via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications.overdueAlerts}
                        onChange={(e) => setPreferences((prev) => ({
                          ...prev,
                          emailNotifications: {
                            ...prev.emailNotifications,
                            overdueAlerts: e.target.checked,
                          },
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="pl-6 space-y-3 border-l-2 border-primary/20">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications.overdueAlerts}
                        onChange={(e) => setPreferences((prev) => ({
                          ...prev,
                          emailNotifications: {
                            ...prev.emailNotifications,
                            overdueAlerts: e.target.checked,
                          },
                        }))}
                        className="w-4 h-4 rounded border-white/20 bg-surface-dark text-primary focus:ring-primary focus:ring-2"
                      />
                      <span className="text-white/80">Overdue book alerts</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications.newMembers}
                        onChange={(e) => setPreferences((prev) => ({
                          ...prev,
                          emailNotifications: {
                            ...prev.emailNotifications,
                            newMembers: e.target.checked,
                          },
                        }))}
                        className="w-4 h-4 rounded border-white/20 bg-surface-dark text-primary focus:ring-primary focus:ring-2"
                      />
                      <span className="text-white/80">New member registrations</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications.highPriorityRequests}
                        onChange={(e) => setPreferences((prev) => ({
                          ...prev,
                          emailNotifications: {
                            ...prev.emailNotifications,
                            highPriorityRequests: e.target.checked,
                          },
                        }))}
                        className="w-4 h-4 rounded border-white/20 bg-surface-dark text-primary focus:ring-primary focus:ring-2"
                      />
                      <span className="text-white/80">High-priority requests</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications.systemMaintenance}
                        onChange={(e) => setPreferences((prev) => ({
                          ...prev,
                          emailNotifications: {
                            ...prev.emailNotifications,
                            systemMaintenance: e.target.checked,
                          },
                        }))}
                        className="w-4 h-4 rounded border-white/20 bg-surface-dark text-primary focus:ring-primary focus:ring-2"
                      />
                      <span className="text-white/80">System maintenance notices</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-dark/50 rounded-lg border border-white/5 mt-4">
                    <div>
                      <p className="text-white font-medium">In-App Notifications</p>
                      <p className="text-white/50 text-sm">Show notifications in the application</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.inAppNotifications}
                        onChange={(e) => setPreferences((prev) => ({ ...prev, inAppNotifications: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-white/5">
                  <button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader />
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Save Preferences
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="bg-card-dark rounded-2xl border border-white/5 p-6 md:p-8 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white text-xl font-bold">Activity Log</h3>
                <button
                  onClick={fetchActivityLogs}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  Refresh
                </button>
              </div>

              {activityLoading ? (
                <div className="py-12 text-center">
                  <Loader />
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="py-12 text-center text-white/40">
                  <span className="material-symbols-outlined text-5xl mb-4 block">history</span>
                  <p>No activity logs found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map((log) => (
                    <div
                      key={log._id}
                      className="p-4 bg-surface-dark/50 rounded-lg border border-white/5 hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-white font-medium">{log.action}</p>
                          <p className="text-white/50 text-sm mt-1">{log.description}</p>
                          <p className="text-white/30 text-xs mt-2">
                            {new Date(log.timestamp).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.type === 'checkout' ? 'bg-emerald-500/20 text-emerald-400' :
                          log.type === 'return' ? 'bg-blue-500/20 text-blue-400' :
                          log.type === 'renew' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-white/10 text-white/70'
                        }`}>
                          {log.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

