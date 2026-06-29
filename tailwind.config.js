/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b1326",
        "inverse-on-surface": "#283044",
        "primary-fixed": "#c8e6ff",
        "surface-container-low": "#131b2e",
        "on-primary-fixed-variant": "#004c6d",
        "surface-container-high": "#222a3d",
        "surface-container": "#171f33",
        "surface-container-highest": "#2d3449",
        error: "#ffb4ab",
        "on-background": "#dae2fd",
        "on-secondary-container": "#004119",
        "primary-container": "#24a1de",
        surface: "#0b1326",
        "on-secondary-fixed-variant": "#005321",
        outline: "#88929b",
        "error-container": "#93000a",
        "outline-variant": "#3e4850",
        "surface-dim": "#0b1326",
        "tertiary-fixed-dim": "#eec200",
        "primary-fixed-dim": "#86cfff",
        "on-primary-container": "#00344c",
        "secondary-container": "#00b954",
        "on-tertiary-fixed": "#231b00",
        "on-secondary-fixed": "#002109",
        "on-tertiary-container": "#4e3d00",
        secondary: "#4ae176",
        tertiary: "#eec200",
        "inverse-primary": "#00658f",
        "telegram-blue": "#24A1DE",
        "on-surface-variant": "#bec8d1",
        "warning-amber": "#FACC15",
        "surface-card": "#1E293B",
        "success-green": "#22C55E",
        "tertiary-fixed": "#ffe083",
        "on-error": "#690005",
        "surface-bright": "#31394d",
        "on-surface": "#dae2fd",
        "on-tertiary-fixed-variant": "#574500",
        "on-primary-fixed": "#001e2e",
        "text-muted": "#94A3B8",
        "surface-border": "#334155",
        "on-error-container": "#ffdad6",
        "secondary-fixed-dim": "#4ae176",
        "secondary-fixed": "#6bff8f",
        "surface-variant": "#2d3449",
        "on-secondary": "#003915",
        "surface-container-lowest": "#060e20",
        "surface-tint": "#86cfff",
        "on-primary": "#00344c",
        "tertiary-container": "#cea700",
        "inverse-surface": "#dae2fd",
        primary: "#86cfff",
        "on-tertiary": "#3c2f00"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      },
      spacing: {
        "stack-sm": "8px",
        "section-gap": "96px",
        "container-max": "1200px",
        "stack-lg": "32px",
        gutter: "24px",
        "stack-md": "16px"
      },
      fontFamily: {
        "stat-display": ["Manrope", "sans-serif"],
        "headline-sm": ["Manrope", "sans-serif"],
        "button-text": ["Inter", "sans-serif"],
        "headline-lg-mobile": ["Manrope", "sans-serif"],
        "headline-md": ["Manrope", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "headline-lg": ["Manrope", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"]
      },
      fontSize: {
        "stat-display": ["40px", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "800" }],
        "headline-sm": ["24px", { lineHeight: "1.3", fontWeight: "700" }],
        "button-text": ["16px", { lineHeight: "1", fontWeight: "600" }],
        "headline-lg-mobile": ["32px", { lineHeight: "1.2", fontWeight: "800" }],
        "headline-md": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "headline-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }]
      }
    }
  },
  plugins: []
};
