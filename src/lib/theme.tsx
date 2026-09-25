import { colorScheme, useColorScheme } from "nativewind";
import { createContext, use, useCallback, useEffect, useState } from "react";
import { storage } from "@/lib/storage";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "cadence-theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(): Theme {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

type ThemeState = {
  /** What the user chose, which may be "system". */
  theme: Theme;
  /** What that currently renders as. */
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  // NativeWind owns which tokens are live: colorScheme.set() is what the web
  // build did by toggling `dark` on <html>. Passing "system" hands the decision
  // back to the OS, so the two extra effects the web version needed — one to
  // apply the class, one to subscribe to matchMedia — collapse into this.
  useEffect(() => {
    colorScheme.set(theme);
  }, [theme]);

  // Read back rather than deriving: with theme === "system" this is the only
  // thing that knows what the OS actually chose.
  const { colorScheme: active } = useColorScheme();
  const resolved = active === "dark" ? "dark" : "light";

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      storage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisting is survivable; the choice still applies this session.
    }
  }, []);

  return (
    <ThemeContext value={{ theme, resolved, setTheme }}>{children}</ThemeContext>
  );
}

export function useTheme() {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>.");
  }
  return context;
}
