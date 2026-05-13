/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        foreground: "#fafafa",
        card: "#121212",
        "card-foreground": "#fafafa",
        primary: "#ff4500",
        "primary-foreground": "#ffffff",
        secondary: "#27272a",
        muted: "#27272a",
        accent: "#3f3f46",
        border: "#27272a",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
}
