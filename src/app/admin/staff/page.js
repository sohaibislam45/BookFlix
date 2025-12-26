'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminHeader from '@/components/AdminHeader';
import AddStaffModal from '@/components/AddStaffModal';
import { formatDate } from '@/lib/utils';
import Loader from '@/components/Loader';
import { showError, showSuccess, showConfirm } from '@/lib/swal';

export default function AdminStaffPage() {
  const { userData } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [stats, setStats] = useState({
    totalStaff: 0,
    administrators: 0,
    activeToday: 0,
  });
  const [imageErrors, setImageErrors] = useState(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, [searchQuery, roleFilter]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
      });
      const response = await fetch(`/api/admin/staff?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff || []);
        if (data.stats) {
          setStats({
            totalStaff: data.stats.totalStaff || 0,
            administrators: data.stats.administrators || 0,
            activeToday: data.stats.activeToday || 0,
          });
        }
        setImageErrors(new Set()); // Reset image errors when fetching new data
      } else {
        const error = await response.json();
        showError('Error', error.error || 'Failed to fetch staff');
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      showError('Error', 'Failed to fetch staff. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStaff = (staffId) => {
    setEditingStaffId(staffId);
    // TODO: Open edit modal
    showError('Coming Soon', 'Edit staff functionality will be available soon.');
  };

  const handleDeleteStaff = async (staffId, staffName) => {
    const result = await showConfirm(
      'Deactivate Staff Member',
      `Are you sure you want to deactivate "${staffName}"? They will no longer be able to access the system.`,
      {
        confirmButtonText: 'Deactivate',
        cancelButtonText: 'Cancel',
      }
    );

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/staff?userId=${staffId}`, {
          method: 'DELETE',
        });

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Error parsing JSON response:', jsonError);
          showError('Error', `Server error (${response.status}). Please check the server logs.`);
          return;
        }

        if (response.ok) {
          showSuccess('Staff Deactivated!', `"${staffName}" has been successfully deactivated.`);
          fetchStaff(); // Refresh the staff list
        } else {
          const errorMessage = data?.error || data?.message || `Failed to deactivate staff (${response.status})`;
          showError('Error', errorMessage);
        }
      } catch (error) {
        console.error('Error deleting staff:', error);
        showError('Error', error.message || 'Failed to deactivate staff. Please try again.');
      }
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { label: 'Admin', color: 'primary', bg: 'primary/10', border: 'primary/20', text: 'primary' },
      librarian: { label: 'Librarian', color: 'emerald', bg: 'emerald-500/10', border: 'emerald-500/20', text: 'emerald-400' },
      manager: { label: 'Manager', color: 'purple', bg: 'purple-500/10', border: 'purple-500/20', text: 'purple-400' },
    };
    return badges[role] || badges.librarian;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const filteredStaff = staff.filter((member) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!member.name?.toLowerCase().includes(query) && !member.email?.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (roleFilter !== 'all' && member.role !== roleFilter) {
      return false;
    }
    return true;
  });

  return (
    <>
      <AdminHeader title="Staff Management" subtitle="Manage access, permissions, and view activity logs." />
      <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-white text-3xl font-black tracking-tight mb-1">Staff Management</h2>
              <p className="text-text-secondary">Manage access, permissions, and view activity logs.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => showError('Coming Soon', 'Role management functionality will be available soon.')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/5 bg-card-dark hover:bg-white/5 text-text-secondary hover:text-white transition-all font-medium text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">security</span>
                Manage Roles
              </button>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20 transition-all font-bold text-sm hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add Staff
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card-dark border border-white/5 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-primary">group</span>
              </div>
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <span className="material-symbols-outlined">badge</span>
              </div>
              <div>
                <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Total Staff</p>
                <p className="text-white text-2xl font-bold">{stats.totalStaff}</p>
              </div>
            </div>
            <div className="bg-card-dark border border-white/5 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-emerald-500">verified_user</span>
              </div>
              <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <span className="material-symbols-outlined">admin_panel_settings</span>
              </div>
              <div>
                <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Administrators</p>
                <p className="text-white text-2xl font-bold">{stats.administrators}</p>
              </div>
            </div>
            <div className="bg-card-dark border border-white/5 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-blue-500">history</span>
              </div>
              <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <div>
                <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Active Today</p>
                <p className="text-white text-2xl font-bold">{stats.activeToday}</p>
              </div>
            </div>
          </div>

          {/* Staff Table */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">search</span>
                  <input
                    className="w-full bg-card-dark border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder-text-secondary/60"
                    placeholder="Search staff by name, email..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="relative min-w-[140px]">
                    <select
                      className="w-full bg-card-dark border border-white/5 rounded-xl py-2.5 pl-3 pr-8 text-white text-sm appearance-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="librarian">Librarian</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none text-lg">expand_more</span>
                  </div>
                  <button className="p-2.5 rounded-xl border border-white/5 bg-card-dark text-text-secondary hover:text-white hover:border-primary/50 transition-colors" title="Export">
                    <span className="material-symbols-outlined text-[20px]">download</span>
                  </button>
                </div>
              </div>
              <div className="bg-card-dark border border-white/5 rounded-2xl overflow-hidden shadow-xl shadow-black/20 flex-1">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-background-dark/50 border-b border-white/5">
                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Details</th>
                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Role</th>
                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Status</th>
                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        <tr>
                          <td colSpan="4" className="px-5 py-8 text-center text-text-secondary">
                            <div className="flex justify-center">
                              <Loader />
                            </div>
                          </td>
                        </tr>
                      ) : filteredStaff.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-5 py-8 text-center text-text-secondary">No staff found</td>
                        </tr>
                      ) : (
                        filteredStaff.map((member) => {
                          const roleBadge = getRoleBadge(member.role);
                          return (
                            <tr key={member._id} className="group hover:bg-white/5 transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="size-9 rounded-full bg-[#3c2348] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
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
                                  <div className="flex flex-col">
                                    <span className="text-white text-sm font-medium">{member.name}</span>
                                    <span className="text-text-secondary text-xs">{member.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                {member.role === 'admin' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                    {roleBadge.label}
                                  </span>
                                ) : member.role === 'librarian' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {roleBadge.label}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    {roleBadge.label}
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${member.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-600'}`}></div>
                                  <span className="text-text-secondary text-xs">{member.isActive ? 'Active' : 'Inactive'}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex justify-end gap-1">
                                  <button 
                                    onClick={() => handleEditStaff(member._id)}
                                    className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-text-secondary transition-colors" 
                                    title="Edit Staff"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteStaff(member._id, member.name)}
                                    className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-text-secondary transition-colors"
                                    title="Deactivate Staff"
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
              </div>
            </div>
            {/* Activity Log Sidebar */}
            <div className="xl:col-span-1 flex flex-col gap-4">
              <div className="bg-card-dark border border-white/5 rounded-2xl overflow-hidden shadow-xl shadow-black/20 h-full flex flex-col">
                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-background-dark/30">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">manage_history</span>
                    Activity Log
                  </h3>
                  <button className="text-xs text-primary hover:text-primary-light font-medium transition-colors">View All</button>
                </div>
                <div className="p-0 flex-1 overflow-y-auto max-h-[600px]">
                  <div className="flex flex-col divide-y divide-white/5/50">
                    <div className="p-4 hover:bg-white/5 transition-colors group">
                      <div className="flex gap-3">
                        <div className="mt-1">
                          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm text-white leading-snug">System auto-archived 3 inactive accounts.</p>
                          <span className="text-[11px] text-text-secondary flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">schedule</span> 3 hours ago
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      <AddStaffModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStaffAdded={() => {
          fetchStaff();
        }}
      />
    </>
  );
}

