'use client';

import { useState, useEffect } from 'react';
import { showError } from '@/lib/swal';
import Loader from '@/components/Loader';
import { formatDate } from '@/lib/utils';

export default function ViewMemberModal({ isOpen, onClose, memberId }) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && memberId) {
      fetchMemberDetails();
    }
  }, [isOpen, memberId]);

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/members?userId=${memberId}`);
      if (response.ok) {
        const data = await response.json();
        setMember(data.member);
      } else {
        showError('Failed to fetch member details');
        onClose();
      }
    } catch (error) {
      console.error('Error fetching member details:', error);
      showError('Failed to fetch member details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getTierLabel = (subscriptionType) => {
    if (subscriptionType === 'monthly' || subscriptionType === 'yearly') {
      return 'Premium';
    }
    return 'Standard';
  };

  const getStatusLabel = (member) => {
    if (!member.isActive) {
      return 'Inactive';
    }
    return 'Active';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div 
        className="absolute inset-0 z-0 bg-background-dark/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative z-10 w-full max-w-4xl rounded-2xl border border-border-dark shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up" style={{ background: 'rgba(43, 25, 52, 0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between px-8 py-6 border-b border-border-dark bg-[#150c19]/50">
          <div className="flex flex-col gap-1">
            <h2 className="text-white text-2xl font-bold tracking-tight">Member Details</h2>
            <p className="text-white/60 text-sm font-normal">View member information and history.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader />
            </div>
          ) : member ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Profile */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="flex flex-col items-center gap-4 p-6 bg-[#150c19]/30 rounded-xl border border-border-dark/50">
                  {member.profilePhoto ? (
                    <img 
                      src={member.profilePhoto} 
                      alt={member.name || 'Member'} 
                      className="w-32 h-32 rounded-full object-cover border-4 border-border-dark"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-[#150c19] border-4 border-border-dark flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/20 text-5xl">person</span>
                    </div>
                  )}
                  <div className="text-center">
                    <h3 className="text-white font-bold text-lg">{member.name || 'Unknown Member'}</h3>
                    <p className="text-white/60 text-sm mt-1">{member.email}</p>
                  </div>
                  <div className="w-full flex flex-col gap-2">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#150c19] rounded-lg">
                      <span className="text-white/60 text-sm">Status</span>
                      <span className={`text-sm font-medium ${member.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {getStatusLabel(member)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 bg-[#150c19] rounded-lg">
                      <span className="text-white/60 text-sm">Tier</span>
                      <span className="text-sm font-medium text-white">
                        {getTierLabel(member.subscription?.type)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Details */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="space-y-4">
                  <h3 className="text-white text-lg font-semibold flex items-center gap-2 border-b border-border-dark pb-2">
                    <span className="material-symbols-outlined text-primary">person</span>
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-wider">Full Name</label>
                      <p className="text-white text-sm mt-1">{member.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-wider">Email</label>
                      <p className="text-white text-sm mt-1">{member.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-wider">Phone</label>
                      <p className="text-white text-sm mt-1">{member.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-wider">Member ID</label>
                      <p className="text-white text-sm mt-1 font-mono">{member._id?.slice(-8) || 'N/A'}</p>
                    </div>
                  </div>
                  {member.address && (member.address.city || member.address.area || member.address.division) && (
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-wider">Address</label>
                      <p className="text-white text-sm mt-1">
                        {[
                          member.address.area,
                          member.address.city,
                          member.address.division,
                          member.address.landmark
                        ].filter(Boolean).join(', ') || 'N/A'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-white text-lg font-semibold flex items-center gap-2 border-b border-border-dark pb-2">
                    <span className="material-symbols-outlined text-primary">card_membership</span>
                    Subscription Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-wider">Subscription Type</label>
                      <p className="text-white text-sm mt-1 capitalize">{member.subscription?.type || 'Free'}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-wider">Status</label>
                      <p className="text-white text-sm mt-1 capitalize">{member.subscription?.status || 'Active'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-white text-lg font-semibold flex items-center gap-2 border-b border-border-dark pb-2">
                    <span className="material-symbols-outlined text-primary">calendar_today</span>
                    Account Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-wider">Member Since</label>
                      <p className="text-white text-sm mt-1">
                        {member.createdAt ? formatDate(new Date(member.createdAt)) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-wider">Last Updated</label>
                      <p className="text-white text-sm mt-1">
                        {member.updatedAt ? formatDate(new Date(member.updatedAt)) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-yellow-400">info</span>
                    <div>
                      <p className="text-white text-sm font-medium">Borrowing History</p>
                      <p className="text-white/60 text-xs mt-1">Borrowing history and activity tracking will be available in a future update.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-white/60">Member not found</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-border-dark bg-[#150c19]/80 backdrop-blur-md">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-primary hover:bg-[#8a19c2] text-white shadow-[0_0_15px_rgba(170,31,239,0.3)] hover:shadow-[0_0_20px_rgba(170,31,239,0.5)] transition-all text-sm font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

