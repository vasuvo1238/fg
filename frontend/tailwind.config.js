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
                        // Custom Fintech Colors
                        fintech: {
                                dark: '#0A0C12',
                                surface: '#0F1219',
                                card: '#141922',
                                border: '#1E2432',
                                teal: '#00C2A8',
                                'teal-dark': '#00A896',
                                purple: '#8B5CF6',
                                'purple-dark': '#7C3AED',
                                amber: '#F59E0B',
                                coral: '#EF4444',
                                blue: '#38A5FF',
                        }
                },
                fontFamily: {
                        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
                },
                boxShadow: {
                        'glow-teal': '0 0 20px rgba(0, 194, 168, 0.15), 0 0 40px rgba(0, 194, 168, 0.05)',
                        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.15), 0 0 40px rgba(139, 92, 246, 0.05)',
                        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.15), 0 0 40px rgba(245, 158, 11, 0.05)',
                        'card-hover': '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 1px rgba(255, 255, 255, 0.1)',
                        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
                },
                backgroundImage: {
                        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                        'gradient-mesh': `
                                radial-gradient(at 40% 20%, rgba(0, 194, 168, 0.08) 0px, transparent 50%),
                                radial-gradient(at 80% 0%, rgba(139, 92, 246, 0.08) 0px, transparent 50%),
                                radial-gradient(at 0% 50%, rgba(0, 194, 168, 0.05) 0px, transparent 50%),
                                radial-gradient(at 80% 50%, rgba(139, 92, 246, 0.05) 0px, transparent 50%)
                        `,
                        'gradient-card': 'linear-gradient(135deg, rgba(25, 30, 42, 1) 0%, rgba(15, 18, 25, 1) 100%)',
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
                        'pulse-glow': {
                                '0%, 100%': { boxShadow: '0 0 20px rgba(0, 194, 168, 0.2)' },
                                '50%': { boxShadow: '0 0 30px rgba(0, 194, 168, 0.4)' }
                        },
                        'float': {
                                '0%, 100%': { transform: 'translateY(0px)' },
                                '50%': { transform: 'translateY(-10px)' }
                        },
                        'fade-in': {
                                '0%': { opacity: '0', transform: 'translateY(10px)' },
                                '100%': { opacity: '1', transform: 'translateY(0)' }
                        },
                        'slide-in-right': {
                                '0%': { opacity: '0', transform: 'translateX(20px)' },
                                '100%': { opacity: '1', transform: 'translateX(0)' }
                        },
                        'scale-in': {
                                '0%': { opacity: '0', transform: 'scale(0.95)' },
                                '100%': { opacity: '1', transform: 'scale(1)' }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'shimmer': 'shimmer 1.5s infinite',
                        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                        'float': 'float 6s ease-in-out infinite',
                        'fade-in': 'fade-in 0.3s ease-out',
                        'slide-in-right': 'slide-in-right 0.3s ease-out',
                        'scale-in': 'scale-in 0.2s ease-out'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};
