'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminHeader from '@/components/AdminHeader';
import Loader from '@/components/Loader';
import { formatDate } from '@/lib/utils';
import { showError, showSuccess, showConfirm } from '@/lib/swal';

export default function MemberDetailsPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const params = useParams();
  const memberId = params.id;

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    profilePhoto: '',
    role: 'member',
    isActive: true,
    subscription: {
      type: 'free',
      status: 'active',
    },
    address: {
      division: '',
      city: '',
      area: '',
      landmark: '',
    },
  });

  useEffect(() => {
    if (memberId) {
      fetchMemberDetails();
    }
  }, [memberId]);

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/members?userId=${memberId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.member) {
          setMember(data.member);
          setFormData({
            name: data.member.name || '',
            email: data.member.email || '',
            phone: data.member.phone || '',
            profilePhoto: data.member.profilePhoto || '',
            role: data.member.role || 'member',
            isActive: data.member.isActive !== false,
            subscription: {
              type: data.member.subscription?.type || 'free',
              status: data.member.subscription?.status || 'active',
            },
            address: {
              division: data.member.address?.division || '',
              city: data.member.address?.city || '',
              area: data.member.address?.area || '',
              landmark: data.member.address?.landmark || '',
            },
          });
        } else {
          // Try fetching from members list API
          const listResponse = await fetch('/api/admin/members?limit=1000');
          if (listResponse.ok) {
            const listData = await listResponse.json();
            const foundMember = listData.members?.find(m => m._id === memberId);
            if (foundMember) {
              setMember(foundMember);
              setFormData({
                name: foundMember.name || '',
                email: foundMember.email || '',
                phone: foundMember.phone || '',
                profilePhoto: foundMember.profilePhoto || '',
                role: foundMember.role || 'member',
                isActive: foundMember.isActive !== false,
                subscription: {
                  type: foundMember.subscription?.type || 'free',
                  status: foundMember.subscription?.status || 'active',
                },
                address: {
                  division: foundMember.address?.division || '',
                  city: foundMember.address?.city || '',
                  area: foundMember.address?.area || '',
                  landmark: foundMember.address?.landmark || '',
                },
              });
            } else {
              showError('Member not found');
              router.push('/admin/members');
            }
          }
        }
      } else {
        showError('Failed to fetch member details');
        router.push('/admin/members');
      }
    } catch (error) {
      console.error('Error fetching member details:', error);
      showError('Failed to fetch member details');
      router.push('/admin/members');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else if (name.startsWith('subscription.')) {
      const subField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        subscription: {
          ...prev.subscription,
          [subField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await showConfirm(
      'Save Changes',
      'Are you sure you want to save these changes?',
      {
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
      }
    );

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      const updates = {
        name: formData.name,
        phone: formData.phone,
        profilePhoto: formData.profilePhoto,
        isActive: formData.isActive,
        subscription: formData.subscription,
        address: formData.address,
      };

      const response = await fetch(`/api/admin/members?userId=${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: memberId,
          updates,
        }),
      });

      if (response.ok) {
        showSuccess('Member updated successfully');
        fetchMemberDetails();
      } else {
        const data = await response.json();
        showError('Failed to update member', data.error || '');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      showError('Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  if (loading) {
    return (
      <>
        <AdminHeader title="Member Details" subtitle="View and edit member information" />
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <Loader />
        </div>
      </>
    );
  }

  if (!member) {
    return null;
  }

  return (
    <>
      <AdminHeader 
        title="Member Details" 
        subtitle={`Manage ${member.name}'s account information and settings`}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-8 pb-8 max-w-4xl mx-auto w-full">
          <div className="mb-6">
            <button
              onClick={() => router.push('/admin/members')}
              className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors mb-4"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span className="text-sm font-medium">Back to Members</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Section */}
            <div className="bg-card-dark border border-white/5 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined">person</span>
                Profile Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-6 mb-6">
                  <div
                    className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-inner relative overflow-hidden border-4 border-card-dark bg-center bg-cover"
                    style={{
                      backgroundImage: formData.profilePhoto ? `url('${formData.profilePhoto}')` : 'none',
                      backgroundColor: formData.profilePhoto ? 'transparent' : undefined,
                    }}
                  >
                    {!formData.profilePhoto && getInitials(formData.name)}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Profile Photo URL
                    </label>
                    <input
                      type="text"
                      name="profilePhoto"
                      value={formData.profilePhoto}
                      onChange={handleInputChange}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full h-11 px-4 bg-background-dark border border-white/5 rounded-lg text-white placeholder:text-text-secondary/50 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full h-11 px-4 bg-background-dark border border-white/5 rounded-lg text-white placeholder:text-text-secondary/50 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full h-11 px-4 bg-background-dark/50 border border-white/5 rounded-lg text-text-secondary cursor-not-allowed"
                    />
                    <p className="text-xs text-text-secondary mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full h-11 px-4 bg-background-dark border border-white/5 rounded-lg text-white placeholder:text-text-secondary/50 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Account Status
                    </label>
                    <div className="flex items-center gap-3 h-11">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleCheckboxChange}
                          className="rounded border-white/5 bg-background-dark text-primary focus:ring-primary/50 cursor-pointer h-4 w-4"
                        />
                        <span className="text-sm text-white">
                          {formData.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Section */}
            <div className="bg-card-dark border border-white/5 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined">workspace_premium</span>
                Subscription
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Subscription Type
                  </label>
                  <select
                    name="subscription.type"
                    value={formData.subscription.type}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 bg-background-dark border border-white/5 rounded-lg text-white appearance-none cursor-pointer focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  >
                    <option value="free">Standard (Free)</option>
                    <option value="monthly">Premium (Monthly)</option>
                    <option value="yearly">Premium (Yearly)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Subscription Status
                  </label>
                  <select
                    name="subscription.status"
                    value={formData.subscription.status}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 bg-background-dark border border-white/5 rounded-lg text-white appearance-none cursor-pointer focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="bg-card-dark border border-white/5 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined">location_on</span>
                Address
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Division
                  </label>
                  <input
                    type="text"
                    name="address.division"
                    value={formData.address.division}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 bg-background-dark border border-white/5 rounded-lg text-white placeholder:text-text-secondary/50 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 bg-background-dark border border-white/5 rounded-lg text-white placeholder:text-text-secondary/50 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Area
                  </label>
                  <input
                    type="text"
                    name="address.area"
                    value={formData.address.area}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 bg-background-dark border border-white/5 rounded-lg text-white placeholder:text-text-secondary/50 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Landmark
                  </label>
                  <input
                    type="text"
                    name="address.landmark"
                    value={formData.address.landmark}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 bg-background-dark border border-white/5 rounded-lg text-white placeholder:text-text-secondary/50 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => router.push('/admin/members')}
                className="h-11 px-6 rounded-lg border border-white/5 bg-background-dark text-text-secondary hover:text-white hover:border-primary transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-11 px-6 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">save</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

