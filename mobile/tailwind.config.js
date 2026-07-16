/** @type {import('tailwindcss').Config} */
// "Precision Industrial System" — dark-only control-room palette.
// Ported verbatim from frontend/src/App.css `.dark` block. Because the app
// runs dark-only we bake the hex values directly (no CSS-var runtime swap, no
// `dark:` variants needed).
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0b1326",
        foreground: "#dae2fd",
        card: { DEFAULT: "#171f33", foreground: "#dae2fd" },
        popover: { DEFAULT: "#222a3d", foreground: "#dae2fd" },
        primary: { DEFAULT: "#adc6ff", foreground: "#002e6a" },
        secondary: { DEFAULT: "#3a4a5f", foreground: "#dae2fd" },
        muted: { DEFAULT: "#222a3d", foreground: "#9ba1b4" },
        accent: { DEFAULT: "#2d3449", foreground: "#dae2fd" },
        destructive: { DEFAULT: "#d64b47", foreground: "#fef2f2" },
        border: "#2a3247",
        input: "#424754",
        ring: "#adc6ff",
        success: { DEFAULT: "#34d399", foreground: "#06281c" },
        warning: { DEFAULT: "#ffb786", foreground: "#502400" },
        info: { DEFAULT: "#adc6ff", foreground: "#002e6a" },
        chart: {
          1: "#adc6ff",
          2: "#34d399",
          3: "#ffb786",
          4: "#b7c8e1",
          5: "#ffb4ab",
        },
        sidebar: {
          DEFAULT: "#0b1326",
          foreground: "#c2c6d6",
          primary: "#1e2a44",
          "primary-foreground": "#adc6ff",
          accent: "#171f33",
          "accent-foreground": "#dae2fd",
          border: "#2a3247",
          ring: "#adc6ff",
        },
      },
      borderRadius: {
        sm: "2px",
        md: "4px",
        lg: "6px",
        xl: "10px",
      },
      fontFamily: {
        // Weight -> family mapping (RN can't synthesize weights for custom
        // fonts, so each weight is an explicit face). Keys are prefixed
        // `sans-*` to avoid colliding with Tailwind's font-weight utilities
        // (e.g. the built-in `font-bold` = font-weight:700). Use
        // `font-sans-semibold` etc. for the actual Inter faces.
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        "sans-bold": ["Inter_700Bold"],
        mono: ["JetBrainsMono_400Regular"],
      },
    },
  },
  plugins: [],
};
