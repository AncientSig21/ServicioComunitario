/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
	theme: {
		extend: {
			colors: {
        primary: {
          DEFAULT: '#002357',
          light: '#003366',
          dark: '#001a3d',
        },
        secondary: {
          DEFAULT: '#f76a0b',
          light: '#ff8c1a',
          dark: '#e55a00',
			},
        custom: {
          white: '#ffffff',
          lightGray: '#f8f9fa',
          gray: '#6c757d',
          darkGray: '#343a40',
        }
      },
      fontFamily: {
        'montserrat': ['Montserrat', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
		},
	},
	plugins: [],
}
