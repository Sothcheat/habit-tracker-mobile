import { createContext, use, useRef, useState } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/** Where the trigger sits in the window, from `measureInWindow`. */
export type Anchor = { x: number; y: number; width: number; height: number };

/** Matches the web menu's `w-44`. Widths are on the 4pt grid. */
const MENU_WIDTH = 176;
/** Minimum breathing room from the screen edge. */
const EDGE = 8;
/** Gap between the trigger and the panel. All spacing is on the 4pt grid. */
const OFFSET = 8;

/** The web's `zoom-in-95`: a panel that grows from the control that opened it. */
const START_SCALE = 0.95;
const IN_MS = 140;
const OUT_MS = 100;

type PopoverApi = { requestClose: (then?: () => void) => void };
const PopoverContext = createContext<PopoverApi | null>(null);

/**
 * A small panel tethered to the control that opened it.
 *
 * A bottom sheet is the better answer for a large panel, but not for a
 * five-item context menu: the menu belongs to one card, and throwing it to the
 * bottom of the screen severs it from the thing it acts on.
 *
 * Positioning is `align="end"` like the web — the panel's right edge meets the
 * trigger's — then clamped inside the screen, and flipped above the trigger
 * when there is not room below.
 */
export function Popover({
  anchor,
  onClose,
  children,
  width = MENU_WIDTH,
  contentClassName,
}: {
  /** Null keeps it closed. */
  anchor: Anchor | null;
  onClose: () => void;
  children: React.ReactNode;
  /** Wider than a menu where the content needs it, e.g. an email address. */
  width?: number;
  /** Replaces the menu padding for panels that lay out their own sections. */
  contentClassName?: string;
}) {
  // The measuring, animating body is mounted only while open, so each opening
  // starts without the previous one's state. Holding it across closes is what
  // left BottomSheet with an invisible modal eating every touch.
  if (!anchor) return null;
  return (
    <PopoverPanel
      anchor={anchor}
      onClose={onClose}
      width={width}
      contentClassName={contentClassName}
    >
      {children}
    </PopoverPanel>
  );
}

function PopoverPanel({
  anchor,
  onClose,
  children,
  width,
  contentClassName,
}: {
  anchor: Anchor;
  onClose: () => void;
  children: React.ReactNode;
  width: number;
  contentClassName?: string;
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const reduceMotion = useReducedMotion();

  const progress = useSharedValue(0);
  const entered = useRef(false);

  // Never wider than the screen allows, however wide the caller asked for.
  const panelWidth = Math.min(width, screenWidth - EDGE * 2);
  const left = Math.min(
    Math.max(anchor.x + anchor.width - panelWidth, EDGE),
    screenWidth - panelWidth - EDGE,
  );

  const below = anchor.y + anchor.height + OFFSET;
  const roomBelow = screenHeight - below - insets.bottom - EDGE;
  // Height is unknown until the panel has laid out once, so it opens downward
  // and flips if it turns out not to fit. It stays invisible until then, so
  // the correction is never seen.
  const flip = height > 0 && height > roomBelow;

  function handleLayout(measured: number) {
    setHeight(measured);
    if (entered.current || measured === 0) return;
    entered.current = true;
    progress.value = reduceMotion
      ? 1
      : withTiming(1, { duration: IN_MS, easing: Easing.out(Easing.quad) });
  }

  /** Plays the panel out, then unmounts it and runs whatever follows. */
  function requestClose(then?: () => void) {
    const finish = () => {
      onClose();
      then?.();
    };
    if (reduceMotion || !height) {
      finish();
      return;
    }
    progress.value = withTiming(
      0,
      { duration: OUT_MS, easing: Easing.in(Easing.quad) },
      (done) => {
        if (done) runOnJS(finish)();
      },
    );
  }

  const panelStyle = useAnimatedStyle(() => ({
    opacity: height ? progress.value : 0,
    transform: [{ scale: START_SCALE + (1 - START_SCALE) * progress.value }],
  }));

  return (
    <Modal
      visible
      transparent
      // The modal animates nothing: the panel scales from its trigger, which
      // a window-level fade cannot express.
      animationType="none"
      // Android's hardware back must dismiss it, or the menu traps the user.
      onRequestClose={onClose}
      // Deliberately NOT statusBarTranslucent. `measureInWindow` reports the
      // trigger in content coordinates, but a translucent modal starts at the
      // true top of the screen — so every anchor came out short by exactly the
      // status bar's height, which is the gap that opened above the add
      // button. Leaving the modal inside the content area puts both in the
      // same space. Nothing is lost visually: this backdrop is transparent.
    >
      <Pressable
        className="flex-1"
        onPress={() => requestClose()}
        accessibilityRole="button"
        accessibilityLabel="Close menu"
      />
      {/*
        When flipping, the panel is pinned by its *bottom* edge rather than
        placed at `anchor.y - height`: a wrapper spanning from the top of the
        screen to just above the trigger, with the panel pushed to its end.
        Subtracting a measured height meant any disagreement between the
        measurement and the modal's own coordinate space showed up as a gap.
        This way the gap is `OFFSET`, by construction.
      */}
      <View
        pointerEvents="box-none"
        style={
          flip
            ? { position: "absolute", top: 0, height: anchor.y - OFFSET, left, width: panelWidth, justifyContent: "flex-end" }
            : { position: "absolute", top: below, left, width: panelWidth }
        }
      >
        <Animated.View
          onLayout={(event) => handleLayout(event.nativeEvent.layout.height)}
          style={[
            panelStyle,
            // Grows from the corner nearest the trigger, so it reads as coming
            // out of the control rather than appearing over it.
            { transformOrigin: flip ? "100% 100%" : "100% 0%" },
          ]}
          className={cn(
            "overflow-hidden rounded-lg border border-border bg-popover",
            contentClassName ?? "gap-0.5 p-1.5",
          )}
        >
          <PopoverContext value={{ requestClose }}>{children}</PopoverContext>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * One row of a popover menu. `destructive` is the only tone a row may carry.
 *
 * Closing is the row's own job: it plays the panel out and only then runs the
 * action, so a menu is never left standing over whatever the action opens.
 */
export function PopoverItem({
  label,
  icon,
  onPress,
  disabled = false,
  destructive = false,
}: {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const popover = use(PopoverContext);

  return (
    <Pressable
      onPress={() => (popover ? popover.requestClose(onPress) : onPress())}
      disabled={disabled}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className={cn(
        "h-10 flex-row items-center gap-2.5 rounded-md px-2.5 active:bg-accent",
        disabled && "opacity-50",
      )}
    >
      {icon}
      <Text
        numberOfLines={1}
        className={cn(
          "text-sm",
          destructive ? "text-destructive" : "text-popover-foreground",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A hairline between groups of rows. */
export function PopoverSeparator() {
  return <View className="my-1 h-px bg-border" />;
}
