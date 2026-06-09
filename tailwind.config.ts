import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0d1117',
        card: '#161b22',
        border: '#30363d',
        'text-primary': '#e6edf3',
        'text-secondary': '#8b949e',
        critical: '#f85149',
        warning: '#e3b341',
        success: '#3fb950',
        info: '#58a6ff',
        accent: '#d29922',
      },
    },
  },
  plugins: [],
};

export default config;
