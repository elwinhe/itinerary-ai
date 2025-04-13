const config = {
  plugins: {
    '@tailwindcss/postcss': {
      content: ['./src/**/*.{js,ts,jsx,tsx,css}'],
      important: true,
    },
    autoprefixer: {},
  },
};

export default config;
