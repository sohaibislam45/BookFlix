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
        primary: '#aa1fef',
        'background-light': '#f7f6f8',
        'background-dark': '#121212',
        'surface-dark': '#1c1c1c',
        'surface-hover': '#2a2a2a',
        'card-dark': '#2b1934',
        'border-dark': '#553267',
        'text-muted': '#b791ca',
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

