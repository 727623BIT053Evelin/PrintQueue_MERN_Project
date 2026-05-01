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
                    DEFAULT: '#4F46E5', // Indigo 600
                    hover: '#4338CA', // Indigo 700
                    light: '#818CF8', // Indigo 400
                    50: '#EEF2FF',
                },
                secondary: {
                    DEFAULT: '#EC4899', // Pink 500
                    hover: '#DB2777', // Pink 600
                },
                accent: {
                    DEFAULT: '#8B5CF6', // Violet 500
                },
                background: '#F8FAFC', // Slate 50
                surface: '#FFFFFF',
                text: {
                    DEFAULT: '#1E293B', // Slate 800
                    muted: '#64748B', // Slate 500
                    light: '#94A3B8', // Slate 400
                },
                success: '#10B981', // Emerald 500
                warning: '#F59E0B', // Amber 500
                error: '#EF4444', // Red 500
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                'neumorphic': '20px 20px 60px #d1d5db, -20px -20px 60px #ffffff',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'fade-in': 'fadeIn 0.5s ease-out forwards',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
            backdropBlur: {
                'xs': '2px',
            }
        },
    },
    plugins: [],
}
