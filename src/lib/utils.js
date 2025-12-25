/**
 * Utility functions for the application
 */

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date and time to readable string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Number of days
 */
export function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, length = 100) {
  if (!text || text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Get role-based overview route
 * @param {string} role - User role (member, librarian, admin)
 * @returns {string} Route path for the role's overview page
 */
export function getRoleOverviewRoute(role) {
  switch (role) {
    case 'member':
      return '/member/overview';
    case 'librarian':
      return '/dashboard'; // TODO: Create librarian overview page
    case 'admin':
      return '/dashboard'; // TODO: Create admin overview page
    default:
      // Default to member overview for unknown roles
      return '/member/overview';
  }
}

/**
 * Check if user has premium subscription
 * @param {Object} user - User object with subscription property
 * @returns {boolean} True if user has active premium subscription
 */
export function isPremium(user) {
  if (!user || !user.subscription) {
    return false;
  }

  const subscription = user.subscription;
  const subscriptionType = subscription.type;
  const subscriptionStatus = subscription.status;

  // Check if subscription is premium type and active
  if ((subscriptionType === 'monthly' || subscriptionType === 'yearly') && subscriptionStatus === 'active') {
    // Check if subscription hasn't expired
    if (subscription.endDate) {
      const endDate = new Date(subscription.endDate);
      const now = new Date();
      return now <= endDate;
    }
    return true;
  }

  return false;
}

/**
 * Get subscription type display name
 * @param {string} subscriptionType - Subscription type (free, monthly, yearly)
 * @returns {string} Display name for subscription type
 */
export function getSubscriptionDisplayName(subscriptionType) {
  switch (subscriptionType) {
    case 'monthly':
      return 'Monthly Premium';
    case 'yearly':
      return 'Yearly Premium';
    case 'free':
    default:
      return 'Free';
  }
}

