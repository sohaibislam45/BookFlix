'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LibrarianHeader from '@/components/LibrarianHeader';
import Loader from '@/components/Loader';
import AddBookModal from '@/components/AddBookModal';
import EditBookModal from '@/components/EditBookModal';
import { showError, showSuccess, showInput } from '@/lib/swal';

export default function LibrarianInventoryPage() {
  const { userData } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [stats, setStats] = useState({
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);
  const [editBookModalOpen, setEditBookModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [pagination.page, searchQuery, categoryFilter, availabilityFilter]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/librarian/inventory/stats');
      if (response.ok) {
        const data = await response.json();
        setStats({
          inStock: data.inStock || 0,
          lowStock: data.lowStock || 0,
          outOfStock: data.outOfStock || 0,
        });
      } else {
        console.error('Error fetching stats:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // When availability filter is active, fetch more books for client-side filtering
      const fetchLimit = availabilityFilter ? 1000 : pagination.limit;
      const fetchPage = availabilityFilter ? 1 : pagination.page;
      
      const params = new URLSearchParams({
        page: fetchPage.toString(),
        limit: fetchLimit.toString(),
      });
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await fetch(`/api/books?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let allBooks = data.books || [];
        
        // Apply availability filter client-side
        let filteredBooks = allBooks;
        if (availabilityFilter) {
          filteredBooks = allBooks.filter((book) => {
            const stockStatus = getStockStatus(book);
            if (availabilityFilter === 'instock' && stockStatus.status === 'in') return true;
            if (availabilityFilter === 'lowstock' && stockStatus.status === 'low') return true;
            if (availabilityFilter === 'outstock' && stockStatus.status === 'out') return true;
            return false;
          });
          
          // Apply client-side pagination when filtering
          const startIndex = (pagination.page - 1) * pagination.limit;
          const endIndex = startIndex + pagination.limit;
          const paginatedBooks = filteredBooks.slice(startIndex, endIndex);
          
          // Update pagination with filtered results
          setPagination((prev) => ({
            ...prev,
            total: filteredBooks.length,
            pages: Math.ceil(filteredBooks.length / prev.limit),
          }));
          
          filteredBooks = paginatedBooks;
        } else {
          // Use server-side pagination
          setPagination((prev) => ({
            ...prev,
            total: data.pagination?.total || 0,
            pages: data.pagination?.pages || 0,
          }));
        }
        
        setBooks(filteredBooks);
      } else {
        setError('Failed to fetch books. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      setError('An error occurred while fetching books. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (book) => {
    const available = book.availableCopies || 0;
    const total = book.totalCopies || 0;
    
    if (total === 0) return { status: 'out', label: 'Out of Stock', color: 'red' };
    if (available === 0) return { status: 'out', label: 'Out of Stock', color: 'red' };
    if (available <= 2) return { status: 'low', label: 'Low Stock', color: 'amber' };
    return { status: 'in', label: 'In Stock', color: 'emerald' };
  };

  const handleBookAdded = () => {
    fetchBooks();
    fetchStats();
  };

  const handleBookUpdated = () => {
    fetchBooks();
    fetchStats();
  };

  const handleEditBook = (bookId) => {
    setEditingBookId(bookId);
    setEditBookModalOpen(true);
  };

  const handleManageStock = async (bookId, bookTitle) => {
    // Fetch current stock count
    let currentStock = 0;
    try {
      const bookResponse = await fetch(`/api/books/${bookId}`);
      if (bookResponse.ok) {
        const bookData = await bookResponse.json();
        currentStock = bookData.totalCopies || 0;
      }
    } catch (error) {
      console.error('Error fetching book stock:', error);
    }

    // Show input for stock count with current value
    const result = await showInput(
      'Manage Stock',
      `Enter the number of copies for "${bookTitle}"`,
      { input: 'number' },
      {
        inputPlaceholder: 'Enter number of copies...',
        inputValue: currentStock.toString(),
        inputValidator: (value) => {
          const num = parseInt(value);
          if (value === '' || isNaN(num) || num < 0) {
            return 'Please enter a valid number (minimum 0)';
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
        
        const response = await fetch(`/api/books/${bookId}/stock`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            copies: stockCount,
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
          showSuccess('Stock Updated!', `Stock count for "${bookTitle}" has been updated to ${stockCount} copies.`);
          fetchBooks(); // Refresh the books list
          fetchStats(); // Refresh stats
        } else {
          const errorMessage = data?.error || data?.message || `Failed to update stock (${response.status})`;
          showError('Error', errorMessage);
        }
      } catch (error) {
        console.error('Error updating stock:', error);
        showError('Error', error.message || 'Failed to update stock. Please try again.');
      }
    }
  };

  const getLocationDisplay = (book) => {
    // Placeholder - in real app, this would come from bookCopy location data
    // For now, generate a mock location based on category
    if (book.category?.slug) {
      const categorySlug = book.category.slug.toUpperCase();
      const bookId = book._id.toString().slice(-2);
      return `${categorySlug}-${bookId}`;
    }
    return 'N/A';
  };

  return (
    <>
      <LibrarianHeader title="Inventory Management" subtitle="Catalog new entries, manage stock levels, and audit shelf locations." />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-dark">
        <header className="flex-none px-8 py-6 border-b border-white/5 bg-background-dark/95 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Inventory Management</h2>
                <p className="text-gray-400 text-sm mt-1">Catalog new entries, manage stock levels, and audit shelf locations.</p>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 bg-surface-dark border border-white/10 hover:bg-surface-dark/80 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all">
                  <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                  Scan Barcode
                </button>
                <button
                  onClick={() => setAddBookModalOpen(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Add New Book
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#1c1022] border border-white/5 p-4 rounded-xl flex items-center gap-4">
                <div className="size-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined text-[24px]">check_circle</span>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase font-semibold">In Stock</p>
                  <p className="text-white text-xl font-bold">{stats.inStock.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-[#1c1022] border border-white/5 p-4 rounded-xl flex items-center gap-4">
                <div className="size-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <span className="material-symbols-outlined text-[24px]">warning</span>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase font-semibold">Low Stock</p>
                  <p className="text-white text-xl font-bold">{stats.lowStock}</p>
                </div>
              </div>
              <div className="bg-[#1c1022] border border-white/5 p-4 rounded-xl flex items-center gap-4">
                <div className="size-12 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                  <span className="material-symbols-outlined text-[24px]">remove_shopping_cart</span>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase font-semibold">Out of Stock</p>
                  <p className="text-white text-xl font-bold">{stats.outOfStock}</p>
                </div>
              </div>
              <div className="bg-surface-darker border border-white/5 p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors group">
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[24px]">barcode_reader</span>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase font-semibold">Quick Scan</p>
                  <p className="text-primary text-sm font-bold">Ready to scan...</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="relative flex-1 min-w-[280px] max-w-lg">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input
                  className="w-full bg-surface-dark border border-white/5 text-white placeholder-gray-400 text-sm rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary/50 focus:bg-[#34243b] transition-all outline-none"
                  placeholder="Search by title, ISBN, author or scan barcode..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                />
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0">
                <div className="relative min-w-[160px]">
                  <select
                    className="w-full appearance-none bg-surface-dark border border-white/5 text-white text-sm rounded-xl py-3 pl-4 pr-10 focus:ring-2 focus:ring-primary/50 cursor-pointer transition-all outline-none"
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  >
                    <option value="">All Genres</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                </div>
                <div className="relative min-w-[160px]">
                  <select
                    className="w-full appearance-none bg-surface-dark border border-white/5 text-white text-sm rounded-xl py-3 pl-4 pr-10 focus:ring-2 focus:ring-primary/50 cursor-pointer transition-all outline-none"
                    value={availabilityFilter}
                    onChange={(e) => {
                      setAvailabilityFilter(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  >
                    <option value="">Availability: All</option>
                    <option value="instock">In Stock</option>
                    <option value="lowstock">Low Stock</option>
                    <option value="outstock">Out of Stock</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="ml-auto flex gap-2">
                <button className="flex items-center justify-center size-11 rounded-xl bg-primary/20 text-primary border border-primary/30 transition-colors" title="List View">
                  <span className="material-symbols-outlined text-[20px]">view_list</span>
                </button>
              </div>
            </div>
          </div>
        </header>
        <section className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[1600px] mx-auto w-full">
            <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#1c1022] shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#24152b]">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 w-16">
                      <input className="rounded bg-white/10 border-white/20 text-primary focus:ring-offset-0 focus:ring-primary/50" type="checkbox" />
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 w-24">Cover</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 w-[25%]">Book Details</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">ISBN / Barcode</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">Copies</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Location</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                        <div className="flex justify-center">
                          <Loader />
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-red-400">
                        {error}
                      </td>
                    </tr>
                  ) : books.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                        No books found
                      </td>
                    </tr>
                  ) : (
                    books.map((book) => {
                      const stockStatus = getStockStatus(book);
                      return (
                        <tr key={book._id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4">
                            <input className="rounded bg-white/10 border-white/20 text-primary focus:ring-offset-0 focus:ring-primary/50" type="checkbox" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative h-16 w-11 rounded overflow-hidden bg-gray-700 shadow-md group-hover:scale-110 transition-transform duration-300">
                              {book.coverImage ? (
                                <img
                                  src={book.coverImage}
                                  alt={book.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-700">
                                  <span className="material-symbols-outlined text-gray-500 text-xl">book</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-white font-semibold text-base">{book.title}</span>
                              <span className="text-gray-400 text-sm">{book.author}</span>
                              <div className="flex gap-2 mt-1">
                                {book.category && (
                                  <span className="text-primary text-[10px] uppercase font-bold px-1.5 py-0.5 bg-primary/10 rounded border border-primary/20">
                                    {book.category.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-gray-300 text-sm font-mono tracking-wide">{book.isbn || 'N/A'}</span>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <span className="material-symbols-outlined text-[14px]">barcode</span>
                                <span>Scan ready</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-white font-bold text-lg">{book.totalCopies || 0}</span>
                              <span className="text-gray-500 text-xs">Total Copies</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex items-center justify-center size-2 rounded-full ${
                                  stockStatus.color === 'emerald'
                                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                    : stockStatus.color === 'amber'
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                              ></div>
                              <div className="flex flex-col">
                                <span
                                  className={`text-sm font-medium ${
                                    stockStatus.color === 'emerald'
                                      ? 'text-emerald-400'
                                      : stockStatus.color === 'amber'
                                      ? 'text-amber-400'
                                      : 'text-red-400'
                                  }`}
                                >
                                  {stockStatus.label}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {stockStatus.status === 'in' && `${book.availableCopies || 0} on shelf`}
                                  {stockStatus.status === 'low' && `${book.availableCopies || 0} Available`}
                                  {stockStatus.status === 'out' && 'Expected: 2 days'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-gray-300 bg-surface-dark px-3 py-1.5 rounded-lg border border-white/5 w-fit">
                              <span className="material-symbols-outlined text-[18px] text-primary">shelves</span>
                              <span className="text-sm font-medium">{getLocationDisplay(book)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleManageStock(book._id, book.title);
                                }}
                                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                title="Manage Copies"
                              >
                                <span className="material-symbols-outlined text-[20px]">library_books</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditBook(book._id);
                                }}
                                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                title="Edit Details"
                              >
                                <span className="material-symbols-outlined text-[20px]">edit_square</span>
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
            {pagination.pages > 1 && (
              <div className="flex flex-wrap items-center justify-between py-6 px-2 gap-4">
                <div className="text-sm text-gray-400">
                  Showing <span className="font-medium text-white">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-medium text-white">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium text-white">{pagination.total}</span> books
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="flex items-center justify-center size-9 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPagination((prev) => ({ ...prev, page: pageNum }))}
                        className={`flex items-center justify-center size-9 rounded-lg text-sm font-medium transition-colors ${
                          pagination.page === pageNum
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.pages}
                    className="flex items-center justify-center size-9 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <AddBookModal
        isOpen={addBookModalOpen}
        onClose={() => setAddBookModalOpen(false)}
        onBookAdded={handleBookAdded}
      />
      <EditBookModal
        isOpen={editBookModalOpen}
        onClose={() => {
          setEditBookModalOpen(false);
          setEditingBookId(null);
        }}
        onBookUpdated={handleBookUpdated}
        bookId={editingBookId}
      />
    </>
  );
}

