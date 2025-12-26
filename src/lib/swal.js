import Swal from 'sweetalert2';

// Theme configuration matching BookFlix dark theme
const themeConfig = {
  background: '#1c1c1c', // surface-dark
  backdrop: 'rgba(0, 0, 0, 0.8)',
  text: '#ffffff',
  textSecondary: '#b791ca', // text-secondary
  primary: '#aa1fef', // primary
  primaryHover: '#9216d1', // primary-hover
  success: '#10b981', // success-green
  error: '#ef4444', // alert-red
  warning: '#f59e0b',
  info: '#3b82f6',
  border: '#3c2348', // purple-50
  borderRadius: '0.75rem', // rounded-xl
};

// Custom theme for SweetAlert2
const customTheme = {
  background: themeConfig.background,
  color: themeConfig.text,
  backdrop: themeConfig.backdrop,
  borderRadius: themeConfig.borderRadius,
  border: `1px solid ${themeConfig.border}`,
  padding: '1.5rem',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
};

// Configure Swal with theme
const swalTheme = Swal.mixin({
  background: themeConfig.background,
  color: themeConfig.text,
  backdrop: `
    rgba(0, 0, 0, 0.8)
    left top
    no-repeat
  `,
  customClass: {
    container: 'swal-container',
    popup: 'swal-popup',
    title: 'swal-title',
    htmlContainer: 'swal-html',
    confirmButton: 'swal-confirm',
    cancelButton: 'swal-cancel',
    denyButton: 'swal-deny',
    input: 'swal-input',
    validationMessage: 'swal-validation',
  },
  buttonsStyling: false,
  confirmButtonText: 'OK',
  cancelButtonText: 'Cancel',
  denyButtonText: 'No',
  allowOutsideClick: true,
  allowEscapeKey: true,
  showClass: {
    popup: 'swal-show-popup',
    backdrop: 'swal-show-backdrop',
  },
  hideClass: {
    popup: 'swal-hide-popup',
    backdrop: 'swal-hide-backdrop',
  },
});

// Add custom CSS for theme
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .swal-container {
      font-family: 'Inter', sans-serif;
    }
    .swal-popup {
      background: ${themeConfig.background} !important;
      border: 1px solid ${themeConfig.border} !important;
      border-radius: ${themeConfig.borderRadius} !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px -5px rgba(170, 31, 239, 0.3) !important;
      padding: 1.5rem !important;
    }
    .swal-title {
      color: ${themeConfig.text} !important;
      font-weight: 700 !important;
      font-size: 1.5rem !important;
      margin-bottom: 1rem !important;
    }
    .swal-html {
      color: ${themeConfig.textSecondary} !important;
      font-size: 0.95rem !important;
      line-height: 1.6 !important;
    }
    .swal-confirm {
      background: ${themeConfig.primary} !important;
      color: white !important;
      border: none !important;
      border-radius: 0.5rem !important;
      padding: 0.75rem 1.5rem !important;
      font-weight: 600 !important;
      font-size: 0.875rem !important;
      transition: all 0.2s !important;
      box-shadow: 0 4px 12px rgba(170, 31, 239, 0.3) !important;
    }
    .swal-confirm:hover {
      background: ${themeConfig.primaryHover} !important;
      box-shadow: 0 6px 16px rgba(170, 31, 239, 0.4) !important;
      transform: translateY(-1px) !important;
    }
    .swal-confirm:active {
      transform: translateY(0) !important;
    }
    .swal-cancel,
    .swal-deny {
      background: #2a2a2a !important;
      color: ${themeConfig.textSecondary} !important;
      border: 1px solid ${themeConfig.border} !important;
      border-radius: 0.5rem !important;
      padding: 0.75rem 1.5rem !important;
      font-weight: 600 !important;
      font-size: 0.875rem !important;
      transition: all 0.2s !important;
    }
    .swal-cancel:hover,
    .swal-deny:hover {
      background: #3c2348 !important;
      color: ${themeConfig.text} !important;
      border-color: ${themeConfig.primary} !important;
    }
    .swal2-actions {
      gap: 5rem !important;
    }
    .swal-input {
      background: #2a2a2a !important;
      border: 1px solid ${themeConfig.border} !important;
      color: ${themeConfig.text} !important;
      border-radius: 0.5rem !important;
      padding: 0.75rem !important;
    }
    .swal-input:focus {
      border-color: ${themeConfig.primary} !important;
      box-shadow: 0 0 0 3px rgba(170, 31, 239, 0.1) !important;
      outline: none !important;
    }
    .swal-validation {
      color: ${themeConfig.error} !important;
    }
    .swal-icon {
      border-color: ${themeConfig.primary} !important;
    }
    .swal-icon--success {
      border-color: ${themeConfig.success} !important;
    }
    .swal-icon--error {
      border-color: ${themeConfig.error} !important;
    }
    .swal-icon--warning {
      border-color: ${themeConfig.warning} !important;
    }
    .swal-icon--info {
      border-color: ${themeConfig.info} !important;
    }
    .swal-show-popup {
      animation: swalShowPopup 0.3s ease-out !important;
    }
    .swal-hide-popup {
      animation: swalHidePopup 0.2s ease-in !important;
    }
    .swal-show-backdrop {
      animation: swalShowBackdrop 0.3s ease-out !important;
    }
    .swal-hide-backdrop {
      animation: swalHideBackdrop 0.2s ease-in !important;
    }
    @keyframes swalShowPopup {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    @keyframes swalHidePopup {
      from {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      to {
        opacity: 0;
        transform: scale(0.9) translateY(-10px);
      }
    }
    @keyframes swalShowBackdrop {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    @keyframes swalHideBackdrop {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
    .swal-toast {
      background: ${themeConfig.background} !important;
      border: 1px solid ${themeConfig.border} !important;
      border-radius: ${themeConfig.borderRadius} !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
      color: ${themeConfig.text} !important;
    }
    .swal-toast .swal-title {
      color: ${themeConfig.text} !important;
      font-size: 0.95rem !important;
      margin: 0 !important;
    }
    .swal-toast .swal-icon {
      width: 2rem !important;
      height: 2rem !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Success notification
 */
export const showSuccess = (title, text = '', options = {}) => {
  return swalTheme.fire({
    icon: 'success',
    iconColor: themeConfig.success,
    title,
    text,
    confirmButtonColor: themeConfig.success,
    ...options,
  });
};

/**
 * Error notification
 */
export const showError = (title, text = '', options = {}) => {
  return swalTheme.fire({
    icon: 'error',
    iconColor: themeConfig.error,
    title,
    text,
    confirmButtonColor: themeConfig.error,
    ...options,
  });
};

/**
 * Warning notification
 */
export const showWarning = (title, text = '', options = {}) => {
  return swalTheme.fire({
    icon: 'warning',
    iconColor: themeConfig.warning,
    title,
    text,
    confirmButtonColor: themeConfig.warning,
    ...options,
  });
};

/**
 * Info notification
 */
export const showInfo = (title, text = '', options = {}) => {
  return swalTheme.fire({
    icon: 'info',
    iconColor: themeConfig.info,
    title,
    text,
    confirmButtonColor: themeConfig.info,
    ...options,
  });
};

/**
 * Question/Confirm dialog
 */
export const showConfirm = (title, text = '', options = {}) => {
  return swalTheme.fire({
    icon: 'question',
    iconColor: themeConfig.primary,
    title,
    text,
    showCancelButton: true,
    confirmButtonColor: themeConfig.primary,
    cancelButtonColor: themeConfig.border,
    confirmButtonText: options.confirmButtonText || 'Yes',
    cancelButtonText: options.cancelButtonText || 'Cancel',
    ...options,
  });
};

/**
 * Input dialog
 */
export const showInput = (title, text = '', inputOptions = {}, options = {}) => {
  return swalTheme.fire({
    icon: 'question',
    iconColor: themeConfig.primary,
    title,
    text,
    input: 'text',
    inputPlaceholder: options.inputPlaceholder || 'Enter value...',
    inputValue: options.inputValue || '',
    showCancelButton: true,
    confirmButtonColor: themeConfig.primary,
    cancelButtonColor: themeConfig.border,
    confirmButtonText: options.confirmButtonText || 'OK',
    cancelButtonText: options.cancelButtonText || 'Cancel',
    inputValidator: options.inputValidator,
    ...inputOptions,
    ...options,
  });
};

/**
 * Toast notification (non-blocking)
 */
export const showToast = (title, icon = 'success', options = {}) => {
  const iconColors = {
    success: themeConfig.success,
    error: themeConfig.error,
    warning: themeConfig.warning,
    info: themeConfig.info,
  };

  return Swal.mixin({
    toast: true,
    position: options.position || 'top-end',
    showConfirmButton: false,
    timer: options.timer || 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
    customClass: {
      popup: 'swal-toast',
      container: 'swal-container',
    },
  }).fire({
    icon,
    iconColor: iconColors[icon] || themeConfig.primary,
    title,
    background: themeConfig.background,
    color: themeConfig.text,
    ...options,
  });
};

/**
 * Loading dialog
 */
export const showLoading = (title = 'Loading...', text = '') => {
  return swalTheme.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

/**
 * Close any open dialog
 */
export const close = () => {
  Swal.close();
};

// Export default swal instance
export default swalTheme;

