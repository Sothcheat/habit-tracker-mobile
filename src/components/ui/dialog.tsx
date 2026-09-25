import { Modal, Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

/**
 * A centred modal for a decision that has to be made before anything else.
 *
 * Deliberately not `Alert.alert`: the system alert dismisses the moment a
 * button is pressed, and the one place this is used — deleting a task — must
 * stay open until the request resolves, so a failure can be shown in place
 * rather than vanishing with the dialog.
 */
export function Dialog({
  visible,
  onClose,
  title,
  description,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** The footer actions. */
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      // Both, so the scrim covers the system bars rather than stopping short.
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View className="flex-1 justify-center bg-black/50 px-6">
        {/* The backdrop dismisses, but only outside the card. */}
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View className="gap-4 rounded-xl border border-border bg-popover p-5">
          <View className="gap-1.5">
            <Text
              accessibilityRole="header"
              className="font-semibold text-popover-foreground text-lg tracking-tight"
            >
              {title}
            </Text>
            {description ? (
              <Text className="text-muted-foreground text-sm leading-relaxed">
                {description}
              </Text>
            ) : null}
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
