/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                },
                colors: {
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        },
                        // Financial Markets Color System
                        // Based on TradingView, Binance, Coinbase
                        trading: {
                                // Core backgrounds
                                dark: '#0F172A',        // Navy-black
                                panel: '#1E293B',       // Dark gray for cards
                                surface: '#334155',     // Elevated surfaces
                                
                                // Text hierarchy
                                text: '#E2E8F0',        // Light gray body
                                'text-muted': '#94A3B8', // Muted text
                                
                                // Semantic colors
                                positive: '#10B981',    // Green for gains
                                negative: '#EF4444',    // Red for losses
                                blue: '#3B82F6',        // Trustworthy blue
                                
                                // Crypto highlights
                                teal: '#14B8A6',        // Web3 accent
                                purple: '#A78BFA',      // Crypto accent
                                
                                // Borders
                                border: '#334155',
                                'border-light': '#475569',
                        }
                },
                fontFamily: {
                        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
                },
                fontSize: {
                        // Trading UI typography scale
                        'xs': ['12px', { lineHeight: '16px' }],
                        'sm': ['14px', { lineHeight: '20px' }],
                        'base': ['16px', { lineHeight: '24px' }],
                        'lg': ['18px', { lineHeight: '28px' }],
                        'xl': ['20px', { lineHeight: '28px' }],
                        '2xl': ['24px', { lineHeight: '32px', fontWeight: '600' }],
                        '3xl': ['30px', { lineHeight: '36px', fontWeight: '700' }],
                        '4xl': ['36px', { lineHeight: '40px', fontWeight: '700' }],
                        '5xl': ['48px', { lineHeight: '1', fontWeight: '800' }],
                },
                boxShadow: {
                        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
                        'dropdown': '0 10px 40px rgba(0, 0, 0, 0.4)',
                        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
                        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
                        'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
                },
                keyframes: {
                        'accordion-down': {
                                from: { height: '0' },
                                to: { height: 'var(--radix-accordion-content-height)' }
                        },
                        'accordion-up': {
                                from: { height: 'var(--radix-accordion-content-height)' },
                                to: { height: '0' }
                        },
                        'shimmer': {
                                '0%': { backgroundPosition: '200% 0' },
                                '100%': { backgroundPosition: '-200% 0' }
                        },
                        'ticker': {
                                '0%': { transform: 'translateX(0)' },
                                '100%': { transform: 'translateX(-50%)' }
                        },
                        'fade-in': {
                                '0%': { opacity: '0', transform: 'translateY(8px)' },
                                '100%': { opacity: '1', transform: 'translateY(0)' }
                        },
                        'scale-in': {
                                '0%': { opacity: '0', transform: 'scale(0.95)' },
                                '100%': { opacity: '1', transform: 'scale(1)' }
                        },
                        'slide-down': {
                                '0%': { opacity: '0', transform: 'translateY(-10px)' },
                                '100%': { opacity: '1', transform: 'translateY(0)' }
                        },
                        'pulse-live': {
                                '0%, 100%': { opacity: '1' },
                                '50%': { opacity: '0.5' }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'shimmer': 'shimmer 1.5s infinite',
                        'ticker': 'ticker 30s linear infinite',
                        'fade-in': 'fade-in 0.3s ease-out',
                        'scale-in': 'scale-in 0.2s ease-out',
                        'slide-down': 'slide-down 0.2s ease-out',
                        'pulse-live': 'pulse-live 2s ease-in-out infinite'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};
