import "@/global.css";
// Side-effect import so storage is installed before anything reads it, even
// though @/lib/storage also exports the binding as a value.
import "@/lib/storage";

import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  useFonts,
} from "@expo-google-fonts/montserrat";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { THEME_COLORS } from "@/lib/theme-colors";

SplashScreen.preventAutoHideAsync();

function Chrome({ children }: { children: React.ReactNode }) {
  const { resolved } = useTheme();

  // Paints the window itself, so overscrolling a list does not reveal white
  // behind a dark app.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(THEME_COLORS[resolved].background);
  }, [resolved]);

  return (
    <>
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      {children}
    </>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { session, loading } = useAuth();

  // Hold the splash until both the fonts and the stored session have resolved.
  // Without the session half, a signed-in user sees the sign-in screen flash
  // before being bounced to the tracker.
  useEffect(() => {
    if (fontsReady && !loading) SplashScreen.hideAsync();
  }, [fontsReady, loading]);

  if (!fontsReady || loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/*
        The guards are the redirect. When one flips false its history entries
        are dropped and the router falls back to the first available screen, so
        nothing in the app navigates by hand after sign-in or sign-out — the
        session changes and the tree follows.

        They are UX only. Row level security is the actual boundary.
      */}
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Montserrat at 400/500/600 only. RN cannot synthesize variable-font weights
  // and Android ignores fontWeight on a custom family, so each weight is its own
  // registered face — see the fontFamily block in tailwind.config.js.
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
  });

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Chrome>
          <ErrorBoundary section="The app">
            <AuthProvider>
              <RootNavigator fontsReady={Boolean(fontsLoaded || fontError)} />
            </AuthProvider>
          </ErrorBoundary>
        </Chrome>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
