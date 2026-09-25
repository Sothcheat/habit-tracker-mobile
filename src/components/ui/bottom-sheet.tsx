import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

/** Breathing room kept between the sheet's top and the status bar. */
const TOP_GAP = 24;

type SheetBody = (api: { requestClose: () => void }) => React.ReactNode;

/**
 * A panel that rises from the bottom edge, sized to its content.
 *
 * Used for the app's large overlays. Small anchored menus use `Popover`
 * instead — a sheet severs a five-item context menu from the card it acts on.
 *
 * Children receive `requestClose`, which plays the sheet out before unmounting.
 * Calling `onClose` directly would make it vanish.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  children: SheetBody;
  /** Pinned below the scrolling area, e.g. a row of actions. */
  footer?: SheetBody;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      // The modal animates nothing; the scrim and the sheet need different
      // motion, and "slide" would carry the scrim up with the sheet as one
      // tall panel.
      animationType="none"
      onRequestClose={onClose}
      // Both, or the modal window stops short of the system bars and the sheet
      // cannot sit flush with the bottom edge. `navigationBarTranslucent`
      // requires `statusBarTranslucent`; RN warns if it is given alone.
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/*
        Mounted only while open, so every opening starts from a clean animation
        state. Keeping it alive across closes left the entrance latched and
        `progress` at 0: the modal was visible but the sheet sat off-screen
        behind a fully transparent scrim, which went on swallowing every touch —
        the screen looked dead and felt laggy.
      */}
      {visible ? (
        <SheetContent onClose={onClose} footer={footer}>
          {children}
        </SheetContent>
      ) : null}
    </Modal>
  );
}

function SheetContent({
  onClose,
  children,
  footer,
}: {
  onClose: () => void;
  children: SheetBody;
  footer?: SheetBody;
}) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  /**
   * 0 is closed (sheet below the screen, scrim clear), 1 is open.
   *
   * Driven by hand rather than with Reanimated's `entering`/`exiting` layout
   * animations. Inside a `Modal` those left the sheet holding a residual
   * transform: it was drawn shifted off the bottom edge while its touch
   * targets stayed where the untransformed layout had put them, so a button
   * rendered in one place and responded in another. Here the end value is
   * explicit — `(1 - 1) * height` is exactly 0 — so drawing and hit-testing
   * cannot drift apart.
   */
  const progress = useSharedValue(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  const entered = useRef(false);
  const reduceMotion = useReducedMotion();

  /**
   * Measured, not a percentage. `maxHeight: "92%"` is 92% of the *screen* and
   * ignores the keyboard, so once the keyboard pushed the sheet up a tall
   * panel grew straight past the status bar.
   */
  const maxHeight = screenHeight - insets.top - keyboardHeight - TOP_GAP;

  /**
   * Starts the entrance the moment the sheet has a height.
   *
   * From layout rather than an effect: a content-sized sheet does not know how
   * far it must travel until it has been laid out once — and the height
   * changes again later (the keyboard, a growing field), which is why the
   * entrance is latched.
   */
  function handleLayout(height: number) {
    setSheetHeight(height);
    if (entered.current || height === 0) return;
    entered.current = true;
    progress.value = reduceMotion
      ? 1
      : withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
  }

  function requestClose() {
    if (reduceMotion || !sheetHeight) {
      onClose();
      return;
    }
    progress.value = withTiming(
      0,
      { duration: 180, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onClose)();
      },
    );
  }

  const sheetStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: (1 - progress.value) * sheetHeight }],
      // Hidden until measured, so the first frame is never a flash at rest.
      opacity: sheetHeight ? 1 : 0,
    }),
    [sheetHeight],
  );

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <View className="flex-1 justify-end">
      <Animated.View style={scrimStyle} className="absolute inset-0">
        <Pressable
          className="flex-1 bg-black/50"
          onPress={requestClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
      </Animated.View>

      <Animated.View
        onLayout={(event) => handleLayout(event.nativeEvent.layout.height)}
        style={[
          sheetStyle,
          { maxHeight, marginBottom: keyboardHeight, paddingBottom: insets.bottom },
        ]}
        className="overflow-hidden rounded-t-xl border-border border-t bg-background"
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children({ requestClose })}
        </ScrollView>
        {footer ? footer({ requestClose }) : null}
      </Animated.View>
    </View>
  );
}
