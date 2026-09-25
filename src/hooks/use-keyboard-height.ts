import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * How much of the screen the keyboard currently covers, in points.
 *
 * Scroll views add this as bottom padding so their content becomes taller than
 * the viewport while the keyboard is up, which is the only thing that makes the
 * lower fields reachable. Without it a form that exactly fits the screen has
 * nothing to scroll, and the keyboard simply covers whatever is behind it —
 * `KeyboardAvoidingView` does not help on Android, where `behavior` has to be
 * undefined and the window does not reliably resize under edge-to-edge.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS gets the "will" events so the padding animates with the keyboard;
    // Android only emits the "did" pair.
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, (event) => {
      setHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
