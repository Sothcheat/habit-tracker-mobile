import { Tabs } from "expo-router";
import { Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Anchor } from "@/components/ui/popover";
import {
  TAB_BAR_GAP,
  TAB_BAR_HEIGHT,
  TAB_BAR_MARGIN,
  TAB_BAR_SPACING,
} from "@/components/tab-bar-metrics";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/theme";
import { THEME_COLORS } from "@/lib/theme-colors";
import { cn } from "@/lib/utils";

/**
 * Derived from the public `Tabs` type rather than importing
 * @react-navigation/bottom-tabs, which expo-router vendors internally and does
 * not install as a top-level dependency.
 */
type TabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];

/**
 * RN takes a single shadow on iOS and only `elevation` on Android, so this
 * approximates the design system's diffuse layer and accepts the loss — see
 * PORTING.md Rule 7. It is the only shadow in the app.
 */
const LIFT = {
  elevation: 8,
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
} as const;

/**
 * A floating pill of tabs with the add button detached beside it.
 *
 * Labelled, not icon-only: `Diff`, `CalendarDays` and `SquareCheckBig` do not
 * say "habit", "daily" and "to-do" to someone who has not been told, and this
 * app's three types are its whole mental model.
 *
 * Each tab is `flex-1`, so they divide the pill evenly. `justify-between`
 * flung them to the edges and left a hole in the middle; sizing the pill to
 * its contents crammed them together. An equal share of a full-width pill is
 * neither.
 *
 * The active tab is marked by tint *and* weight, so the state never rests on
 * colour alone.
 */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
  onAddPress,
}: TabBarProps & { onAddPress?: (anchor: Anchor) => void }) {
  const insets = useSafeAreaInsets();
  const { resolved } = useTheme();
  const colors = THEME_COLORS[resolved];
  const addButton = useRef<View>(null);

  return (
    <View
      style={{
        bottom: insets.bottom + TAB_BAR_GAP,
        paddingHorizontal: TAB_BAR_MARGIN,
      }}
      className="absolute inset-x-0 flex-row items-center"
      pointerEvents="box-none"
    >
      {/* flex-1 so the pill reaches the same gutter the columns use, with the
          tabs spread across it rather than huddled in the middle. */}
      <View
        style={[{ height: TAB_BAR_HEIGHT }, LIFT]}
        className="flex-1 flex-row items-center justify-between rounded-full border border-border bg-card px-2"
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              // No android_ripple. Android's ripple takes a flat colour that
              // cannot follow the theme, and any value picked for one scheme
              // is wrong in the other. A token-backed pressed state is correct
              // in both by construction, and matches every other control.
              className="h-11 flex-1 items-center justify-center gap-0.5 rounded-full active:bg-accent"
            >
              {options.tabBarIcon?.({
                focused,
                color: focused ? colors.primary : colors["muted-foreground"],
                size: 20,
              })}
              <Text
                numberOfLines={1}
                className={cn(
                  "text-xs",
                  focused ? "font-medium text-primary" : "font-sans text-muted-foreground",
                )}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ width: TAB_BAR_SPACING }} />

      <Pressable
        ref={addButton}
        onPress={() => {
          // Measured at press: the picker anchors to where the button is now.
          addButton.current?.measureInWindow((x, y, width, height) => {
            onAddPress?.({ x, y, width, height });
          });
        }}
        accessibilityRole="button"
        accessibilityLabel="Add task"
        style={[{ height: TAB_BAR_HEIGHT, width: TAB_BAR_HEIGHT }, LIFT]}
        // The fill stays opaque and the button scales instead.
        //
        // A translucent pressed state (bg-primary/85) composites over whatever
        // is *behind* the button, so on a near-white page it LIGHTENS the
        // violet — dropping the white plus from 5.44:1 to 3.97:1, under AA,
        // which reads as the icon reacting too. On a dark page the same class
        // darkens instead, which is why it only looked wrong in light mode.
        // A transform has no such dependency on the backdrop.
        className="items-center justify-center rounded-full bg-primary active:scale-95"
      >
        <Icon as={Plus} size={26} className="text-primary-foreground" />
      </Pressable>
    </View>
  );
}
