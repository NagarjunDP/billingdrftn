import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a0f",
          surface: "#12121a",
          card: "#1a1a26",
          elevated: "#22223a",
        },
        border: {
          DEFAULT: "#2a2a40",
          soft: "#1e1e30",
        },
        accent: {
          DEFAULT: "#6c63ff",
          hover: "#7b74ff",
          glow: "rgba(108, 99, 255, 0.25)",
        },
        muted: {
          DEFAULT: "#8888aa",
          dim: "#55556a",
        },
        success: {
          DEFAULT: "#22c55e",
          bg: "rgba(34, 197, 94, 0.12)",
        },
        warning: {
          DEFAULT: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.12)",
        },
        danger: {
          DEFAULT: "#ef4444",
          bg: "rgba(239, 68, 68, 0.12)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        DEFAULT: "14px",
        sm: "8px",
        pill: "100px",
      },
      boxShadow: {
        DEFAULT: "0 4px 24px rgba(0,0,0,0.5)",
        sm: "0 2px 8px rgba(0,0,0,0.3)",
        accent: "0 4px 24px rgba(108,99,255,0.25)",
        "accent-lg": "0 8px 32px rgba(108,99,255,0.4)",
      },
      animation: {
        "slide-up": "slide-up 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-in": "fade-in 0.15s ease",
        flash: "flash 1.2s ease forwards",
        spin: "spin 0.7s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        "slide-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        flash: {
          "0%": { background: "rgba(108, 99, 255, 0.3)" },
          "100%": { background: "transparent" },
        },
      },
      screens: {
        xs: "360px",
        sm: "390px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
