/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // LibraSpace design system colors
        navy: {
          50:  '#f0f4f9',
          100: '#dae3f0',
          200: '#b5c7e1',
          300: '#8aa3cc',
          400: '#6080b7',
          500: '#3d60a3',
          600: '#2d4d8a',
          700: '#1e3a72',
          800: '#152e5e',
          900: '#0d2146',
          950: '#071429',
        },
        accent: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        surface: {
          DEFAULT: '#faf9f7',
          card: '#ffffff',
          muted: '#f4f3f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(13, 33, 70, 0.08), 0 1px 2px 0 rgba(13, 33, 70, 0.04)',
        'card-hover': '0 4px 12px 0 rgba(13, 33, 70, 0.12), 0 2px 4px 0 rgba(13, 33, 70, 0.06)',
        modal: '0 20px 60px -10px rgba(13, 33, 70, 0.25)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
