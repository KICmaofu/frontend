/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
    },
    extend: {
      colors: {
        // 蓝图主题色板
        ink: {
          950: "#0E1116", // 主背景 深炭灰
          900: "#0F1B2A", // 次面板 蓝图蓝
          800: "#13243A", // 卡片底
          700: "#1B3149", // 卡片描边/悬浮
          600: "#244059", // 分隔线亮
        },
        blueprint: {
          50: "#E8EDF2", // 主前景文字
          100: "#C7D2DD",
          200: "#9FB0C0",
          300: "#6B8298",
          400: "#3B82F6", // 链接/次要 蓝图线
          500: "#22D3EE", // 主操作/正确 电光青
          600: "#0EA5C4",
        },
        amber: {
          // 警示琥珀（错误/标记）
          DEFAULT: "#F59E0B",
          400: "#FBBF24",
          600: "#D97706",
        },
        emerald: {
          // 正确辅色
          DEFAULT: "#34D399",
        },
      },
      fontFamily: {
        mono: ['"Space Mono"', "ui-monospace", "monospace"],
        serif: ['"IBM Plex Serif"', "Georgia", "serif"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        // 直角微圆 2px
        blueprint: "2px",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,211,238,0.5), 0 0 24px rgba(34,211,238,0.15)",
        "glow-amber": "0 0 0 1px rgba(245,158,11,0.5), 0 0 24px rgba(245,158,11,0.15)",
        card: "0 1px 0 0 rgba(34,211,238,0.08) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-x": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-cyan": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(34,211,238,0.6)" },
          "50%": { boxShadow: "0 0 0 8px rgba(34,211,238,0)" },
        },
        "shake": {
          "0%,100%": { transform: "translateX(0)" },
          "20%,60%": { transform: "translateX(-4px)" },
          "40%,80%": { transform: "translateX(4px)" },
        },
        "grid-pan": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "40px 40px" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.4s ease both",
        "slide-x": "slide-x 0.3s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-cyan": "pulse-cyan 1.2s ease-out",
        "shake": "shake 0.4s ease",
        "grid-pan": "grid-pan 8s linear infinite",
      },
    },
  },
  plugins: [],
};
