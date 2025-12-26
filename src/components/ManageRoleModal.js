'use client';

import { useState, useEffect } from 'react';
import { showError, showSuccess, showLoading, close } from '@/lib/swal';

export default function ManageRoleModal({ isOpen, onClose, onRoleUpdated }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
    }
  }, [isOpen]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/staff?limit=100');
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      showError('Error', 'Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (staffId, newRole, staffName) => {
    setUpdating(prev => ({ ...prev, [staffId]: true }));
    const loadingSwal = showLoading('Updating role...', 'Please wait while we update the role.');

    try {
      const response = await fetch('/api/admin/staff', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: staffId,
          updates: {
            role: newRole,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update role');
      }

      close();
      showSuccess('Role Updated!', `"${staffName}" role has been successfully updated to ${newRole}.`);

      // Update local state
      setStaff(prev => prev.map(s => 
        s._id === staffId ? { ...s, role: newRole } : s
      ));

      if (onRoleUpdated) {
        onRoleUpdated();
      }
    } catch (error) {
      close();
      showError('Error', error.message || 'Failed to update role. Please try again.');
    } finally {
      setUpdating(prev => ({ ...prev, [staffId]: false }));
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrator',
      librarian: 'Librarian',
    };
    return labels[role] || role;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0f0913]/80 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative z-50 w-full max-w-4xl bg-background-dark border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all animate-fade-in-up box-border ring-1 ring-white/10">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 md:px-8 pt-8 pb-4 bg-background-dark">
          <div className="flex flex-col gap-2">
            <h2 className="text-white text-[28px] font-bold leading-tight tracking-tight">Manage Roles</h2>
            <p className="text-text-muted text-sm font-normal">Update staff member roles and permissions.</p>
          </div>
          <button 
            aria-label="Close modal"
            onClick={onClose}
            disabled={loading}
            className="group text-text-muted hover:text-white transition-colors p-1.5 rounded-lg hover:bg-surface-dark disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 md:px-8 py-2 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-text-secondary">Loading staff members...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {staff.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">No staff members found</div>
              ) : (
                staff.map((member) => (
                  <div 
                    key={member._id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-surface-dark border border-white/5 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-full bg-[#3c2348] flex items-center justify-center text-white text-xs font-bold">
                        {member.name ? (member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)) : 'U'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{member.name}</p>
                        <p className="text-text-secondary text-xs">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative group">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member._id, e.target.value, member.name)}
                          disabled={updating[member._id]}
                          className="h-11 px-4 pr-10 rounded-lg bg-background-dark border border-white/5 text-white text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 cursor-pointer appearance-none disabled:opacity-50"
                        >
                          <option value="librarian">Librarian</option>
                          <option value="admin">Administrator</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none text-lg">expand_more</span>
                      </div>
                      {updating[member._id] && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 md:px-8 bg-background-dark border-t border-white/5 flex justify-end gap-3 mt-2">
          <button 
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-11 px-6 rounded-lg text-sm font-medium text-text-muted hover:text-white hover:bg-surface-dark transition-all duration-200 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

