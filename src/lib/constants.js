/**
 * Application constants
 */

// User roles
export const USER_ROLES = {
  MEMBER: 'member',
  LIBRARIAN: 'librarian',
  ADMIN: 'admin',
};

// Borrowing rules
export const BORROWING_RULES = {
  GENERAL: {
    MAX_BOOKS: 1,
    MAX_DAYS: 7,
  },
  PREMIUM: {
    MAX_BOOKS: 4,
    MAX_DAYS: 20,
  },
};

// Fine calculation
export const FINE_RATE = 0.50; // $0.50 per day

// Reservation
export const RESERVATION_EXPIRY_DAYS = 3; // Days to pick up reserved book

// Subscription
export const SUBSCRIPTION_PRICE = 9.99; // Monthly subscription price in USD
export const SUBSCRIPTION_CURRENCY = 'usd';
export const SUBSCRIPTION_PLANS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

// Book status
export const BOOK_STATUS = {
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
  RESERVED: 'reserved',
  MAINTENANCE: 'maintenance',
};

// Borrowing status
export const BORROWING_STATUS = {
  ACTIVE: 'active',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
};

// Reservation status
export const RESERVATION_STATUS = {
  PENDING: 'pending',
  READY: 'ready',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

// Fine status
export const FINE_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  WAIVED: 'waived',
};

// Notification types
export const NOTIFICATION_TYPES = {
  BORROWING_DUE: 'borrowing_due',
  BORROWING_OVERDUE: 'borrowing_overdue',
  RESERVATION_READY: 'reservation_ready',
  RESERVATION_EXPIRED: 'reservation_expired',
  FINE_ISSUED: 'fine_issued',
  PAYMENT_RECEIVED: 'payment_received',
  BOOK_AVAILABLE: 'book_available',
};

// Pagination
export const ITEMS_PER_PAGE = 12;

