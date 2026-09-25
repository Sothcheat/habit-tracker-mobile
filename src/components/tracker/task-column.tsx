import { ChevronDown, CircleAlert, Search, SlidersHorizontal, X } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { FlatList, Pressable, type TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tabBarClearance } from "@/components/tab-bar-metrics";
import { Badge } from "@/components/ui/badge";
import { FilterTabs, type FilterOption } from "@/components/ui/filter-tabs";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import type { Task } from "@/lib/tasks/api";
import type { Result } from "@/lib/tasks/use-tracker";
import { AddTaskField } from "@/components/tracker/add-task-field";

type TaskColumnProps<V extends string> = {
  title: string;
  /** The badge number, and the word that explains it to a screen reader. */
  count: number;
  countLabel: string;
  filters: readonly FilterOption<V>[];
  filter: V;
  onFilterChange: (value: V) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  tasks: Task[];
  renderTask: (task: Task) => React.ReactElement;
  loading: boolean;
  /** Shown when the list is empty *because* a filter or search hid everything. */
  filteredOut: string | null;
  /** The standing explainer at the foot of the column. */
  empty: { icon: LucideIcon; title: string; body: string };
  addPlaceholder: string;
  onAdd: (title: string) => Promise<Result>;
  addRef?: React.RefObject<TextInput | null>;
  /** Something the user did that failed. Stays until dismissed. */
  error: string | null;
  onDismissError: () => void;
  /** How many tags are narrowing the list, and how to open the tag sheet. */
  tagCount: number;
  onOpenTags: () => void;
  /** A confirmation. Quiet, and clears itself. */
  notice: string | null;
};

/**
 * One task type's whole screen: heading and count, filter tabs, search, the
 * list, and the standing explainer pinned beneath it.
 *
 * The web laid these out as three columns in a grid. Here each is a tab, so
 * the column owns the full height and the list scrolls rather than the page.
 */
export function TaskColumn<V extends string>({
  title,
  count,
  countLabel,
  filters,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  searchPlaceholder,
  tasks,
  renderTask,
  loading,
  filteredOut,
  empty,
  addPlaceholder,
  onAdd,
  addRef,
  error,
  onDismissError,
  notice,
  tagCount,
  onOpenTags,
}: TaskColumnProps<V>) {
  // The tab bar floats above the list rather than sitting below it, so the
  // list has to leave room for it itself or the last card hides underneath.
  const insets = useSafeAreaInsets();
  const bottomPadding = tabBarClearance(insets.bottom);

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 px-4 pt-3 pb-2">
        <View className="flex-row items-center gap-2">
          <Text
            accessibilityRole="header"
            className="font-semibold text-foreground text-lg tracking-tight"
          >
            {title}
          </Text>
          {loading ? null : (
            <Badge
              variant="secondary"
              accessibilityLabel={`${count} ${countLabel}`}
            >
              {count}
            </Badge>
          )}
        </View>

        <View className="flex-row items-center gap-2 rounded-lg border border-input bg-card px-3">
          <Icon as={Search} size={16} className="text-muted-foreground" />
          <Input
            value={search}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            accessibilityLabel="Search your tasks"
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 border-0 bg-transparent px-0"
          />
          {search ? (
            <Pressable
              onPress={() => onSearchChange("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={12}
            >
              <Icon as={X} size={16} className="text-muted-foreground" />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row items-center justify-between gap-2">
          <FilterTabs options={filters} value={filter} onChange={onFilterChange} />
          <Pressable
            onPress={onOpenTags}
            accessibilityRole="button"
            accessibilityLabel={
              tagCount ? `Tags, ${tagCount} selected` : "Tags"
            }
            hitSlop={8}
            className="h-9 flex-row items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 active:bg-accent"
          >
            <Icon as={SlidersHorizontal} size={14} className="text-muted-foreground" />
            <Text className="text-foreground text-xs">Tags</Text>
            {tagCount ? <Badge variant="secondary">{tagCount}</Badge> : null}
            <Icon as={ChevronDown} size={14} className="text-muted-foreground" />
          </Pressable>
        </View>

        <AddTaskField
          placeholder={addPlaceholder}
          onAdd={onAdd}
          disabled={loading}
          inputRef={addRef}
        />

        {error ? (
          <View
            accessibilityLiveRegion="polite"
            className="flex-row items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2"
          >
            <Icon as={CircleAlert} size={16} className="mt-0.5 text-destructive" />
            <Text className="flex-1 text-destructive text-sm leading-relaxed">
              {error}
            </Text>
            <Pressable
              onPress={onDismissError}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              hitSlop={12}
            >
              <Icon as={X} size={16} className="text-destructive" />
            </Pressable>
          </View>
        ) : null}

        {/* A confirmation, not an alert: quiet, per the design system — red is
            for something the user did that failed. */}
        {notice ? (
          <View
            accessibilityLiveRegion="polite"
            className="rounded-lg border border-border bg-secondary px-3 py-2"
          >
            <Text className="text-secondary-foreground text-sm">{notice}</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View
          className="gap-2 px-4"
          style={{ paddingBottom: bottomPadding }}
          accessibilityElementsHidden
        >
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(task) => task.id}
          renderItem={({ item }) => renderTask(item)}
          contentContainerClassName="gap-2 px-4"
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            filteredOut ? (
              <Text className="px-1 py-6 text-center text-muted-foreground text-sm">
                {filteredOut}
              </Text>
            ) : null
          }
          // Always present, not just when the list is empty: it is a standing
          // explanation of what this column is for, not an empty state.
          ListFooterComponent={
            <View className="items-center gap-2 px-4 pt-10 pb-6">
              <Icon as={empty.icon} size={28} className="text-muted-foreground/70" />
              <Text className="font-medium text-muted-foreground text-sm">
                {empty.title}
              </Text>
              <Text className="max-w-xs text-center text-muted-foreground text-xs leading-relaxed">
                {empty.body}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
