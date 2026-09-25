import type { LucideIcon } from "lucide-react-native";
import type { ColorValue } from "react-native";
import { cssInterop } from "nativewind";
import { cn } from "@/lib/utils";

/**
 * A lucide icon that takes a className for its colour.
 *
 * The web build sized and coloured icons with descendant selectors
 * (`[&_svg]:size-4`), which NativeWind has no equivalent for — so size is an
 * explicit prop here and every call site must pass one it means. The default of
 * 16 matches the web's `size-4`, which is what most of the app used.
 *
 * Colour still comes from a token: cssInterop lifts `text-*` out of the style
 * object and onto the icon's own `color` prop.
 */
type IconProps = {
  /** The lucide component itself, e.g. `Plus`. */
  as: LucideIcon;
  size?: number;
  className?: string;
  strokeWidth?: number;
  /**
   * A resolved colour, for the few callers that cannot use a className —
   * react-navigation's tabBarIcon hands one down as a ColorValue. Prefer
   * className everywhere else so the token stays the source of truth.
   */
  color?: ColorValue;
};

export function Icon({ as: Component, size = 16, className, strokeWidth, color }: IconProps) {
  if (color) {
    return <Component size={size} strokeWidth={strokeWidth} color={color as string} />;
  }
  return (
    <StyledIcon
      as={Component}
      size={size}
      strokeWidth={strokeWidth}
      className={cn("text-foreground", className)}
    />
  );
}

function RawIcon({
  as: Component,
  size,
  strokeWidth,
  ...props
}: IconProps & { color?: string }) {
  return <Component size={size} strokeWidth={strokeWidth} {...props} />;
}

const StyledIcon = cssInterop(RawIcon, {
  className: { target: false, nativeStyleToProp: { color: true } },
});
