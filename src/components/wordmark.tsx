import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { Text } from "@/components/ui/text";
import { APP_NAME } from "@/lib/brand";
import { useTheme } from "@/lib/theme";
import { THEME_COLORS } from "@/lib/theme-colors";
import { cn } from "@/lib/utils";

/**
 * Three rising bars — a cadence building. The mark carries the brand so the
 * name itself can stay quiet.
 */
export function Wordmark({ className }: { className?: string }) {
  const { resolved } = useTheme();
  const primary = THEME_COLORS[resolved].primary;

  return (
    <View className={cn("flex-row items-center gap-2.5", className)}>
      <Svg
        viewBox="0 0 32 32"
        width={28}
        height={28}
        // The name is right beside it; announcing the mark too would repeat it.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Rect x={4} y={18} width={5} height={10} rx={2.5} fill={primary} opacity={0.45} />
        <Rect x={13.5} y={12} width={5} height={16} rx={2.5} fill={primary} opacity={0.7} />
        <Rect x={23} y={4} width={5} height={24} rx={2.5} fill={primary} />
      </Svg>
      <Text className="font-semibold text-foreground text-lg tracking-tight">
        {APP_NAME}
      </Text>
    </View>
  );
}
