'use client';

import { useState } from 'react';
import LibrarianHeader from '@/components/LibrarianHeader';
import { showSuccess, showError } from '@/lib/swal';
import Link from 'next/link';

export default function LibrarianHelpPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [supportForm, setSupportForm] = useState({
    subject: '',
    category: 'technical',
    priority: 'medium',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const faqCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: 'rocket_launch',
      items: [
        {
          q: 'How do I access the librarian dashboard?',
          a: 'Once you log in with your librarian credentials, you will be automatically directed to the librarian overview dashboard. From there, you can access all library management features.',
        },
        {
          q: 'What are the main features available?',
          a: 'The librarian dashboard includes: Overview/Statistics, Circulation Desk (checkout/returns), Inventory Management, Member Management, and Settings. Each section is accessible from the sidebar navigation.',
        },
        {
          q: 'How do I navigate between different sections?',
          a: 'Use the sidebar navigation menu on the left side of the screen. Click on any menu item to navigate to that section. The active page will be highlighted.',
        },
      ],
    },
    {
      id: 'circulation',
      title: 'Circulation & Checkout',
      icon: 'shopping_bag',
      items: [
        {
          q: 'How do I check out a book to a member?',
          a: 'Go to the Circulation Desk page. First, search for the member by email or member ID. Then scan or search for the book ISBN. The book will be added to the cart. Click "Complete Checkout" to finalize the transaction.',
        },
        {
          q: 'How do I process a book return?',
          a: 'On the Circulation Desk page, use the Quick Return section on the right. Enter the book ISBN and click the return button. The system will automatically update the book status and member records.',
        },
        {
          q: 'Can I renew a book for a member?',
          a: 'Yes, go to the Circulation Desk and select the "Renew Book" tab. Search for the member, then select the book you want to renew. Books can be renewed up to 2 times, and overdue books cannot be renewed.',
        },
        {
          q: 'What are the borrowing limits?',
          a: 'Free members can borrow 1 book for 7 days. Premium members can borrow up to 4 books for 20 days each. The system will automatically enforce these limits.',
        },
      ],
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      icon: 'library_books',
      items: [
        {
          q: 'How do I add a new book to the inventory?',
          a: 'Go to Inventory Management and click "Add New Book". Fill in the book details including title, author, ISBN, category, and cover image. You can specify the number of copies to create.',
        },
        {
          q: 'How do I check inventory status?',
          a: 'The Inventory Management page shows real-time statistics including In Stock, Low Stock, and Out of Stock counts. You can filter books by category and availability status.',
        },
        {
          q: 'What does "Low Stock" mean?',
          a: 'A book is considered low stock when there are 2 or fewer available copies. This helps you identify books that may need reordering.',
        },
        {
          q: 'How do I edit book information?',
          a: 'In the Inventory Management table, click the edit icon next to any book. This opens a modal where you can update book details, cover image, and other information.',
        },
      ],
    },
    {
      id: 'members',
      title: 'Member Management',
      icon: 'people',
      items: [
        {
          q: 'How do I add a new member?',
          a: 'Go to Members page and click "Add New Member". Fill in the member details including name, email, phone, address, and membership tier. The system will create the member account.',
        },
        {
          q: 'How do I view a member\'s borrowing history?',
          a: 'On the Members page, click the "View History" button next to any member. This shows their complete borrowing history, current loans, and account details.',
        },
        {
          q: 'Can I edit member information?',
          a: 'Yes, click the "Edit Info" button next to any member on the Members page. You can update their personal information, address, and subscription details.',
        },
        {
          q: 'How do I check member fines?',
          a: 'When viewing a member\'s details, you can see their current fines. Fines are automatically calculated for overdue books at $0.50 per day.',
        },
      ],
    },
    {
      id: 'fines',
      title: 'Fines & Payments',
      icon: 'payments',
      items: [
        {
          q: 'How are fines calculated?',
          a: 'Fines are automatically calculated at $0.50 per day for each overdue book. Fines start accruing the day after the due date.',
        },
        {
          q: 'Can I waive a fine?',
          a: 'Yes, fines can be waived by authorized staff. Go to the member\'s profile and access their fines section to waive specific fines.',
        },
        {
          q: 'How do members pay fines?',
          a: 'Members can pay fines through their account dashboard using Stripe payment integration. Librarians can also process payments manually if needed.',
        },
      ],
    },
    {
      id: 'technical',
      title: 'Technical Support',
      icon: 'support_agent',
      items: [
        {
          q: 'The page is not loading correctly',
          a: 'Try refreshing the page (Ctrl+R or Cmd+R). Clear your browser cache if the issue persists. If problems continue, contact technical support.',
        },
        {
          q: 'I cannot upload images',
          a: 'Ensure images are in JPG, PNG, or WEBP format and under 5MB. Check your internet connection. If issues persist, try a different browser.',
        },
        {
          q: 'Search is not working',
          a: 'Check your internet connection. Try refreshing the page. If search still doesn\'t work, contact support with details about what you\'re searching for.',
        },
        {
          q: 'I\'m logged out automatically',
          a: 'This might be due to inactivity or session expiration. Simply log in again. If this happens frequently, check your browser settings or contact support.',
        },
      ],
    },
  ];

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...supportForm,
          userRole: 'librarian',
        }),
      });

      if (response.ok) {
        showSuccess('Support Request Submitted', 'Your support request has been sent. We will get back to you soon.');
        setSupportForm({
          subject: '',
          category: 'technical',
          priority: 'medium',
          message: '',
        });
      } else {
        const error = await response.json();
        showError('Submission Failed', error.error || 'Failed to submit support request');
      }
    } catch (error) {
      console.error('Error submitting support request:', error);
      showError('Error', 'Failed to submit support request');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFAQs = faqCategories.map((category) => ({
    ...category,
    items: category.items.filter(
      (item) =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.items.length > 0);

  return (
    <>
      <LibrarianHeader title="Help & Support" subtitle="Find answers and get assistance" />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Documentation & FAQ */}
            <div className="lg:col-span-2 space-y-6">
              {/* Search */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6 shadow-lg">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for help articles..."
                    className="w-full bg-surface-dark border border-white/5 text-white rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              {/* FAQ Sections */}
              {filteredFAQs.length === 0 ? (
                <div className="bg-card-dark rounded-2xl border border-white/5 p-12 text-center shadow-lg">
                  <span className="material-symbols-outlined text-6xl text-white/20 mb-4 block">search_off</span>
                  <p className="text-white/60">No results found for "{searchQuery}"</p>
                </div>
              ) : (
                filteredFAQs.map((category) => (
                  <div
                    key={category.id}
                    className="bg-card-dark rounded-2xl border border-white/5 overflow-hidden shadow-lg"
                  >
                    <div
                      className="p-6 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setActiveSection(activeSection === category.id ? null : category.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-primary text-2xl">{category.icon}</span>
                          <h3 className="text-white text-lg font-bold">{category.title}</h3>
                        </div>
                        <span className="material-symbols-outlined text-white/40">
                          {activeSection === category.id ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </div>
                    {activeSection === category.id && (
                      <div className="p-6 space-y-4">
                        {category.items.map((item, idx) => (
                          <div key={idx} className="border-b border-white/5 last:border-0 pb-4 last:pb-0">
                            <h4 className="text-white font-semibold mb-2">{item.q}</h4>
                            <p className="text-white/60 text-sm leading-relaxed">{item.a}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Quick Links */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6 shadow-lg">
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">link</span>
                  Quick Links
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Link
                    href="/librarian/circulation"
                    className="p-4 bg-surface-dark/50 hover:bg-surface-dark border border-white/5 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <span className="material-symbols-outlined text-primary">qr_code_scanner</span>
                    <div>
                      <p className="text-white font-medium">Circulation Desk</p>
                      <p className="text-white/50 text-xs">Check out and return books</p>
                    </div>
                  </Link>
                  <Link
                    href="/librarian/inventory"
                    className="p-4 bg-surface-dark/50 hover:bg-surface-dark border border-white/5 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <span className="material-symbols-outlined text-primary">library_books</span>
                    <div>
                      <p className="text-white font-medium">Inventory</p>
                      <p className="text-white/50 text-xs">Manage book catalog</p>
                    </div>
                  </Link>
                  <Link
                    href="/librarian/members"
                    className="p-4 bg-surface-dark/50 hover:bg-surface-dark border border-white/5 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <span className="material-symbols-outlined text-primary">people</span>
                    <div>
                      <p className="text-white font-medium">Members</p>
                      <p className="text-white/50 text-xs">Manage member accounts</p>
                    </div>
                  </Link>
                  <Link
                    href="/librarian/settings"
                    className="p-4 bg-surface-dark/50 hover:bg-surface-dark border border-white/5 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <span className="material-symbols-outlined text-primary">settings</span>
                    <div>
                      <p className="text-white font-medium">Settings</p>
                      <p className="text-white/50 text-xs">Account preferences</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column - Contact Support & Info */}
            <div className="space-y-6">
              {/* Contact Support */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6 shadow-lg">
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">support_agent</span>
                  Contact Support
                </h3>
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <div>
                    <label className="text-white/80 text-sm font-medium mb-2 block">Subject</label>
                    <input
                      type="text"
                      value={supportForm.subject}
                      onChange={(e) => setSupportForm((prev) => ({ ...prev, subject: e.target.value }))}
                      required
                      className="w-full bg-surface-dark border border-white/5 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      placeholder="Brief description of your issue"
                    />
                  </div>
                  <div>
                    <label className="text-white/80 text-sm font-medium mb-2 block">Category</label>
                    <select
                      value={supportForm.category}
                      onChange={(e) => setSupportForm((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-surface-dark border border-white/5 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    >
                      <option value="technical">Technical Issue</option>
                      <option value="feature">Feature Request</option>
                      <option value="bug">Bug Report</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-white/80 text-sm font-medium mb-2 block">Priority</label>
                    <select
                      value={supportForm.priority}
                      onChange={(e) => setSupportForm((prev) => ({ ...prev, priority: e.target.value }))}
                      className="w-full bg-surface-dark border border-white/5 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-white/80 text-sm font-medium mb-2 block">Message</label>
                    <textarea
                      value={supportForm.message}
                      onChange={(e) => setSupportForm((prev) => ({ ...prev, message: e.target.value }))}
                      required
                      rows={5}
                      className="w-full bg-surface-dark border border-white/5 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                      placeholder="Describe your issue or question in detail..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">send</span>
                        Submit Request
                      </>
                    )}
                  </button>
                </form>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-white/50 text-xs">
                    <span className="material-symbols-outlined text-[14px] inline align-middle mr-1">mail</span>
                    Email: support@bookfiix.com
                  </p>
                  <p className="text-white/50 text-xs mt-2">
                    <span className="material-symbols-outlined text-[14px] inline align-middle mr-1">schedule</span>
                    Support Hours: Mon-Fri, 9AM-5PM
                  </p>
                </div>
              </div>

              {/* System Information */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6 shadow-lg">
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">info</span>
                  System Information
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Application Version</span>
                    <span className="text-white font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Status</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <span className="size-2 rounded-full bg-emerald-400"></span>
                      Operational
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Last Updated</span>
                    <span className="text-white/80">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6 shadow-lg">
                <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">keyboard</span>
                  Keyboard Shortcuts
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Search</span>
                    <kbd className="px-2 py-1 bg-surface-dark border border-white/5 rounded text-white/80 font-mono text-xs">⌘K</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Member Search (Circulation)</span>
                    <kbd className="px-2 py-1 bg-surface-dark border border-white/5 rounded text-white/80 font-mono text-xs">F1</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Quick Return</span>
                    <kbd className="px-2 py-1 bg-surface-dark border border-white/5 rounded text-white/80 font-mono text-xs">F2</kbd>
                  </div>
                </div>
              </div>

              {/* Policies */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6 shadow-lg">
                <h3 className="text-white text-lg font-bold mb-4">Policies</h3>
                <div className="space-y-2">
                  <Link href="#" className="text-primary hover:text-primary-hover text-sm block">
                    Privacy Policy
                  </Link>
                  <Link href="#" className="text-primary hover:text-primary-hover text-sm block">
                    Terms of Service
                  </Link>
                  <Link href="#" className="text-primary hover:text-primary-hover text-sm block">
                    Cookie Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

