/**
 * Client and server-side validation utilities
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and message
 */
export function validatePassword(password) {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }

  return { isValid: true, message: '' };
}

/**
 * Validate ISBN format (10 or 13 digits)
 * @param {string} isbn - ISBN to validate
 * @returns {boolean} True if valid format
 */
export function isValidISBN(isbn) {
  if (!isbn) return true; // ISBN is optional
  // Remove hyphens and spaces
  const cleaned = isbn.replace(/[-\s]/g, '');
  // Check if it's 10 or 13 digits
  return /^(\d{10}|\d{13})$/.test(cleaned);
}

/**
 * Validate phone number (basic validation)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export function isValidPhone(phone) {
  if (!phone) return true; // Phone is optional
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * Validate date is in the past
 * @param {Date|string} date - Date to validate
 * @returns {boolean} True if date is in the past
 */
export function isPastDate(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

/**
 * Validate date is in the future
 * @param {Date|string} date - Date to validate
 * @returns {boolean} True if date is in the future
 */
export function isFutureDate(date) {
  if (!date) return false;
  return new Date(date) > new Date();
}

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field
 * @returns {Object} Validation result
 */
export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, message: `${fieldName} is required` };
  }
  return { isValid: true, message: '' };
}

/**
 * Validate number range
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {Object} Validation result
 */
export function validateNumberRange(value, min, max) {
  const num = Number(value);
  if (isNaN(num)) {
    return { isValid: false, message: 'Must be a valid number' };
  }
  if (num < min || num > max) {
    return { isValid: false, message: `Must be between ${min} and ${max}` };
  }
  return { isValid: true, message: '' };
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidURL(url) {
  if (!url) return true; // URL is optional
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate form data object
 * @param {Object} data - Form data to validate
 * @param {Object} rules - Validation rules
 * @returns {Object} Validation result with isValid and errors
 */
export function validateForm(data, rules) {
  const errors = {};
  let isValid = true;

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    const fieldErrors = [];

    // Required validation
    if (rule.required && !validateRequired(value, rule.label || field).isValid) {
      fieldErrors.push(validateRequired(value, rule.label || field).message);
      isValid = false;
    }

    // Skip other validations if field is empty and not required
    if (!value && !rule.required) continue;

    // Email validation
    if (rule.email && value && !isValidEmail(value)) {
      fieldErrors.push('Please enter a valid email address');
      isValid = false;
    }

    // Password validation
    if (rule.password && value) {
      const passwordValidation = validatePassword(value);
      if (!passwordValidation.isValid) {
        fieldErrors.push(passwordValidation.message);
        isValid = false;
      }
    }

    // Min length validation
    if (rule.minLength && value && value.length < rule.minLength) {
      fieldErrors.push(`Must be at least ${rule.minLength} characters long`);
      isValid = false;
    }

    // Max length validation
    if (rule.maxLength && value && value.length > rule.maxLength) {
      fieldErrors.push(`Must be no more than ${rule.maxLength} characters long`);
      isValid = false;
    }

    // Number range validation
    if (rule.numberRange && value !== undefined) {
      const rangeValidation = validateNumberRange(
        value,
        rule.numberRange.min,
        rule.numberRange.max
      );
      if (!rangeValidation.isValid) {
        fieldErrors.push(rangeValidation.message);
        isValid = false;
      }
    }

    // Custom validation function
    if (rule.custom && value) {
      const customResult = rule.custom(value, data);
      if (customResult && !customResult.isValid) {
        fieldErrors.push(customResult.message);
        isValid = false;
      }
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  }

  return { isValid, errors };
}

