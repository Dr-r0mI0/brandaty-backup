/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [require("daisyui")],
    daisyui: {
        themes: [
            {
                corporate: {
                    ...require("daisyui/src/theming/themes")["corporate"],
                    "primary": "#2c0b73",
                    "primary-content": "#ffffff",
                    "secondary": "#ba1d5fff",
                    "secondary-content": "#ffffff",
                    "accent": "#37cdbe",
                    "neutral": "#2a323c",
                    "base-100": "#ffffff",
                    "base-200": "#f2f2f2",
                    "base-300": "#e5e6e6",
                },
                dark: {
                    ...require("daisyui/src/theming/themes")["dark"],
                    "primary": "#8860dfff",
                    "primary-content": "#ffffffff",
                    "secondary": "#ff6f00",
                    "base-100": "#1d232a",
                    "base-content": "#a6adba",
                }
            }
        ],
    },
}
