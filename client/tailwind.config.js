/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Light Mode Palette
                primary: '#000000', // Black for primary actions in light mode
                secondary: '#ffffff',
                background: '#fdfbf7', // Warm light beige/off-white
                surface: '#ffffff',
                text: '#1e293b', // Slate 800
                'text-muted': '#64748b', // Slate 500

                // Dark Mode Palette
                'dark-background': '#0f172a', // Slate 900
                'dark-surface': '#1e293b', // Slate 800
                'dark-text': '#f8fafc', // Slate 50
                'dark-text-muted': '#94a3b8', // Slate 400

                // Accents
                accent: {
                    coral: '#ff6b6b',
                    green: '#10b981',
                    blue: '#3b82f6',
                    yellow: '#f59e0b',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Teko', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
