'use client';

import { useState, useRef, useEffect } from 'react';
import { showError, showSuccess, showLoading, close } from '@/lib/swal';

export default function AddNewMemberModal({ isOpen, onClose, onMemberAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    streetAddress: '',
    city: '',
    state: 'NY',
    zip: '',
    tier: 'premium',
    password: 'Library123!',
    profilePhoto: null,
    profilePhotoPreview: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        streetAddress: '',
        city: '',
        state: 'NY',
        zip: '',
        tier: 'premium',
        password: 'Library123!',
        profilePhoto: null,
        profilePhotoPreview: null,
      });
      setShowPassword(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

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
    const formDataToUpload = new FormData();
    formDataToUpload.append('image', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formDataToUpload,
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

    setSubmitting(true);
    const loadingSwal = showLoading('Creating member...', 'Please wait while we add the new member.');

    try {
      let profilePhotoUrl = null;
      
      // Upload image if one was selected
      if (formData.profilePhoto) {
        setUploading(true);
        profilePhotoUrl = await uploadImage(formData.profilePhoto);
        setUploading(false);
      }

      // Prepare address object
      const address = {
        state: formData.state || undefined,
        city: formData.city || undefined,
        street: formData.streetAddress || undefined,
        zip: formData.zip || undefined,
      };

      const response = await fetch('/api/admin/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          profilePhoto: profilePhotoUrl,
          address: address,
          tier: formData.tier,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create member');
      }

      close();
      showSuccess(
        'Member Created!',
        'The member has been successfully added to the library system.'
      );

      // Notify parent to refresh members list
      if (onMemberAdded) {
        onMemberAdded();
      }
      onClose();
    } catch (error) {
      close();
      showError('Error', error.message || 'Failed to create member. Please try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 z-0 bg-background-dark/80 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-5xl rounded-2xl border border-border-dark shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up" style={{ background: 'rgba(43, 25, 52, 0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border-dark bg-[#150c19]/50">
          <div className="flex flex-col gap-1">
            <h2 className="text-white text-2xl font-bold tracking-tight">Add New Member</h2>
            <p className="text-white/60 text-sm font-normal">Create a new user profile for the Bookflix library system.</p>
          </div>
          <button 
            onClick={handleClose}
            disabled={submitting}
            className="text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Modal Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
          <form className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12" onSubmit={handleSubmit}>
            {/* Left Column: Avatar & Basic Info */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4 p-6 bg-[#150c19]/30 rounded-xl border border-border-dark/50">
                <div className="relative group cursor-pointer" onClick={() => !submitting && fileInputRef.current?.click()}>
                  <div className="w-32 h-32 rounded-full bg-[#150c19] border-4 border-border-dark flex items-center justify-center overflow-hidden relative">
                    {formData.profilePhotoPreview ? (
                      <img src={formData.profilePhotoPreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-white/20 text-5xl group-hover:hidden">person</span>
                    )}
                    {/* Overlay on Hover */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-3xl">upload</span>
                    </div>
                  </div>
                  <div className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-2 border-4 border-surface-dark flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-sm font-bold">add_a_photo</span>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={submitting}
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-white font-medium text-sm">Profile Photo</h3>
                  <p className="text-white/40 text-xs mt-1">Accepts .jpg, .png, .webp up to 2MB</p>
                </div>
                <button 
                  type="button"
                  onClick={() => !submitting && fileInputRef.current?.click()}
                  className="w-full py-2 px-4 rounded-lg border border-border-dark bg-transparent hover:bg-white/5 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={submitting}
                >
                  <span className="material-symbols-outlined text-lg">upload_file</span>
                  Upload Photo
                </button>
              </div>

              {/* Membership Tier Selector */}
              <div className="flex flex-col gap-3">
                <label className="text-white/80 text-sm font-semibold uppercase tracking-wider">Membership Tier</label>
                <div className="grid grid-cols-1 gap-3">
                  {/* Standard Option */}
                  <label className={`relative flex cursor-pointer rounded-xl border border-border-dark p-4 shadow-sm hover:border-primary/50 focus:outline-none transition-all ${formData.tier === 'standard' ? 'border-primary bg-primary/10' : ''}`}>
                    <input 
                      className="peer sr-only" 
                      name="tier" 
                      type="radio" 
                      value="standard"
                      checked={formData.tier === 'standard'}
                      onChange={handleInputChange}
                      disabled={submitting}
                    />
                    <span className="flex flex-1">
                      <span className="flex flex-col">
                        <span className="block text-sm font-medium text-white">Standard</span>
                        <span className="mt-1 flex items-center text-xs text-white/50">Basic catalog access • 2 books/mo</span>
                      </span>
                    </span>
                    <span className={`material-symbols-outlined text-xl self-center ${formData.tier === 'standard' ? 'text-primary' : 'text-white/20'}`}>check_circle</span>
                  </label>
                  {/* Premium Option */}
                  <label className={`relative flex cursor-pointer rounded-xl border border-border-dark p-4 shadow-sm hover:border-primary/50 focus:outline-none transition-all ${formData.tier === 'premium' ? 'border-primary bg-primary/10' : ''}`}>
                    <input 
                      className="peer sr-only" 
                      name="tier" 
                      type="radio" 
                      value="premium"
                      checked={formData.tier === 'premium'}
                      onChange={handleInputChange}
                      disabled={submitting}
                    />
                    <span className="flex flex-1">
                      <span className="flex flex-col">
                        <span className="block text-sm font-medium text-white">Premium</span>
                        <span className="mt-1 flex items-center text-xs text-white/50">Full access • Offline mode • Unlimited</span>
                      </span>
                    </span>
                    <span className={`material-symbols-outlined text-xl self-center ${formData.tier === 'premium' ? 'text-primary' : 'text-white/20'}`}>check_circle</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Form Inputs */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              {/* Personal Details Section */}
              <div className="space-y-4">
                <h3 className="text-white text-lg font-semibold flex items-center gap-2 border-b border-border-dark pb-2">
                  <span className="material-symbols-outlined text-primary">person</span>
                  Personal Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-white/80 text-sm font-medium">Full Name</span>
                    <input 
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-[#150c19] border border-border-dark rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                      placeholder="e.g. Jane Doe" 
                      type="text"
                      required
                      disabled={submitting}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-white/80 text-sm font-medium">Phone Number</span>
                    <input 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-[#150c19] border border-border-dark rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                      placeholder="e.g. +1 (555) 000-0000" 
                      type="tel"
                      disabled={submitting}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-2">
                  <span className="text-white/80 text-sm font-medium">Street Address</span>
                  <input 
                    name="streetAddress"
                    value={formData.streetAddress}
                    onChange={handleInputChange}
                    className="w-full bg-surface-darker border border-border-dark rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                    placeholder="e.g. 123 Library Lane, Apt 4B" 
                    type="text"
                    disabled={submitting}
                  />
                </label>
                <div className="grid grid-cols-6 gap-4">
                  <label className="flex flex-col gap-2 col-span-3">
                    <span className="text-white/80 text-sm font-medium">City</span>
                    <input 
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full bg-[#150c19] border border-border-dark rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                      placeholder="New York" 
                      type="text"
                      disabled={submitting}
                    />
                  </label>
                  <label className="flex flex-col gap-2 col-span-2">
                    <span className="text-white/80 text-sm font-medium">State</span>
                    <div className="relative">
                      <select 
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full bg-surface-darker border border-border-dark rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
                        disabled={submitting}
                      >
                        <option value="NY">NY</option>
                        <option value="CA">CA</option>
                        <option value="TX">TX</option>
                        <option value="FL">FL</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">expand_more</span>
                    </div>
                  </label>
                  <label className="flex flex-col gap-2 col-span-1">
                    <span className="text-white/80 text-sm font-medium">Zip</span>
                    <input 
                      name="zip"
                      value={formData.zip}
                      onChange={handleInputChange}
                      className="w-full bg-[#150c19] border border-border-dark rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                      placeholder="10001" 
                      type="text"
                      disabled={submitting}
                    />
                  </label>
                </div>
              </div>

              {/* Account Details Section */}
              <div className="space-y-4">
                <h3 className="text-white text-lg font-semibold flex items-center gap-2 border-b border-border-dark pb-2">
                  <span className="material-symbols-outlined text-primary">lock</span>
                  Account Credentials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-white/80 text-sm font-medium">Email Address</span>
                    <input 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-[#150c19] border border-border-dark rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                      placeholder="name@example.com" 
                      type="email"
                      required
                      disabled={submitting}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-white/80 text-sm font-medium">Temporary Password</span>
                    <div className="relative">
                      <input 
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full bg-surface-darker border border-border-dark rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all pr-10" 
                        placeholder="••••••••" 
                        type={showPassword ? 'text' : 'password'}
                        disabled={submitting}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                        disabled={submitting}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer (Action Bar) */}
        <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-border-dark bg-[#150c19]/80 backdrop-blur-md">
          <button 
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="px-6 py-2.5 rounded-lg bg-primary hover:bg-[#8a19c2] text-white shadow-[0_0_15px_rgba(170,31,239,0.3)] hover:shadow-[0_0_20px_rgba(170,31,239,0.5)] transition-all text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-lg">save</span>
            {submitting ? 'Saving...' : 'Save Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

