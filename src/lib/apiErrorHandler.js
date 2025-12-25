/**
 * Standardized API error handler
 * Provides consistent error responses across all API routes
 */

/**
 * Create a standardized error response
 * @param {string} message - User-friendly error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code for client-side handling
 * @param {any} details - Additional error details (only in development)
 * @returns {Response} NextResponse with error
 */
export function createErrorResponse(message, statusCode = 500, code = null, details = null) {
  const errorResponse = {
    error: message,
    code: code || getErrorCodeFromStatus(statusCode),
    timestamp: new Date().toISOString(),
  };

  // Only include details in development
  if (process.env.NODE_ENV === 'development' && details) {
    errorResponse.details = details;
  }

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Get error code from HTTP status
 * @param {number} statusCode - HTTP status code
 * @returns {string} Error code
 */
function getErrorCodeFromStatus(statusCode) {
  const statusCodeMap = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_SERVER_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  };

  return statusCodeMap[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Handle API errors consistently
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred (e.g., 'fetching books')
 * @returns {Response} Error response
 */
export function handleApiError(error, context = 'operation') {
  console.error(`[API Error] ${context}:`, error);

  // Handle known error types
  if (error.name === 'ValidationError') {
    return createErrorResponse(
      'Validation failed',
      422,
      'VALIDATION_ERROR',
      error.message
    );
  }

  if (error.name === 'CastError') {
    return createErrorResponse(
      'Invalid data format',
      400,
      'INVALID_FORMAT',
      error.message
    );
  }

  if (error.code === 11000) {
    // MongoDB duplicate key error
    return createErrorResponse(
      'Resource already exists',
      409,
      'DUPLICATE_RESOURCE',
      error.message
    );
  }

  if (error.name === 'MongoServerError') {
    return createErrorResponse(
      'Database error occurred',
      500,
      'DATABASE_ERROR',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }

  // Default error response
  return createErrorResponse(
    `Failed to ${context}`,
    500,
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV === 'development' ? error.message : null
  );
}

/**
 * Validate required fields
 * @param {Object} data - Data to validate
 * @param {string[]} requiredFields - Array of required field names
 * @returns {Object|null} Error response or null if valid
 */
export function validateRequiredFields(data, requiredFields) {
  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    return createErrorResponse(
      `Missing required fields: ${missingFields.join(', ')}`,
      400,
      'MISSING_FIELDS',
      { missingFields }
    );
  }

  return null;
}

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
export function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Validate and sanitize ObjectId
 * @param {string} id - ID to validate
 * @param {string} fieldName - Name of the field (for error messages)
 * @returns {Object|null} Error response or null if valid
 */
export function validateObjectId(id, fieldName = 'ID') {
  if (!id) {
    return createErrorResponse(
      `${fieldName} is required`,
      400,
      'MISSING_ID'
    );
  }

  if (!isValidObjectId(id)) {
    return createErrorResponse(
      `Invalid ${fieldName} format`,
      400,
      'INVALID_ID_FORMAT'
    );
  }

  return null;
}

/**
 * Validate pagination parameters
 * @param {Object} params - Parameters object with page and limit
 * @param {number} maxLimit - Maximum allowed limit
 * @returns {Object|null} Error response or null if valid
 */
export function validatePaginationParams(params, maxLimit = 100) {
  const { page, limit } = params;
  
  if (page !== undefined && page !== null) {
    const pageNum = Number(page);
    if (isNaN(pageNum) || pageNum < 1 || !Number.isInteger(pageNum)) {
      return createErrorResponse(
        'Page must be a positive integer',
        400,
        'INVALID_PAGE'
      );
    }
  }
  
  if (limit !== undefined && limit !== null) {
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1 || !Number.isInteger(limitNum)) {
      return createErrorResponse(
        'Limit must be a positive integer',
        400,
        'INVALID_LIMIT'
      );
    }
    if (limitNum > maxLimit) {
      return createErrorResponse(
        `Limit cannot exceed ${maxLimit}`,
        400,
        'LIMIT_TOO_LARGE'
      );
    }
  }
  
  return null;
}

/**
 * Validate enum value
 * @param {any} value - Value to validate
 * @param {Array|Object} enumValues - Allowed enum values
 * @param {string} fieldName - Name of the field
 * @returns {Object|null} Error response or null if valid
 */
export function validateEnumValue(value, enumValues, fieldName = 'Field') {
  if (value === null || value === undefined || value === '') {
    return createErrorResponse(
      `${fieldName} is required`,
      400,
      'MISSING_FIELD'
    );
  }
  
  const validValues = Array.isArray(enumValues) 
    ? enumValues 
    : Object.values(enumValues);
  
  if (!validValues.includes(value)) {
    return createErrorResponse(
      `Invalid ${fieldName}. Must be one of: ${validValues.join(', ')}`,
      400,
      'INVALID_ENUM_VALUE'
    );
  }
  
  return null;
}

/**
 * Sanitize and normalize pagination params
 * @param {URLSearchParams} searchParams - URL search parameters
 * @param {Object} defaults - Default values
 * @returns {Object} Normalized pagination params
 */
export function normalizePaginationParams(searchParams, defaults = { page: 1, limit: 20 }) {
  const page = parseInt(searchParams.get('page')) || defaults.page;
  const limit = parseInt(searchParams.get('limit')) || defaults.limit;
  
  // Ensure positive integers
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedLimit = Math.max(1, Math.min(Math.floor(limit), 100));
  
  return {
    page: normalizedPage,
    limit: normalizedLimit,
  };
}

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input, maxLength = null) {
  if (typeof input !== 'string') return '';
  let sanitized = input.trim();
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
}

