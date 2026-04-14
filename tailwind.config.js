import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.{jsx,tsx,ts}',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                accent: 'var(--accent)',
                'accent-light': 'var(--accent-light)',
                'accent-glow': 'var(--accent-glow)',
                'mode-split': '#3B82F6',
                'mode-merge': '#10B981',
                'mode-exclude': '#EF4444',
            }
        },
    },

    plugins: [forms],
};
