/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dau: {
          primary: "#004B87",
          secondary: "#D97706",
          dark: "#0F172A",
          light: "#F8FAFC",
        },
      },
    },
  },
  plugins: [],
};
