import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { ThemeToggle } from "@/components/theme-toggle";
import { Text } from "@/components/ui/text";
import { Wordmark } from "@/components/wordmark";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { THEME_COLORS } from "@/lib/theme-colors";
import { useTheme } from "@/lib/theme";

type AuthLayoutProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  /** Rendered under the card, e.g. the link to the other form. */
  footer: React.ReactNode;
};

const BASE_BOTTOM_PADDING = 48;

/**
 * Centred single-column auth screen: wordmark, a card holding the form, and a
 * footer line. One soft accent wash behind it all — enough to keep the screen
 * from reading as a blank sheet, faint enough to stay out of the way.
 *
 * The wash was a CSS radial-gradient on the web. NativeWind has no gradients,
 * and expo-linear-gradient cannot do radial, so it is an SVG painted from the
 * accent token.
 */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  const { resolved } = useTheme();
  const accent = THEME_COLORS[resolved].accent;
  const keyboardHeight = useKeyboardHeight();

  return (
    <View className="flex-1 bg-background">
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          {/*
            The web's `radial-gradient(70% 55% at 50% 0%, var(--accent),
            transparent 70%)` under `opacity-70`. The element opacity is folded
            into the first stop, and the falloff completes at 70% of the radius
            rather than 100% — running it to the edge is what turned a tint
            into a visible vignette.
          */}
          <RadialGradient id="wash" cx="50%" cy="0%" rx="70%" ry="55%">
            <Stop offset="0" stopColor={accent} stopOpacity={0.7} />
            <Stop offset="0.7" stopColor={accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wash)" />
      </Svg>

      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        {/*
          In normal flow, not absolutely positioned. RN resolves `absolute`
          against the parent's border box, so a SafeAreaView's inset padding
          does not move an absolute child — the toggle ended up under the
          status bar and could not be tapped.
        */}
        <View className="flex-row justify-end px-4 py-2">
          <ThemeToggle />
        </View>

        <ScrollView
          contentContainerClassName="grow justify-center gap-8 px-4 pt-4"
          // The keyboard's height as padding is what gives the scroll view
          // something to scroll: without it a form that fits the screen exactly
          // has no overflow, and the lower fields sit unreachable behind the
          // keyboard. See useKeyboardHeight.
          contentContainerStyle={{ paddingBottom: BASE_BOTTOM_PADDING + keyboardHeight }}
          // Without this the first tap on a field or button while the keyboard
          // is up only dismisses the keyboard, and the press is swallowed.
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Wordmark className="self-center" />

          <View className="gap-6 rounded-xl border border-border bg-card p-6">
            <View className="gap-1.5">
              <Text
                accessibilityRole="header"
                className="font-semibold text-card-foreground text-xl tracking-tight"
              >
                {title}
              </Text>
              <Text className="text-muted-foreground text-sm leading-relaxed">
                {description}
              </Text>
            </View>

            {children}
          </View>

          <View className="flex-row justify-center">{footer}</View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
