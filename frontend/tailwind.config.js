/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    screens: {
      'xs': '375px',
      'sm': '390px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        'bottom-nav': '4rem',
      },
      fontSize: {
        // Mobile-optimized typography scale
        'mobile-title': ['24px', { lineHeight: '1.25', fontWeight: '700' }],
        'mobile-heading': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'mobile-body': ['16px', { lineHeight: '1.6' }],
        'mobile-secondary': ['14px', { lineHeight: '1.5' }],
        'mobile-caption': ['12px', { lineHeight: '1.4' }],
      },
      minHeight: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      minWidth: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        toastUp: {
          from: { transform: 'translateY(100px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        'slide-up': 'slideUp 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
        'toast-up': 'toastUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};