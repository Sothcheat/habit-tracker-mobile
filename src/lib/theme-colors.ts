/**
 * The few palette values needed *outside* NativeWind's style system.
 *
 * Two places cannot read a className: react-native-svg paint attributes
 * (`fill`, `stopColor`) and expo-system-ui's window colour. Reading them from
 * the live CSS variables via `useUnstableNativeVariable` is not reliable — the
 * value is absent on first render, and react-native-svg bakes an unresolved
 * stop colour to **black** (`extractGradient.ts:71`), which paints a dark blob
 * instead of a tint.
 *
 * So this is the one place the palette is mirrored in JS. Rule 5 still holds,
 * because `theme-colors.test.ts` parses `global.css` and fails if these drift
 * from the real tokens.
 */
export const THEME_COLORS = {
  light: {
    background: "rgb(250, 250, 252)",
    accent: "rgb(238, 240, 251)",
    primary: "rgb(103, 98, 150)",
    card: "rgb(255, 255, 255)",
    border: "rgb(230, 230, 235)",
    "muted-foreground": "rgb(112, 112, 127)",
  },
  dark: {
    background: "rgb(23, 23, 32)",
    accent: "rgb(50, 51, 68)",
    primary: "rgb(164, 160, 211)",
    card: "rgb(32, 33, 43)",
    border: "rgb(52, 53, 65)",
    "muted-foreground": "rgb(157, 157, 171)",
  },
} as const;

export type ThemeColorName = keyof (typeof THEME_COLORS)["light"];
