/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        champagne: {
          50:  '#fdfbf7',
          100: '#f9f5ec',
          200: '#f0e8d4',
          300: '#e4d5b5',
          400: '#c9b48a',
          500: '#b39b6a',
          600: '#9a7f4e',
          700: '#7d6540',
          800: '#654f35',
          900: '#4a3a28',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
