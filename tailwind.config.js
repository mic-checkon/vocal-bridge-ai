/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                critical: '#ef4444',
                warning: '#f59e0b',
                good: '#22c55e',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'voice-wave': 'voiceWave 1s ease-in-out infinite',
            },
            keyframes: {
                voiceWave: {
                    '0%, 100%': { transform: 'scaleY(0.5)' },
                    '50%': { transform: 'scaleY(1)' },
                },
            },
        },
    },
    plugins: [],
};
