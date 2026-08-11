import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#DCE8F5',
        surface: '#FFFFFF',
        surface2: '#EDF2FA',
        ink: '#0F172A',
        text: '#334155',
        text2: '#475569',
        text3: '#64748B',
        border: '#B8C9DE',
        border2: '#CBD8EA',
        accent: {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
          deep: '#1D4ED8',
          text: '#1E40AF'
        },
        premium: {
          bg: '#FFFBEB',
          border: '#FCD34D',
          name: '#92400E',
          status: '#B45309'
        }
      },
      boxShadow: {
        card: '0 1px 3px rgba(30,64,175,0.1), 0 6px 20px rgba(0,0,0,0.06)',
        lg: '0 4px 24px rgba(37,99,235,0.18), 0 12px 40px rgba(0,0,0,0.08)'
      },
      borderRadius: {
        DEFAULT: '14px',
        sm: '10px'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
