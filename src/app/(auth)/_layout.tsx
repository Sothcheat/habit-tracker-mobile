import { Stack } from "expo-router";

/**
 * Which screen a signed-out user lands on. Without this the router falls back
 * to whichever route happens to come first, which is alphabetical order rather
 * than a decision.
 */
export const unstable_settings = { initialRouteName: "sign-in" };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}
