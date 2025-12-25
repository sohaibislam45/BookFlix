'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LibrarianHeader from '@/components/LibrarianHeader';
import Link from 'next/link';

export default function LibrarianMembersPage() {
  const { userData } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [searchQuery, tierFilter, statusFilter]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      // Note: You may need to create a dedicated members API endpoint
      // For now, this is a placeholder - the API should filter by role=member
      const response = await fetch('/api/users?role=member&limit=50');
      if (response.ok) {
        const data = await response.json();
        setMembers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadge = (subscriptionType) => {
    const badges = {
      free: { label: 'Standard', color: 'gray', bgColor: 'gray-500/10', borderColor: 'gray-500/20', textColor: 'gray-300' },
      monthly: { label: 'Premium', color: 'amber', bgColor: 'amber-500/10', borderColor: 'amber-500/20', textColor: 'amber-300' },
      yearly: { label: 'Premium', color: 'amber', bgColor: 'amber-500/10', borderColor: 'amber-500/20', textColor: 'amber-300' },
    };
    return badges[subscriptionType] || badges.free;
  };

  const getStatusBadge = (member) => {
    // This would need to check for active borrowings, overdue items, etc.
    // For now, placeholder
    return {
      label: 'Active',
      color: 'emerald',
      dot: 'emerald-500',
    };
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const filteredMembers = members.filter((member) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !member.name?.toLowerCase().includes(query) &&
        !member.email?.toLowerCase().includes(query) &&
        !member._id.toString().toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (tierFilter && member.subscription?.type !== tierFilter) {
      return false;
    }
    return true;
  });

  return (
    <>
      <LibrarianHeader title="Member Management" subtitle="Manage patrons, update details, and handle tiers." />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md min-w-[300px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-[20px]">search</span>
              <input
                className="w-full bg-surface-dark border border-surface-border rounded-lg h-10 pl-10 pr-4 text-sm text-white placeholder-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="Search by name, email, or member ID..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                className="bg-surface-dark border border-surface-border rounded-lg h-10 px-3 text-sm text-white focus:ring-1 focus:ring-primary outline-none cursor-pointer hover:border-text-secondary/50 transition-colors"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
              >
                <option value="">All Tiers</option>
                <option value="free">Standard</option>
                <option value="monthly">Premium</option>
                <option value="yearly">Premium</option>
              </select>
              <select
                className="bg-surface-dark border border-surface-border rounded-lg h-10 px-3 text-sm text-white focus:ring-1 focus:ring-primary outline-none cursor-pointer hover:border-text-secondary/50 transition-colors"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <button className="bg-surface-dark hover:bg-surface-border border border-surface-border text-white text-sm font-medium h-10 px-4 rounded-lg flex items-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-[18px]">file_download</span>
                Export CSV
              </button>
              <Link
                href="/librarian/members/add"
                className="bg-primary hover:bg-primary-hover text-white text-sm font-bold h-10 px-4 rounded-lg flex items-center gap-2 shadow-[0_0_20px_rgba(170,31,239,0.3)] transition-all hover:shadow-[0_0_25px_rgba(170,31,239,0.5)]"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add New Member
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-dark overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border bg-white/5">
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[25%]">Member</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[25%]">Contact Info</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[15%]">Tier</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[15%]">Active Loans</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[10%]">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-text-secondary">
                      Loading members...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-text-secondary">
                      No members found
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const tierBadge = getTierBadge(member.subscription?.type || 'free');
                    const statusBadge = getStatusBadge(member);
                    return (
                      <tr key={member._id} className="group hover:bg-white/5 transition-colors cursor-pointer border-l-2 border-l-transparent hover:border-l-primary">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-blue-500/20"
                              style={{
                                backgroundImage: member.profilePhoto ? `url('${member.profilePhoto}')` : 'none',
                              }}
                            >
                              {!member.profilePhoto && getInitials(member.name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors">
                                {member.name || 'Unknown Member'}
                              </p>
                              <p className="text-xs text-text-secondary">ID: #{member._id.toString().slice(-4)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-text-secondary flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-text-secondary/70">mail</span>
                            {member.email || 'N/A'}
                          </p>
                          {member.phone && (
                            <p className="text-xs text-text-secondary mt-1 pl-6">{member.phone}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                    tierBadge.color === 'gray'
                      ? 'bg-gray-500/10 text-gray-300 border-gray-500/20'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}
                >
                            {tierBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-white">--</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-sm text-white">{statusBadge.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={`/librarian/members/${member._id}`}
                              className="p-2 rounded-lg hover:bg-surface-border text-text-secondary hover:text-white transition-all"
                              title="View History"
                            >
                              <span className="material-symbols-outlined text-[20px]">history</span>
                            </Link>
                            <Link
                              href={`/librarian/members/${member._id}/edit`}
                              className="p-2 rounded-lg hover:bg-primary/20 text-text-secondary hover:text-primary transition-all"
                              title="Edit Info"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-text-secondary px-2">
            <p>Showing {filteredMembers.length} of {members.length} members</p>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-md hover:bg-surface-border transition-colors disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-3 py-1.5 rounded-md hover:bg-surface-border transition-colors">Next</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

