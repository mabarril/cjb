/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './src/**/*.{html,ts}',
    ],
    theme: {
        extend: {
            colors: {
                "primary": "#308ce8",
                "secondary": "#86efac",
                "background-light": "#f8fafc",
                "background-dark": "#0f172a",
                "secondary-gold": "#f8fafc",
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.75rem",
                "lg": "0.75rem",
                "xl": "1rem",
                "full": "9999px"
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/container-queries'),
    ],
};
