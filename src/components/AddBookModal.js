'use client';

import { useState, useEffect, useRef } from 'react';
import { showError, showSuccess, showLoading, close } from '@/lib/swal';

export default function AddBookModal({ isOpen, onClose, onBookAdded }) {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    publishedYear: '',
    genre: '',
    shelfLocation: '',
    stockCount: 1,
    description: '',
    coverImage: null,
    coverImagePreview: null,
    language: 'en',
  });
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddGenreModal, setShowAddGenreModal] = useState(false);
  const [newGenreName, setNewGenreName] = useState('');
  const [addingGenre, setAddingGenre] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?isActive=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddGenre = async () => {
    if (!newGenreName.trim()) {
      showError('Validation Error', 'Genre name is required');
      return;
    }

    setAddingGenre(true);
    const loadingSwal = showLoading('Adding Genre...', 'Please wait while we add the new genre.');

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newGenreName.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create genre');
      }

      close();
      showSuccess('Genre Added!', 'The new genre has been successfully added.');
      
      // Refresh categories list
      await fetchCategories();
      
      // Set the newly created genre as selected
      const newCategory = result.category || result;
      if (newCategory && newCategory._id) {
        setFormData(prev => ({
          ...prev,
          genre: newCategory._id,
        }));
      }
      
      // Reset and close modal
      setNewGenreName('');
      setShowAddGenreModal(false);
    } catch (error) {
      close();
      showError('Error', error.message || 'Failed to add genre. Please try again.');
    } finally {
      setAddingGenre(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStockChange = (delta) => {
    setFormData(prev => ({
      ...prev,
      stockCount: Math.max(1, prev.stockCount + delta),
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      showError('Invalid file type', 'Please upload a valid image file (JPG, PNG, WEBP, or SVG)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showError('File too large', 'Image must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        coverImage: file,
        coverImagePreview: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } };
      handleFileChange(fakeEvent);
    }
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
    if (!formData.title.trim()) {
      showError('Validation Error', 'Book title is required');
      return;
    }
    if (!formData.author.trim()) {
      showError('Validation Error', 'Author is required');
      return;
    }
    if (!formData.genre) {
      showError('Validation Error', 'Please select a genre');
      return;
    }
    if (!formData.coverImage) {
      showError('Validation Error', 'Please upload a cover image');
      return;
    }

    setSubmitting(true);
    const loadingSwal = showLoading('Creating book...', 'Please wait while we add the book to the catalog.');

    try {
      // Upload image first
      const imageUrl = await uploadImage(formData.coverImage);

      // Prepare book data
      const bookData = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        category: formData.genre,
        coverImage: imageUrl,
        copies: formData.stockCount,
        description: formData.description.trim() || undefined,
        isbn: formData.isbn.trim() || undefined,
        publishedDate: formData.publishedYear ? `${formData.publishedYear}-01-01` : undefined,
        language: formData.language || 'en',
      };

      // Create book
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create book');
      }

      close();
      showSuccess('Book Created!', 'The book has been successfully added to the catalog.');
      
      // Reset form
      setFormData({
        title: '',
        author: '',
        isbn: '',
        publishedYear: '',
        genre: '',
        shelfLocation: '',
        stockCount: 1,
        description: '',
        coverImage: null,
        coverImagePreview: null,
        language: 'en',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent to refresh book list
      if (onBookAdded) {
        onBookAdded();
      }
      onClose();
    } catch (error) {
      close();
      showError('Error', error.message || 'Failed to create book. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setFormData({
      title: '',
      author: '',
      isbn: '',
      publishedYear: '',
      genre: '',
      shelfLocation: '',
      stockCount: 1,
      description: '',
      coverImage: null,
      coverImagePreview: null,
      language: 'en',
    });
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
        className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal Card */}
      <div className="relative z-10 flex flex-col w-full max-w-6xl max-h-[90vh] bg-[#1c1022] rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-fade-in-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border-dark bg-[#1c1022]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Add New Book</h1>
            <p className="text-sm text-text-muted mt-1">Enter the details below to add a new title to the catalog.</p>
          </div>
          <button 
            onClick={handleClose}
            disabled={submitting}
            className="group p-2 rounded-full hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-text-muted group-hover:text-white transition-colors">close</span>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row h-full overflow-y-auto custom-scrollbar bg-[#1c1022]">
          {/* Left Column: Form Fields */}
          <div className="flex-1 p-8 space-y-6">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm font-semibold tracking-wide">Book Title</label>
              <input 
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full rounded-lg bg-surface-dark border border-border-dark text-white placeholder-text-muted px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm" 
                placeholder="e.g. The Great Gatsby" 
                type="text"
                required
                disabled={submitting}
              />
            </div>

            {/* Author */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm font-semibold tracking-wide">Author</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3.5 text-text-muted text-[20px]">person</span>
                <input 
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  className="w-full rounded-lg bg-surface-dark border border-border-dark text-white placeholder-text-muted pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm" 
                  placeholder="e.g. F. Scott Fitzgerald" 
                  type="text"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Grid Row: ISBN & Year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-semibold tracking-wide">ISBN-13</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-3.5 text-text-muted text-[20px]">qr_code_2</span>
                  <input 
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleInputChange}
                    className="w-full rounded-lg bg-surface-dark border border-border-dark text-white placeholder-text-muted pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm" 
                    placeholder="978-3-16-148410-0" 
                    type="text"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-semibold tracking-wide">Publication Year</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-3.5 text-text-muted text-[20px]">calendar_today</span>
                  <input 
                    name="publishedYear"
                    value={formData.publishedYear}
                    onChange={handleInputChange}
                    className="w-full rounded-lg bg-surface-dark border border-border-dark text-white placeholder-text-muted pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm" 
                    placeholder="YYYY" 
                    type="number"
                    min="1000"
                    max={new Date().getFullYear()}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            {/* Grid Row: Genre, Shelf, Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-white text-sm font-semibold tracking-wide">Genre</label>
                  <button
                    type="button"
                    onClick={() => setShowAddGenreModal(true)}
                    disabled={submitting}
                    className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                    title="Add New Genre"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Genre
                  </button>
                </div>
                <div className="relative">
                  <select 
                    name="genre"
                    value={formData.genre}
                    onChange={handleInputChange}
                    className="w-full appearance-none rounded-lg bg-surface-dark border border-border-dark text-white placeholder-text-muted px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer"
                    required
                    disabled={submitting}
                  >
                    <option disabled value="">Select Genre</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3.5 text-text-muted pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-semibold tracking-wide">Shelf Location</label>
                <input 
                  name="shelfLocation"
                  value={formData.shelfLocation}
                  onChange={handleInputChange}
                  className="w-full rounded-lg bg-surface-dark border border-border-dark text-white placeholder-text-muted px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm" 
                  placeholder="e.g. A-12" 
                  type="text"
                  disabled={submitting}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-semibold tracking-wide">Stock Count</label>
                <div className="flex items-center h-[50px] rounded-lg bg-surface-dark border border-border-dark overflow-hidden">
                  <button 
                    type="button"
                    onClick={() => handleStockChange(-1)}
                    disabled={submitting || formData.stockCount <= 1}
                    className="h-full px-3 text-text-muted hover:text-white hover:bg-white/5 transition-colors border-r border-border-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <input 
                    name="stockCount"
                    value={formData.stockCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setFormData(prev => ({ ...prev, stockCount: Math.max(1, value) }));
                    }}
                    className="w-full h-full bg-transparent text-center text-white focus:outline-none text-base font-medium appearance-none m-0" 
                    type="number" 
                    min="1"
                    disabled={submitting}
                  />
                  <button 
                    type="button"
                    onClick={() => handleStockChange(1)}
                    disabled={submitting}
                    className="h-full px-3 text-text-muted hover:text-white hover:bg-white/5 transition-colors border-l border-border-dark disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Language Field */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm font-semibold tracking-wide">Language</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3.5 text-text-muted text-[20px]">language</span>
                <select 
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="w-full appearance-none rounded-lg bg-surface-dark border border-border-dark text-white placeholder-text-muted pl-10 pr-10 py-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer"
                  required
                  disabled={submitting}
                >
                  <option value="en">English</option>
                  <option value="bn">Bangla</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3.5 text-text-muted pointer-events-none">expand_more</span>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm font-semibold tracking-wide">Synopsis</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full min-h-[120px] rounded-lg bg-surface-dark border border-border-dark text-white placeholder-text-muted px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm resize-none leading-relaxed" 
                placeholder="Write a brief description of the book..."
                disabled={submitting}
              />
            </div>
          </div>

          {/* Right Column: Image Upload */}
          <div className="w-full lg:w-[400px] bg-[#22132b]/50 p-8 border-t lg:border-t-0 lg:border-l border-border-dark flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-white font-semibold">Cover Image</h3>
              <p className="text-text-muted text-sm">Upload a high-quality book cover to be displayed in the catalog.</p>
            </div>

            {/* Upload Box */}
            <div className="flex-1 flex flex-col">
              <div 
                className={`group relative flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border-dark bg-surface-dark/50 hover:bg-surface-dark hover:border-primary transition-all cursor-pointer min-h-[300px] ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={(e) => {
                  if (!formData.coverImagePreview && !submitting && fileInputRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    fileInputRef.current.click();
                  }
                }}
              >
                {formData.coverImagePreview ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                      src={formData.coverImagePreview} 
                      alt="Cover preview" 
                      className="max-w-full max-h-[300px] object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, coverImage: null, coverImagePreview: null }));
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors"
                      disabled={submitting}
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Illustration/Icon */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                      <div className="relative h-16 w-16 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
                      </div>
                    </div>
                    <div className="text-center space-y-1 px-4">
                      <p className="text-white font-medium group-hover:text-primary transition-colors">Click to upload or drag & drop</p>
                      <p className="text-text-muted text-xs">SVG, PNG, JPG or WEBP (MAX. 800x1200px)</p>
                    </div>
                  </>
                )}
              </div>
              {/* Hidden Input - moved outside to prevent double trigger */}
              <input 
                ref={fileInputRef}
                className="hidden" 
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={submitting}
              />
            </div>

            {/* Preview / Hint Area */}
            <div className="bg-surface-dark border border-border-dark rounded-lg p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-0.5">info</span>
              <div className="text-xs text-text-muted leading-relaxed">
                Recommended aspect ratio is <span className="text-white font-medium">1:1.5</span>. Images will be automatically resized to fit the catalog grid.
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-8 py-5 border-t border-border-dark bg-[#1c1022] flex flex-col-reverse sm:flex-row justify-end items-center gap-4">
          <button 
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-border-dark text-white font-medium hover:bg-surface-dark hover:border-white/20 transition-all text-sm tracking-wide disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-2.5 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover shadow-[0_0_20px_rgba(170,31,239,0.3)] hover:shadow-[0_0_25px_rgba(170,31,239,0.5)] transition-all flex items-center justify-center gap-2 text-sm tracking-wide transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {submitting ? 'Saving...' : 'Save Book'}
          </button>
        </div>
      </div>

      {/* Add Genre Modal */}
      {showAddGenreModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-background-dark/90 backdrop-blur-sm"
            onClick={() => !addingGenre && setShowAddGenreModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-[#1c1022] rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-fade-in-up">
            <div className="px-6 py-5 border-b border-border-dark bg-[#1c1022] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Add New Genre</h2>
                <p className="text-sm text-text-muted mt-1">Create a new genre category for books.</p>
              </div>
              <button 
                onClick={() => !addingGenre && setShowAddGenreModal(false)}
                disabled={addingGenre}
                className="group p-2 rounded-full hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-text-muted group-hover:text-white transition-colors">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-semibold tracking-wide">Genre Name</label>
                <input 
                  value={newGenreName}
                  onChange={(e) => setNewGenreName(e.target.value)}
                  className="w-full rounded-lg bg-surface-dark border border-border-dark text-white placeholder-text-muted px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm" 
                  placeholder="e.g. Science Fiction, Mystery, Biography"
                  type="text"
                  disabled={addingGenre}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !addingGenre && newGenreName.trim()) {
                      e.preventDefault();
                      handleAddGenre();
                    }
                  }}
                />
              </div>
            </div>
            <div className="px-6 py-5 border-t border-border-dark bg-[#1c1022] flex flex-col-reverse sm:flex-row justify-end items-center gap-4">
              <button 
                type="button"
                onClick={() => setShowAddGenreModal(false)}
                disabled={addingGenre}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-border-dark text-white font-medium hover:bg-surface-dark hover:border-white/20 transition-all text-sm tracking-wide disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleAddGenre}
                disabled={addingGenre || !newGenreName.trim()}
                className="w-full sm:w-auto px-8 py-2.5 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover shadow-[0_0_20px_rgba(170,31,239,0.3)] hover:shadow-[0_0_25px_rgba(170,31,239,0.5)] transition-all flex items-center justify-center gap-2 text-sm tracking-wide transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                {addingGenre ? 'Adding...' : 'Add Genre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

