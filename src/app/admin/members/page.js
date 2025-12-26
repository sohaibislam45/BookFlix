'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminHeader from '@/components/AdminHeader';
import Loader from '@/components/Loader';
import { formatDate, getSubscriptionDisplayName } from '@/lib/utils';
import { showError, showSuccess, showConfirm, showInput } from '@/lib/swal';
import swalTheme from '@/lib/swal';

export default function AdminMembersPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({
    totalMembers: 0,
    premiumUsers: 0,
    activeNow: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [imageErrors, setImageErrors] = useState(new Set());

  useEffect(() => {
    fetchMembers();
  }, [page, searchQuery, statusFilter, tierFilter]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(tierFilter !== 'all' && { tier: tierFilter }),
      });

      const response = await fetch(`/api/admin/members?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
        setPagination(data.pagination || pagination);
        setStats(data.stats || stats);
        setImageErrors(new Set()); // Reset image errors when fetching new data
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      showError('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (member) => {
    router.push(`/admin/members/${member._id}`);
  };

  const handleDelete = async (member) => {
    const result = await showConfirm(
      'Delete Member Permanently',
      `Are you sure you want to permanently delete ${member.name}? This action cannot be undone and will remove all data from the database.`,
      {
        confirmButtonText: 'Yes, Delete Permanently',
        cancelButtonText: 'Cancel',
        icon: 'warning',
        confirmButtonColor: '#ef4444',
      }
    );

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/members?userId=${member._id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          showSuccess('Member deleted permanently');
          fetchMembers();
        } else {
          const data = await response.json();
          showError('Failed to delete member', data.error || '');
        }
      } catch (error) {
        console.error('Error deleting member:', error);
        showError('Failed to delete member');
      }
    }
  };

  const handleUpgrade = async (member) => {
    const isCurrentlyActive = member.isActive !== false;
    const isSuspended = !isCurrentlyActive;
    
    // First, ask if they want to activate or suspend
    // Default to 'suspend' if user is already suspended
    const actionResult = await swalTheme.fire({
      icon: 'question',
      iconColor: '#aa1fef',
      title: 'Manage Member Status',
      text: `Current status: ${isCurrentlyActive ? 'Active' : 'Suspended'}. What would you like to do?`,
      input: 'select',
      inputOptions: {
        activate: 'Activate User',
        suspend: 'Suspend User',
      },
      inputValue: isSuspended ? 'suspend' : 'suspend', // Default to suspend option
      inputPlaceholder: 'Select action',
      showCancelButton: true,
      confirmButtonText: 'Continue',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#aa1fef',
      cancelButtonColor: '#3c2348',
    });

    if (!actionResult.isConfirmed) return;

    if (actionResult.value === 'activate') {
      // Activate user
      try {
        const response = await fetch(`/api/admin/members?userId=${member._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: member._id,
            updates: {
              suspendedUntil: null,
              isActive: true,
            },
          }),
        });

        if (response.ok) {
          showSuccess('Member activated successfully');
          fetchMembers();
        } else {
          showError('Failed to activate member');
        }
      } catch (error) {
        console.error('Error activating member:', error);
        showError('Failed to activate member');
      }
    } else if (actionResult.value === 'suspend') {
      // Suspend user - ask for duration
      const durationResult = await swalTheme.fire({
        icon: 'warning',
        iconColor: '#f59e0b',
        title: 'Suspend Member',
        text: `How long should ${member.name} be suspended?`,
        input: 'select',
        inputOptions: {
          '1': '1 day',
          '3': '3 days',
          '7': '7 days',
          'custom': 'Custom (Enter days)',
          'forever': 'Forever (Permanent)',
        },
        inputValue: '7',
        inputPlaceholder: 'Select duration',
        showCancelButton: true,
        confirmButtonText: 'Continue',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#3c2348',
      });

      if (!durationResult.isConfirmed || !durationResult.value) return;

      let suspendDays = null;

      // Handle custom duration
      if (durationResult.value === 'custom') {
        // Use a small delay to ensure the previous dialog is fully closed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const customResult = await swalTheme.fire({
          icon: 'question',
          iconColor: '#f59e0b',
          title: 'Custom Suspension Duration',
          text: `Enter the number of days to suspend ${member.name}`,
          input: 'text',
          inputValue: '',
          inputPlaceholder: 'Enter number of days (e.g., 15, 30, 60)',
          inputAttributes: {
            type: 'number',
            min: '1',
            autocomplete: 'off',
          },
          showCancelButton: true,
          confirmButtonText: 'Suspend',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#f59e0b',
          cancelButtonColor: '#3c2348',
          inputValidator: (value) => {
            if (!value || value.trim() === '') {
              return 'Please enter a number of days';
            }
            const days = parseInt(value.trim());
            if (isNaN(days) || days < 1) {
              return 'Please enter a valid number (minimum 1 day)';
            }
            return null;
          },
          didOpen: () => {
            // Focus the input field when dialog opens
            const input = document.querySelector('.swal2-input');
            if (input) {
              input.focus();
              input.select();
            }
          },
        });

        if (!customResult.isConfirmed || !customResult.value) return;
        suspendDays = parseInt(customResult.value.trim());
      } else if (durationResult.value === 'forever') {
        suspendDays = 'forever';
      } else {
        suspendDays = parseInt(durationResult.value);
      }

      // Apply suspension
      try {
        const updates = {
          isActive: false,
        };

        if (suspendDays === 'forever') {
          updates.suspendedUntil = 'forever';
        } else {
          updates.suspendedUntil = suspendDays;
        }

        const response = await fetch(`/api/admin/members?userId=${member._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: member._id,
            updates,
          }),
        });

        if (response.ok) {
          let durationText;
          if (suspendDays === 'forever') {
            durationText = 'permanently';
          } else {
            durationText = `for ${suspendDays} day${suspendDays !== 1 ? 's' : ''}`;
          }
          showSuccess(`Member suspended ${durationText}`);
          fetchMembers();
        } else {
          showError('Failed to suspend member');
        }
      } catch (error) {
        console.error('Error suspending member:', error);
        showError('Failed to suspend member');
      }
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedMembers(new Set(members.map((m) => m._id)));
    } else {
      setSelectedMembers(new Set());
    }
  };

  const handleSelectMember = (memberId) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const isAllSelected = members.length > 0 && selectedMembers.size === members.length;

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const getStatusBadge = (member) => {
    if (!member.isActive) {
      return {
        label: 'Suspended',
        color: 'red',
        dot: 'red-400',
      };
    }
    return {
      label: 'Active',
      color: 'green',
      dot: 'green-400',
    };
  };

  const getTierInfo = (member) => {
    const subscriptionType = member.subscription?.type || 'free';
    const isPremium = subscriptionType === 'monthly' || subscriptionType === 'yearly';
    
    return {
      label: isPremium ? 'Premium' : subscriptionType === 'free' ? 'Standard' : 'Student',
      isPremium,
      subscriptionType,
    };
  };

  return (
    <>
      <AdminHeader title="Member Management" subtitle="Manage your member database, monitor subscription tiers, and handle account statuses." />
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-8 pb-2 max-w-[1440px] mx-auto w-full">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card-dark border border-white/5 p-4 rounded-xl flex items-start justify-between">
              <div>
                <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-1">Total Members</p>
                <h3 className="text-2xl font-black text-white">{stats.totalMembers.toLocaleString()}</h3>
                <p className="text-success-green text-xs font-medium flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm">trending_up</span> +12% this month
                </p>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <span className="material-symbols-outlined">groups</span>
              </div>
            </div>
            <div className="bg-card-dark border border-white/5 p-4 rounded-xl flex items-start justify-between">
              <div>
                <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-1">Premium Users</p>
                <h3 className="text-2xl font-black text-white">{stats.premiumUsers.toLocaleString()}</h3>
                <p className="text-text-secondary text-xs font-medium mt-1">
                  {stats.totalMembers > 0 ? Math.round((stats.premiumUsers / stats.totalMembers) * 100) : 0}% of total base
                </p>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <span className="material-symbols-outlined">workspace_premium</span>
              </div>
            </div>
            <div className="bg-card-dark border border-white/5 p-4 rounded-xl flex items-start justify-between">
              <div>
                <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-1">Active Now</p>
                <h3 className="text-2xl font-black text-white">{stats.activeNow.toLocaleString()}</h3>
                <p className="text-success-green text-xs font-medium mt-1">Peak time approaching</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                <span className="material-symbols-outlined">bolt</span>
              </div>
            </div>
            <div className="bg-card-dark border border-white/5 p-4 rounded-xl flex items-start justify-between">
              <div>
                <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-1">Pending Requests</p>
                <h3 className="text-2xl font-black text-white">15</h3>
                <p className="text-yellow-400 text-xs font-medium mt-1">Action required</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                <span className="material-symbols-outlined">assignment_late</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[1440px] mx-auto w-full flex flex-col gap-6">
            {/* Search and Filters */}
            <div className="w-full bg-card-dark rounded-xl border border-white/5 p-4 shadow-xl">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <label className="relative flex-1 w-full lg:max-w-md group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined">search</span>
                  </span>
                  <input
                    className="w-full h-11 pl-12 pr-4 bg-background-dark border border-white/5 rounded-lg text-white placeholder:text-text-secondary/50 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    placeholder="Search by name, email, or ID..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
                <div className="flex w-full lg:w-auto gap-3 overflow-x-auto pb-2 lg:pb-0">
                  <label className="relative min-w-[160px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                      <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                    </span>
                    <select
                      className="w-full h-11 pl-10 pr-10 bg-background-dark border border-white/5 rounded-lg text-sm text-white appearance-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all hover:border-text-secondary/50"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">Status: All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                      <span className="material-symbols-outlined text-sm">expand_more</span>
                    </span>
                  </label>
                  <label className="relative min-w-[160px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                      <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                    </span>
                    <select
                      className="w-full h-11 pl-10 pr-10 bg-background-dark border border-white/5 rounded-lg text-sm text-white appearance-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all hover:border-text-secondary/50"
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                    >
                      <option value="all">Tier: All</option>
                      <option value="premium">Premium</option>
                      <option value="standard">Standard</option>
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                      <span className="material-symbols-outlined text-sm">expand_more</span>
                    </span>
                  </label>
                  <button className="h-11 px-4 flex items-center gap-2 justify-center rounded-lg border border-white/5 bg-background-dark text-text-secondary hover:text-white hover:border-primary transition-colors text-sm font-medium whitespace-nowrap">
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    <span>More Filters</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Members Table */}
            <div className="rounded-xl border border-white/5 bg-card-dark overflow-hidden shadow-2xl flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-card-dark/50 border-b border-white/5">
                      <th className="p-4 pl-6 w-14">
                        <input
                          className="rounded border-white/5 bg-background-dark text-primary focus:ring-primary/50 cursor-pointer h-4 w-4"
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-secondary cursor-pointer hover:text-white group transition-colors">
                        <div className="flex items-center gap-1">
                          Member <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100">unfold_more</span>
                        </div>
                      </th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-secondary hidden md:table-cell cursor-pointer hover:text-white group transition-colors">
                        <div className="flex items-center gap-1">
                          Status <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100">unfold_more</span>
                        </div>
                      </th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-secondary cursor-pointer hover:text-white group transition-colors">
                        <div className="flex items-center gap-1">
                          Plan Tier <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100">unfold_more</span>
                        </div>
                      </th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-secondary hidden lg:table-cell cursor-pointer hover:text-white group transition-colors">
                        <div className="flex items-center gap-1">
                          Last Active <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100">unfold_more</span>
                        </div>
                      </th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-text-secondary text-right pr-6">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-text-secondary">
                          <div className="flex justify-center">
                            <Loader />
                          </div>
                        </td>
                      </tr>
                    ) : members.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-text-secondary">No members found</td>
                      </tr>
                    ) : (
                      members.map((member) => {
                        const status = getStatusBadge(member);
                        const tier = getTierInfo(member);
                        return (
                          <tr key={member._id} className="group hover:bg-white/5 transition-colors">
                            <td className="p-4 pl-6">
                              <input
                                className="rounded border-white/5 bg-background-dark text-primary focus:ring-primary/50 cursor-pointer h-4 w-4"
                                type="checkbox"
                                checked={selectedMembers.has(member._id)}
                                onChange={() => handleSelectMember(member._id)}
                              />
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-inner relative overflow-hidden flex-shrink-0 border-2 border-card-dark group-hover:border-primary/50 transition-colors">
                                  {member.profilePhoto && member.profilePhoto.trim() !== '' && !imageErrors.has(member._id) ? (
                                    <img
                                      src={`/api/image-proxy?url=${encodeURIComponent(member.profilePhoto)}`}
                                      alt={member.name}
                                      className="w-full h-full rounded-full object-cover"
                                      onError={(e) => {
                                        setImageErrors(prev => new Set(prev).add(member._id));
                                      }}
                                    />
                                  ) : (
                                    <span>{getInitials(member.name)}</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white text-sm font-semibold truncate">{member.name}</p>
                                  <p className="text-text-secondary text-xs truncate">{member.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 hidden md:table-cell">
                              {status.color === 'green' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                                  <span className="w-1 h-1 rounded-full bg-green-400"></span> {status.label}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                  <span className="w-1 h-1 rounded-full bg-red-400"></span> {status.label}
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="text-white text-sm font-medium flex items-center gap-1">
                                  {tier.label}
                                  {tier.isPremium && <span className="material-symbols-outlined text-amber-400 text-[16px]">star</span>}
                                </span>
                                <span className="text-text-secondary text-xs">
                                  {tier.subscriptionType === 'monthly' ? 'Monthly' : tier.subscriptionType === 'yearly' ? 'Yearly' : 'Free'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 hidden lg:table-cell">
                              <p className="text-text-secondary text-sm">{formatDate(member.updatedAt)}</p>
                            </td>
                            <td className="p-4 text-right pr-6">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleUpgrade(member)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-text-secondary hover:text-white transition-colors"
                                  title="Suspend/Activate"
                                >
                                  <span className="material-symbols-outlined text-[18px]">block</span>
                                </button>
                                <button
                                  onClick={() => handleEdit(member)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/20 hover:text-primary text-text-secondary transition-colors"
                                  title="Edit Profile"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(member)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 hover:text-red-400 text-text-secondary transition-colors"
                                  title="Remove Member"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-white/5 bg-card-dark gap-4">
                <p className="text-text-secondary text-sm">
                  Showing <span className="text-white font-bold">{((page - 1) * pagination.limit) + 1}</span> to{' '}
                  <span className="text-white font-bold">{Math.min(page * pagination.limit, pagination.total)}</span> of{' '}
                  <span className="text-white font-bold">{pagination.total}</span> members
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-9 px-3 rounded-lg border border-white/5 bg-white/5 text-text-secondary hover:text-white hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                    <span className="text-sm font-medium">Previous</span>
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`h-9 w-9 rounded-lg font-medium text-sm flex items-center justify-center transition-colors ${
                            page === pageNum
                              ? 'bg-primary text-white shadow-lg shadow-primary/30'
                              : 'border border-white/5 hover:bg-white/5 text-text-secondary hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {pagination.totalPages > 5 && (
                      <>
                        <span className="h-9 w-9 flex items-center justify-center text-text-secondary">...</span>
                        <button
                          onClick={() => setPage(pagination.totalPages)}
                          className="h-9 w-9 rounded-lg border border-white/5 hover:bg-white/5 text-text-secondary hover:text-white font-medium text-sm flex items-center justify-center transition-colors"
                        >
                          {pagination.totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="h-9 px-3 rounded-lg border border-white/5 bg-white/5 text-text-secondary hover:text-white hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                  >
                    <span className="text-sm font-medium">Next</span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

