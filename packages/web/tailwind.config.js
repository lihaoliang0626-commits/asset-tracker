/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			light: {
  				'0': '#FFFFFF',
  				'1': '#F8F8F8',
  				'2': '#F0F0F0',
  				'3': '#E5E5E5'
  			},
  			text: {
  				primary: '#000000',
  				secondary: '#333333',
  				tertiary: '#999999',
  				quaternary: '#CCCCCC'
  			},
  			accent: {
  				primary: '#6B5B95',
  				hover: '#5A4A7F',
  				light: '#D4C5F9',
  				secondary: '#A0A0A0',
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
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
  			}
  		},
  		fontFamily: {
  			sans: [
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'sans-serif'
  			],
  			mono: [
  				'Menlo',
  				'Monaco',
  				'Courier New',
  				'monospace'
  			]
  		},
  		fontSize: {
  			'4xl': [
  				'28px',
  				{
  					lineHeight: '1.2',
  					fontWeight: 700
  				}
  			],
  			'3xl': [
  				'20px',
  				{
  					lineHeight: '1.3',
  					fontWeight: 700
  				}
  			],
  			'2xl': [
  				'16px',
  				{
  					lineHeight: '1.4',
  					fontWeight: 600
  				}
  			],
  			base: [
  				'14px',
  				{
  					lineHeight: '1.6',
  					fontWeight: 400
  				}
  			],
  			sm: [
  				'12px',
  				{
  					lineHeight: '1.5',
  					fontWeight: 400
  				}
  			],
  			xs: [
  				'11px',
  				{
  					lineHeight: '1.4',
  					fontWeight: 400
  				}
  			],
  			hero: [
  				'48px',
  				{
  					lineHeight: '1.2',
  					letterSpacing: '-0.02em',
  					fontWeight: 700
  				}
  			]
  		},
  		spacing: {
  			'0': '0px',
  			'1': '4px',
  			'2': '8px',
  			'3': '12px',
  			'4': '16px',
  			'5': '20px',
  			'6': '24px',
  			'8': '32px',
  			'10': '40px',
  			'12': '48px',
  			'16': '64px'
  		},
  		borderRadius: {
  			none: '0px',
  			sm: 'calc(var(--radius) - 4px)',
  			md: 'calc(var(--radius) - 2px)',
  			lg: 'var(--radius)',
  			xl: '12px',
  			full: '9999px'
  		},
  		boxShadow: {
  			none: 'none',
  			sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  			md: '0 2px 8px rgba(0, 0, 0, 0.08)',
  			lg: '0 4px 12px rgba(0, 0, 0, 0.1)',
  			'button-hover': '0 2px 8px rgba(0, 0, 0, 0.08)'
  		},
  		transitionTimingFunction: {
  			standard: 'ease',
  			'ease-in': 'ease-in',
  			'ease-out': 'ease-out'
  		},
  		transitionDuration: {
  			fast: '0.15s',
  			normal: '0.2s',
  			slow: '0.3s'
  		},
  		animation: {
  			'fade-in': 'fadeIn 0.3s ease'
  		},
  		keyframes: {
  			fadeIn: {
  				from: {
  					opacity: 0
  				},
  				to: {
  					opacity: 1
  				}
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
  // 浅色模式（默认）
  darkMode: false,
};
