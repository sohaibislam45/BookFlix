/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#aa1fef',
          hover: '#9216d1',
          light: '#b791ca',
          dark: '#7000ff',
        },
        'background-light': '#f7f6f8',
        'background-dark': '#1c1022',
        'surface-dark': '#2d1b36',
        'surface-hover': '#2a2a2a',
        'card-dark': '#2b1934',
        'border-dark': '#3c2348',
        'text-muted': '#b791ca',
        'text-secondary': '#b791ca',
        'alert-red': '#ef4444',
        'success-green': '#10b981',
        'surface-dark-hover': '#3c2348',
        purple: {
          '50': '#3c2348',
          '100': '#352140',
          '200': '#22152e',
          '300': '#1c1122',
        },
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(to bottom, rgba(18,18,18,0.3) 0%, rgba(18,18,18,0.8) 50%, rgba(18,18,18,1) 100%)',
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(170, 31, 239, 0.3)',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'],
  },
};

