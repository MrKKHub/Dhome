/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        /** 治愈系主色：落日橘 + 可作辅色治愈紫 */
        brand: '#FF8C69',
        lilac: '#9D94FF',
        warmInk: '#4A3E3E',
        warmCream: '#FDFBF7',
        apricot: '#FFF9F2',
        favorite: '#FFB800',
        liked: '#FF4D4F',
        hug: '#FDA4AF',
      },
      boxShadow: {
        ambient: '0 8px 30px rgb(15 23 42 / 0.04)',
        warm: '0 14px 42px rgba(255, 140, 105, 0.2)',
        warmLg: '0 20px 50px rgba(157, 148, 255, 0.15)',
      },
      keyframes: {
        'soft-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        breathe: {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 12px 36px rgba(255, 140, 105, 0.35)',
          },
          '50%': {
            transform: 'scale(1.08)',
            boxShadow: '0 18px 48px rgba(255, 140, 105, 0.48)',
          },
        },
        'hug-ripple': {
          '0%': { transform: 'scale(0.35)', opacity: '0.55' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
      },
      animation: {
        'soft-bounce': 'soft-bounce 0.35s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        breathe: 'breathe 2.4s ease-in-out infinite',
        'hug-ripple': 'hug-ripple 0.65s ease-out forwards',
      },
    },
  },
  plugins: [],
}
