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
                // Main Palette
                accent: 'var(--accent)',
                'accent-light': 'var(--accent-light)',
                'accent-glow': 'var(--accent-glow)',
                
                // Backgrounds
                'bg-primary': 'var(--bg-primary)',
                'bg-card': 'var(--bg-card)',
                'bg-elevated': 'var(--bg-elevated)',
                'bg-border': 'var(--bg-border)',
                
                // Text
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'text-muted': 'var(--text-muted)',
                
                // Modes
                'mode-split': '#3B82F6',
                'mode-merge': '#10B981',
                'mode-exclude': '#EF4444',
            }
        },
    },

    plugins: [forms],
};
