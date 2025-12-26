'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminHeader from '@/components/AdminHeader';
import Link from 'next/link';
import Loader from '@/components/Loader';
import AddBookModal from '@/components/AddBookModal';
import EditBookModal from '@/components/EditBookModal';
import { showError, showSuccess, showInput, showConfirm } from '@/lib/swal';
import swalTheme from '@/lib/swal';
import Swal from 'sweetalert2';

export default function AdminBooksPage() {
  const { userData } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalInventory: 0,
    borrowed: 0,
    available: 0,
    lowStock: 0,
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState(null);
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);

  useEffect(() => {
    fetchBooks();
    fetchStats();
    fetchGenres();
  }, [searchQuery]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '10',
        ...(searchQuery && { search: searchQuery }),
      });
      const response = await fetch(`/api/books?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || []);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalInventory: data.totalCopies || 0,
          borrowed: data.borrowedCopies || 0,
          available: data.availableCopies || 0,
          lowStock: 15, // Mock data
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchGenres = async () => {
    try {
      setGenresLoading(true);
      const response = await fetch('/api/categories?isActive=true');
      if (response.ok) {
        const data = await response.json();
        setGenres(data);
      } else {
        showError('Error', 'Failed to fetch genres');
      }
    } catch (error) {
      console.error('Error fetching genres:', error);
      showError('Error', 'Failed to fetch genres');
    } finally {
      setGenresLoading(false);
    }
  };

  const handleEditBook = (bookId) => {
    setEditingBookId(bookId);
    setIsEditModalOpen(true);
  };

  const handleManageStock = async (bookId, bookTitle) => {
    // Show input for stock count
    const result = await showInput(
      'Manage Stock',
      `Enter the number of copies for "${bookTitle}"`,
      {},
      {
        inputPlaceholder: 'Enter number of copies...',
        inputType: 'number',
        inputValue: '1',
        inputValidator: (value) => {
          const num = parseInt(value);
          if (!value || isNaN(num) || num < 1) {
            return 'Please enter a valid number (minimum 1)';
          }
          if (num > 1000) {
            return 'Maximum 1000 copies allowed';
          }
          return null;
        },
        confirmButtonText: 'Update Stock',
        cancelButtonText: 'Cancel',
      }
    );

    if (result.isConfirmed && result.value) {
      try {
        const stockCount = parseInt(result.value);
        // TODO: Implement stock management API call
        showSuccess('Stock Updated!', `Stock count for "${bookTitle}" has been updated to ${stockCount} copies.`);
        fetchBooks(); // Refresh the books list
      } catch (error) {
        console.error('Error updating stock:', error);
        showError('Error', 'Failed to update stock. Please try again.');
      }
    }
  };

  const handleDeleteBook = async (bookId, bookTitle) => {
    const result = await showConfirm(
      'Delete Book',
      `Are you sure you want to delete "${bookTitle}"? This action will deactivate the book and all its copies.`,
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
      }
    );

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/books/${bookId}`, {
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
          showSuccess('Book Deleted!', `"${bookTitle}" has been successfully deleted.`);
          fetchBooks(); // Refresh the books list
          fetchStats(); // Refresh stats
        } else {
          const errorMessage = data?.error || data?.message || `Failed to delete book (${response.status})`;
          showError('Error', errorMessage);
        }
      } catch (error) {
        console.error('Error deleting book:', error);
        showError('Error', error.message || 'Failed to delete book. Please try again.');
      }
    }
  };

  const handleDeleteGenre = async (genreId, genreName) => {
    const result = await showConfirm(
      'Delete Genre',
      `Are you sure you want to delete the genre "${genreName}"? This action cannot be undone.`,
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
      }
    );

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/categories?id=${genreId}`, {
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
          showSuccess('Genre Deleted!', `The genre "${genreName}" has been successfully deleted.`);
          fetchGenres(); // Refresh the genres list
        } else {
          const errorMessage = data?.error || data?.message || `Failed to delete genre (${response.status})`;
          showError('Error', errorMessage);
        }
      } catch (error) {
        console.error('Error deleting genre:', error);
        showError('Error', error.message || 'Failed to delete genre. Please try again.');
      }
    }
  };

  const handleAddGenre = async () => {
    const result = await swalTheme.fire({
      title: 'Add New Genre',
      html: `
        <div style="text-align: left; margin-top: 1rem;">
          <label style="display: block; color: #b791ca; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
            Genre Name <span style="color: #ef4444;">*</span>
          </label>
          <input 
            id="swal-genre-name" 
            class="swal-input" 
            type="text" 
            placeholder="e.g. Fiction, Science Fiction, Mystery..."
            style="width: 100%; margin-bottom: 1rem;"
            maxlength="100"
          />
          <label style="display: block; color: #b791ca; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
            Description (Optional)
          </label>
          <textarea 
            id="swal-genre-description" 
            class="swal-input" 
            placeholder="Enter a brief description of this genre..."
            style="width: 100%; min-height: 80px; resize: vertical; font-family: inherit;"
            maxlength="500"
          ></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Create Genre',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#aa1fef',
      cancelButtonColor: '#3c2348',
      background: '#1c1c1c',
      color: '#ffffff',
      customClass: {
        popup: 'swal-popup',
        confirmButton: 'swal-confirm',
        cancelButton: 'swal-cancel',
      },
      preConfirm: () => {
        const nameInput = document.getElementById('swal-genre-name');
        const descriptionInput = document.getElementById('swal-genre-description');
        const name = nameInput?.value?.trim() || '';
        const description = descriptionInput?.value?.trim() || '';

        if (!name || name.length === 0) {
          Swal.showValidationMessage('Genre name is required');
          return false;
        }
        if (name.length < 2) {
          Swal.showValidationMessage('Genre name must be at least 2 characters');
          return false;
        }
        if (name.length > 100) {
          Swal.showValidationMessage('Genre name must be no more than 100 characters');
          return false;
        }
        if (description.length > 500) {
          Swal.showValidationMessage('Description must be no more than 500 characters');
          return false;
        }

        return { name, description };
      },
    });

    if (result.isConfirmed && result.value) {
      try {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: result.value.name,
            description: result.value.description || undefined,
          }),
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
          showSuccess('Genre Created!', `The genre "${data.category.name}" has been successfully created.`);
          fetchGenres(); // Refresh the genres list
        } else {
          const errorMessage = data?.error || data?.message || `Failed to create genre (${response.status})`;
          showError('Error', errorMessage);
        }
      } catch (error) {
        console.error('Error creating genre:', error);
        showError('Error', error.message || 'Failed to create genre. Please try again.');
      }
    }
  };

  const getStockStatus = (book) => {
    const available = book.availableCopies || 0;
    if (available === 0) return { label: 'Out of Stock', color: 'red', textColor: 'red-400' };
    if (available <= 2) return { label: 'Low Stock', color: 'orange', textColor: 'orange-400' };
    return { label: 'Available', color: 'emerald', textColor: 'emerald-400' };
  };

  return (
    <>
      <AdminHeader title="Admin Books Management" subtitle="Comprehensive inventory control, stock management, and catalog reporting." />
      <div className="flex-1 overflow-y-auto">
        <header className="px-8 py-6 border-b border-white/5 bg-background-dark z-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <span className="hover:text-white cursor-pointer transition-colors">Dashboard</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  <span className="text-white font-medium">Books Management</span>
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight mt-1">Admin Books Management</h1>
                <p className="text-text-secondary text-sm max-w-2xl mt-1">Comprehensive inventory control, stock management, and catalog reporting.</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 bg-card-dark hover:bg-white/5 text-text-secondary hover:text-white px-4 py-2.5 rounded-lg font-medium transition-all border border-white/5 shadow-md">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                  Reports
                </button>
                <button className="flex items-center gap-2 bg-card-dark hover:bg-white/5 text-text-secondary hover:text-white px-4 py-2.5 rounded-lg font-medium transition-all border border-white/5 shadow-md">
                  <span className="material-symbols-outlined text-[20px]">upload_file</span>
                  Bulk Import
                </button>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Add New Book
                </button>
              </div>
            </div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card-dark p-4 rounded-xl border border-white/5 flex items-center gap-4 hover:border-primary/50 transition-colors group cursor-pointer shadow-lg">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">library_books</span>
                </div>
                <div>
                  <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Total Inventory</p>
                  <p className="text-2xl font-bold text-white">{stats.totalInventory.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-card-dark p-4 rounded-xl border border-white/5 flex items-center gap-4 hover:border-primary/50 transition-colors group cursor-pointer shadow-lg">
                <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">outbound</span>
                </div>
                <div>
                  <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Borrowed</p>
                  <p className="text-2xl font-bold text-white">{stats.borrowed.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-card-dark p-4 rounded-xl border border-white/5 flex items-center gap-4 hover:border-primary/50 transition-colors group cursor-pointer shadow-lg">
                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <div>
                  <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Available</p>
                  <p className="text-2xl font-bold text-white">{stats.available.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-card-dark p-4 rounded-xl border border-white/5 flex items-center gap-4 hover:border-primary/50 transition-colors group cursor-pointer shadow-lg">
                <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">warning</span>
                </div>
                <div>
                  <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Low Stock</p>
                  <p className="text-2xl font-bold text-white">{stats.lowStock}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="px-8 py-4 bg-background-dark/90 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between sticky top-0 z-10 backdrop-blur-md shadow-md">
          <div className="flex-1 w-full sm:w-auto relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">search</span>
            <input
              className="w-full bg-card-dark border border-white/5 text-white placeholder-text-secondary pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none text-sm transition-all shadow-sm"
              placeholder="Search by title, ISBN, author..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <div className="flex items-center gap-2 bg-card-dark rounded-lg p-1 border border-white/5 shadow-sm">
              <button className="px-3 py-1.5 rounded bg-primary/20 text-white text-sm font-medium">All</button>
              <button className="px-3 py-1.5 rounded hover:bg-white/5 text-text-secondary hover:text-white text-sm font-medium transition-colors">Physical</button>
              <button className="px-3 py-1.5 rounded hover:bg-white/5 text-text-secondary hover:text-white text-sm font-medium transition-colors">Digital</button>
            </div>
            <div className="h-6 w-px bg-white/5 mx-1 hidden sm:block"></div>
            <button className="flex items-center gap-2 px-3 py-2 bg-card-dark hover:bg-white/5 rounded-lg text-text-secondary hover:text-white text-sm font-medium transition-colors border border-white/5 whitespace-nowrap shadow-sm">
              <span className="material-symbols-outlined text-[18px]">category</span>
              Categories
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-card-dark hover:bg-white/5 rounded-lg text-text-secondary hover:text-white text-sm font-medium transition-colors border border-white/5 whitespace-nowrap shadow-sm">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Filters
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 pt-6 space-y-6">
          {/* Genres Table Section */}
          <div className="bg-card-dark rounded-xl border border-white/5 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-background-dark border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Genres</h2>
                <p className="text-text-secondary text-sm mt-1">Manage book genres and categories</p>
              </div>
              <button
                onClick={handleAddGenre}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add New Genre
              </button>
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-background-dark">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Created</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {genresLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-text-secondary">
                      <div className="flex justify-center">
                        <Loader />
                      </div>
                    </td>
                  </tr>
                ) : genres.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-text-secondary">
                      No genres found. Click "Add New Genre" to create one.
                    </td>
                  </tr>
                ) : (
                  genres.map((genre) => (
                    <tr key={genre._id} className="group hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {genre.icon && (
                            <span className="material-symbols-outlined text-text-secondary text-[18px]">{genre.icon}</span>
                          )}
                          <span className="text-white font-semibold text-sm">
                            {genre.name.charAt(0).toUpperCase() + genre.name.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-text-secondary tracking-wide">{genre.slug}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-text-secondary text-sm">
                          {genre.description || <span className="italic text-text-secondary">No description</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          genre.isActive 
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-300 border border-red-500/20'
                        }`}>
                          {genre.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-text-secondary text-xs">
                          {genre.createdAt ? new Date(genre.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteGenre(genre._id, genre.name)}
                          className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-60 group-hover:opacity-100"
                          title="Delete Genre"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Books Table Section */}
          <div className="bg-card-dark rounded-xl border border-white/5 shadow-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-background-dark">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-4 w-12 text-center">
                    <input className="rounded border-white/5 bg-background-dark text-primary focus:ring-primary/50 cursor-pointer" type="checkbox" />
                  </th>
                  <th className="px-4 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider w-20">Thumbnail</th>
                  <th className="px-4 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Book Details</th>
                  <th className="px-4 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider w-36">ISBN</th>
                  <th className="px-4 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider w-24 text-center">Total</th>
                  <th className="px-4 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider w-24 text-center">Available</th>
                  <th className="px-4 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider w-32">Shelf</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider w-44 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-text-secondary">
                      <div className="flex justify-center">
                        <Loader />
                      </div>
                    </td>
                  </tr>
                ) : books.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-text-secondary">No books found</td>
                  </tr>
                ) : (
                  books.map((book) => {
                    const stockStatus = getStockStatus(book);
                    return (
                      <tr key={book._id} className="group hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-center">
                          <input className="rounded border-white/5 bg-background-dark text-primary focus:ring-primary/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" type="checkbox" />
                        </td>
                        <td className="px-4 py-4">
                          <div
                            className="h-16 w-11 rounded bg-gray-700 bg-cover bg-center shadow-lg border border-white/5"
                            style={{ backgroundImage: book.coverImage ? `url('${book.coverImage}')` : 'none' }}
                          ></div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-white font-semibold text-sm group-hover:text-primary transition-colors cursor-pointer">{book.title}</span>
                            <span className="text-text-secondary text-xs mt-0.5">{book.author}</span>
                            {book.category && (
                              <span className="inline-flex items-center gap-1.5 mt-1.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">{book.category.name}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-xs text-text-secondary tracking-wide">{book.isbn || 'N/A'}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-white font-bold text-sm">{book.totalCopies || 0}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {stockStatus.color === 'red' ? (
                            <div className="flex flex-col items-center">
                              <span className="text-red-400 font-bold text-sm">0</span>
                              <span className="text-[10px] text-red-400/70">Out of Stock</span>
                            </div>
                          ) : stockStatus.color === 'orange' ? (
                            <div className="flex flex-col items-center">
                              <span className="text-orange-400 font-bold text-sm">{book.availableCopies || 0}</span>
                              <span className="text-[10px] text-orange-400/70">Low Stock</span>
                            </div>
                          ) : (
                            <span className="text-emerald-400 font-bold text-sm">{book.availableCopies || 0}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-text-secondary text-[16px]">shelves</span>
                            <span className="text-white text-sm">A4-102</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditBook(book._id)}
                              className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors" 
                              title="Edit Details"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button 
                              onClick={() => handleManageStock(book._id, book.title)}
                              className="p-1.5 rounded-lg text-text-secondary hover:text-blue-400 hover:bg-blue-500/10 transition-colors" 
                              title="Manage Stock"
                            >
                              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteBook(book._id, book.title)}
                              className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors" 
                              title="Delete Book"
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
            <div className="px-6 py-4 bg-background-dark border-t border-white/5 flex items-center justify-between">
              <div className="text-sm text-text-secondary">
                Showing <span className="font-semibold text-white">1</span> to <span className="font-semibold text-white">5</span> of <span className="font-semibold text-white">1,240</span> entries
              </div>
              <div className="flex items-center gap-1.5">
                <button className="flex items-center justify-center h-8 w-8 rounded hover:bg-white/5 text-text-secondary disabled:opacity-50 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">first_page</span>
                </button>
                <button className="flex items-center justify-center h-8 w-8 rounded hover:bg-white/5 text-text-secondary disabled:opacity-50 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button className="h-8 w-8 rounded bg-primary text-white text-sm font-medium flex items-center justify-center shadow-lg shadow-primary/20">1</button>
                <button className="h-8 w-8 rounded hover:bg-white/5 text-text-secondary text-sm font-medium flex items-center justify-center transition-colors">2</button>
                <button className="h-8 w-8 rounded hover:bg-white/5 text-text-secondary text-sm font-medium flex items-center justify-center transition-colors">3</button>
                <span className="text-text-secondary text-sm px-1">...</span>
                <button className="h-8 w-8 rounded hover:bg-white/5 text-text-secondary text-sm font-medium flex items-center justify-center transition-colors">12</button>
                <button className="flex items-center justify-center h-8 w-8 rounded hover:bg-white/5 text-text-secondary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
                <button className="flex items-center justify-center h-8 w-8 rounded hover:bg-white/5 text-text-secondary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">last_page</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Book Modal */}
      <AddBookModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onBookAdded={() => {
          fetchBooks();
          fetchStats();
        }}
      />

      {/* Edit Book Modal */}
      <EditBookModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingBookId(null);
        }}
        onBookUpdated={() => {
          fetchBooks();
          fetchStats();
        }}
        bookId={editingBookId}
      />
    </>
  );
}

