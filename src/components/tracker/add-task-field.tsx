import { useRef, useState } from "react";
import { type TextInput, View } from "react-native";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import type { Result } from "@/lib/tasks/use-tracker";

/**
 * Quick-add at the head of a column: a title and nothing else.
 *
 * On failure the text is kept — only the request failed, not what they typed —
 * and focus returns either way, so several can be added in a row.
 */
export function AddTaskField({
  placeholder,
  onAdd,
  disabled,
  inputRef,
}: {
  placeholder: string;
  onAdd: (title: string) => Promise<Result>;
  disabled: boolean;
  /** So the add button in the tab bar can put the cursor here. */
  inputRef?: React.RefObject<TextInput | null>;
}) {
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ownRef = useRef<TextInput>(null);
  const ref = inputRef ?? ownRef;

  async function handleSubmit() {
    if (!title.trim()) return;

    setPending(true);
    setError(null);
    const result = await onAdd(title);
    setPending(false);

    if (result.error) setError(result.error);
    else setTitle("");

    // The field was disabled while saving; focus once it is enabled again.
    ref.current?.focus();
  }

  return (
    <View className="gap-1.5">
      <Input
        ref={ref}
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          if (error) setError(null);
        }}
        onSubmitEditing={handleSubmit}
        placeholder={pending ? "Adding…" : placeholder}
        accessibilityLabel={placeholder}
        editable={!disabled && !pending}
        invalid={Boolean(error)}
        returnKeyType="done"
        className="border-transparent bg-card"
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="px-1 text-destructive text-xs leading-relaxed"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
