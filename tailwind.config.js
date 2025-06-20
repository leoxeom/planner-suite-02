/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Couleurs spécifiques existantes
        amber: {
          DEFAULT: '#FFBF00',
          light: '#FFD11A',
          dark: '#CAA870'
        },
        dark: {
          100: '#FAFAFA',
          200: '#EAEAEA',
          300: '#999999',
          400: '#888888',
          500: '#666666',
          600: '#444444',
          700: '#333333',
          800: '#222222',
          900: '#111111',
          950: '#0A0A0A'
        },
        success: {
          DEFAULT: '#66BB6A',
          light: '#81C784',
          dark: '#4CAF50'
        },
        warning: {
          DEFAULT: '#FFB800',
          light: '#FFC107',
          dark: '#FFA000'
        },
        error: {
          DEFAULT: '#EF5350'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'var(--radius-lg)',
        '2xl': 'var(--radius-xl)',
      },
      fontFamily: {
        display: ['Anton', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'system-ui', 'sans-serif'],
        body: ['Roboto', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-amber': '0 0 5px rgba(255, 191, 0, 0.1)',
        'neon-blue': '0 0 5px rgba(0, 127, 255, 0.1)',
        'glass-dark': '0 8px 16px rgba(10, 10, 10, 0.2)',
        'glass-amber': '0 8px 16px rgba(255, 191, 0, 0.05)',
        'glass-blue': '0 8px 16px rgba(0, 127, 255, 0.05)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-amber': 'linear-gradient(135deg, rgba(50, 40, 25, 0.45), rgba(28, 22, 12, 0.35))',
        'gradient-blue': 'linear-gradient(135deg, rgba(26, 26, 46, 0.45), rgba(10, 10, 26, 0.35))'
      },
      backgroundColor: {
        'glass-dark': 'rgba(28, 30, 45, 0.45)',
        'glass-amber': 'rgba(50, 40, 25, 0.45)',
        'glass-blue': 'rgba(26, 26, 46, 0.45)'
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'glow-hover': 'glow-hover 1s ease-in-out infinite alternate',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        'text-glow': 'text-glow 1.5s ease-in-out infinite alternate',
        'text-glow-amber': 'text-glow-amber 1.5s ease-in-out infinite alternate',
        'text-glow-blue': 'text-glow-blue 1.5s ease-in-out infinite alternate',
        'orb-float-1': 'orb-float 25s ease-in-out infinite',
        'orb-float-2': 'orb-float 30s ease-in-out infinite reverse',
        'planner-glow': 'planner-glow 4s ease-in-out infinite'
      },
      keyframes: {
        'glow': {
          'from': {
            'box-shadow': '0 0 4px rgba(0, 127, 255, 0.08)',
          },
          'to': {
            'box-shadow': '0 0 6px rgba(0, 127, 255, 0.12)',
          },
        },
        'glow-hover': {
          'from': {
            'box-shadow': '0 0 5px rgba(0, 127, 255, 0.12)',
          },
          'to': {
            'box-shadow': '0 0 8px rgba(0, 127, 255, 0.15)',
          },
        },
        'pulse-subtle': {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '0.8',
            transform: 'scale(0.98)',
          },
        },
        'text-glow': {
          'from': {
            'text-shadow': '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(0, 127, 255, 0.6)',
          },
          'to': {
            'text-shadow': '0 0 5px rgba(255, 255, 255, 0.6), 0 0 10px rgba(0, 127, 255, 0.4)',
          },
        },
        'text-glow-amber': {
          'from': {
            'text-shadow': '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 191, 0, 0.6)',
          },
          'to': {
            'text-shadow': '0 0 5px rgba(255, 255, 255, 0.6), 0 0 10px rgba(255, 191, 0, 0.4)',
          },
        },
        'text-glow-blue': {
          'from': {
            'text-shadow': '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(0, 127, 255, 0.6)',
          },
          'to': {
            'text-shadow': '0 0 5px rgba(255, 255, 255, 0.6), 0 0 10px rgba(0, 127, 255, 0.4)',
          },
        },
        'planner-glow': {
          '0%, 100%': {
            'filter': 'brightness(1) drop-shadow(0 0 0px rgba(255, 255, 255, 0))',
          },
          '50%': {
            'filter': 'brightness(1.2) drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))',
          }
        },
        'orb-float': {
          '0%, 100%': {
            transform: 'translate(0, 0) scale(1)',
            opacity: '0.08',
          },
          '25%': {
            transform: 'translate(-2%, 2%) scale(1.05)',
            opacity: '0.1',
          },
          '50%': {
            transform: 'translate(2%, -2%) scale(1)',
            opacity: '0.08',
          },
          '75%': {
            transform: 'translate(-1%, -1%) scale(0.95)',
            opacity: '0.06',
          },
        },
      },
    },
  },
  plugins: [],
}
