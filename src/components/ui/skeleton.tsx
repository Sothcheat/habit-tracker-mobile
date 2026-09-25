import { useEffect } from "react";
import type { ViewProps } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";

/**
 * The web build's `animate-pulse`. Reanimated has no such utility, so this is
 * the same two-second ease-in-out cycle by hand.
 *
 * The design system collapses all motion under prefers-reduced-motion; the
 * native equivalent is the OS setting, so the placeholder simply holds still.
 */
export function Skeleton({ className, style, ...props }: ViewProps) {
  const opacity = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={cn("rounded-md bg-muted", className)}
      style={[animated, style]}
      {...props}
    />
  );
}
