'use client';

import { useState, useRef } from 'react';
import { showError, showSuccess, showLoading, close } from '@/lib/swal';

export default function AddStaffModal({ isOpen, onClose, onStaffAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    profilePhoto: null,
    profilePhotoPreview: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError('Invalid file type', 'Please upload a valid image file (JPG, PNG, or WEBP)');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      showError('File too large', 'Image must be less than 2MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        profilePhoto: file,
        profilePhotoPreview: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    const data = await response.json();
    return data.url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      showError('Validation Error', 'Full name is required');
      return;
    }

    if (!formData.email.trim()) {
      showError('Validation Error', 'Email address is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      showError('Validation Error', 'Please enter a valid email address');
      return;
    }

    if (!formData.role) {
      showError('Validation Error', 'Please select a role');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      showError('Validation Error', 'Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    const loadingSwal = showLoading('Creating staff member...', 'Please wait while we add the new staff member.');

    try {
      let profilePhotoUrl = null;
      
      // Upload image if one was selected
      if (formData.profilePhoto) {
        setUploading(true);
        profilePhotoUrl = await uploadImage(formData.profilePhoto);
        setUploading(false);
      }

      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          password: formData.password,
          profilePhoto: profilePhotoUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create staff member');
      }

      close();
      showSuccess(
        'Staff Member Created!',
        `The staff member has been successfully added. Temporary password: ${result.tempPassword || formData.password}`
      );

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '',
        password: '',
        profilePhoto: null,
        profilePhotoPreview: null,
      });
      setShowPassword(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent to refresh staff list
      if (onStaffAdded) {
        onStaffAdded();
      }
      onClose();
    } catch (error) {
      close();
      showError('Error', error.message || 'Failed to create staff member. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '',
        password: '',
        profilePhoto: null,
        profilePhotoPreview: null,
      });
      setShowPassword(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0f0913]/80 backdrop-blur-sm z-40 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal Container */}
      <div className="relative z-50 w-full max-w-2xl bg-background-dark border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all animate-fade-in-up box-border ring-1 ring-white/10">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 md:px-8 pt-8 pb-4 bg-background-dark">
          <div className="flex flex-col gap-2">
            <h2 className="text-white text-[28px] font-bold leading-tight tracking-tight">Add New Staff</h2>
            <p className="text-text-muted text-sm font-normal">Grant access permissions to a new team member.</p>
          </div>
          <button 
            aria-label="Close modal"
            onClick={handleClose}
            disabled={submitting}
            className="group text-text-muted hover:text-white transition-colors p-1.5 rounded-lg hover:bg-surface-dark disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Modal Body / Form */}
        <div className="flex-1 overflow-y-auto p-6 md:px-8 py-2 custom-scrollbar">
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm font-medium leading-normal ml-1">Full Name</label>
              <div className="relative group">
                <input 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full h-14 rounded-lg bg-surface-dark border border-white/5 text-white placeholder-text-muted/60 px-[15px] text-base font-normal leading-normal focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200" 
                  placeholder="Enter full name" 
                  type="text"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-medium leading-normal ml-1">Email Address</label>
                <div className="relative group">
                  <input 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full h-14 rounded-lg bg-surface-dark border border-white/5 text-white placeholder-text-muted/60 px-[15px] pr-12 text-base font-normal leading-normal focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200" 
                    placeholder="colleague@bookflix.com" 
                    type="email"
                    required
                    disabled={submitting}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-medium leading-normal ml-1">Phone Number</label>
                <div className="relative group">
                  <input 
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full h-14 rounded-lg bg-surface-dark border border-white/5 text-white placeholder-text-muted/60 px-[15px] pr-12 text-base font-normal leading-normal focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200" 
                    placeholder="+1 (555) 000-0000" 
                    type="tel"
                    disabled={submitting}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">call</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Photo */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm font-medium leading-normal ml-1">Profile Photo</label>
              <div className="relative">
                <div 
                  className="w-full h-32 rounded-lg bg-surface-dark border border-white/5 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
                  onClick={() => !submitting && fileInputRef.current?.click()}
                >
                  {formData.profilePhotoPreview ? (
                    <img 
                      src={formData.profilePhotoPreview} 
                      alt="Profile preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-text-muted">
                      <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                      <span className="text-sm">Click to upload photo</span>
                    </div>
                  )}
                </div>
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={submitting}
                />
                {formData.profilePhotoPreview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData(prev => ({ ...prev, profilePhoto: null, profilePhotoPreview: null }));
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors"
                    disabled={submitting}
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Role & Password Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Role Select */}
              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-medium leading-normal ml-1">Assign Role</label>
                <div className="relative group">
                  <select 
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full h-14 rounded-lg bg-surface-dark border border-white/5 text-white px-[15px] pr-12 text-base font-normal leading-normal focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 cursor-pointer appearance-none"
                    required
                    disabled={submitting}
                  >
                    <option disabled value="">Select a role</option>
                    <option value="librarian">Librarian</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[24px]">expand_more</span>
                  </div>
                </div>
              </div>
              {/* Password Input */}
              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-medium leading-normal ml-1">Temporary Password</label>
                <div className="relative group">
                  <input 
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full h-14 rounded-lg bg-surface-dark border border-white/5 text-white placeholder-text-muted/60 px-[15px] pr-12 text-base font-normal leading-normal focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200" 
                    placeholder="Create a password" 
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={submitting}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-white hover:bg-[#3d254a] rounded-md transition-colors"
                    disabled={submitting}
                  >
                    <span className="material-symbols-outlined text-[20px] block">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-6 md:px-8 bg-background-dark border-t border-border-dark flex flex-col-reverse md:flex-row justify-end gap-3 mt-2">
          <button 
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="h-11 px-6 rounded-lg text-sm font-medium text-text-muted hover:text-white hover:bg-surface-dark transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="h-11 px-6 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-[#901bc9] active:scale-[0.98] transition-all duration-200 shadow-glow hover:shadow-glow-active flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {submitting ? 'Creating...' : 'Save Staff Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

