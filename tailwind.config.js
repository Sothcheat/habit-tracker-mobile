/**
 * Cadence design tokens, ported from the web build's src/index.css.
 *
 * React Native cannot parse oklch(), so every colour is stored as an "R G B"
 * triplet CSS variable in src/global.css and read back through
 * rgb(var(--token) / <alpha-value>). That indirection is what keeps Tailwind's
 * alpha modifier working: bg-positive/25 and bg-caution/30 are how task state
 * is expressed, and a plain hex would break them.
 *
 * Never write a raw colour, radius or shadow in a component. Add a token here.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    // No font-weight utilities at all. Tailwind would otherwise emit
    // .font-medium and .font-semibold a second time as font-weight rules,
    // colliding with the font families above. Dropping the scale also enforces
    // the design system's rule that 700 is never used for UI text: font-bold
    // simply does not exist in this project.
    fontWeight: {},
    extend: {
      colors: {
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        // Task state. Positive = a habit going well; caution = needs you today.
        // Tints, not paint: they wash a card strip and fill only the small
        // control inside it. They never colour text. Priority has no colour.
        positive: {
          DEFAULT: 'rgb(var(--positive) / <alpha-value>)',
          foreground: 'rgb(var(--positive-foreground) / <alpha-value>)',
        },
        caution: {
          DEFAULT: 'rgb(var(--caution) / <alpha-value>)',
          foreground: 'rgb(var(--caution-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
      },
      borderRadius: {
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
      },
      fontFamily: {
        // Montserrat at 400/500/600 only. RN cannot synthesize variable-font
        // weights, and on Android fontWeight is ignored on a custom
        // fontFamily, so each weight has to be its own registered face.
        //
        // These deliberately claim the names font-medium and font-semibold.
        // Paired with the fontWeight override below, that makes the familiar
        // utility do the right thing instead of silently setting a weight no
        // renderer can honour.
        sans: ['Montserrat_400Regular'],
        medium: ['Montserrat_500Medium'],
        semibold: ['Montserrat_600SemiBold'],
      },
    },
  },
  plugins: [],
};
