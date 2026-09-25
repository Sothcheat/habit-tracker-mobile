import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { Tag } from "@/lib/tasks/api";

/**
 * Picks from the tags that already exist; it does not make new ones.
 *
 * The web said so in its empty state and the same holds here: creating a tag
 * is a separate, deliberate act in the Tags sheet, so a half-typed name cannot
 * become a tag by accident while someone is filling in a task.
 */
export function TagSelect({
  tags,
  selected,
  onChange,
  disabled,
}: {
  tags: Tag[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const chosen = tags.filter((tag) => selected.includes(tag.id));

  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id],
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={
          chosen.length
            ? `Tags: ${chosen.map((tag) => tag.name).join(", ")}`
            : "Add tags"
        }
        className="min-h-11 flex-row items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 active:bg-accent"
      >
        <View className="flex-1 flex-row flex-wrap items-center gap-1.5">
          {chosen.length === 0 ? (
            <Text className="text-base text-muted-foreground">Add tags…</Text>
          ) : (
            chosen.map((tag) => (
              <View key={tag.id} className="rounded-full bg-secondary px-2 py-0.5">
                <Text className="text-secondary-foreground text-xs">{tag.name}</Text>
              </View>
            ))
          )}
        </View>
        <Icon as={ChevronDown} size={16} className="text-muted-foreground" />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        footer={({ requestClose }) => (
          <View className="flex-row justify-end border-border border-t px-3 py-2">
            <Button onPress={requestClose}>Done</Button>
          </View>
        )}
      >
        {() => (
          <View>
            <View className="px-5 pt-5 pb-3">
              <Text
                accessibilityRole="header"
                className="font-semibold text-foreground text-base"
              >
                Tags
              </Text>
            </View>
            <View className="gap-1 px-5 pb-4">
              {tags.length === 0 ? (
                <Text className="py-4 text-muted-foreground text-sm leading-relaxed">
                  No tags yet — make them from Tags above the list.
                </Text>
              ) : (
                tags.map((tag) => (
                  <Pressable
                    key={tag.id}
                    onPress={() => toggle(tag.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected.includes(tag.id) }}
                    accessibilityLabel={tag.name}
                    className="h-11 flex-row items-center gap-3 rounded-lg px-1 active:bg-accent"
                  >
                    <Checkbox
                      checked={selected.includes(tag.id)}
                      onCheckedChange={() => toggle(tag.id)}
                      accessibilityLabel={tag.name}
                      iconSize={16}
                      className="size-5 border-muted-foreground"
                    />
                    <Text className="flex-1 text-foreground text-sm">{tag.name}</Text>
                  </Pressable>
                ))
              )}
            </View>
          </View>
        )}
      </BottomSheet>
    </>
  );
}
