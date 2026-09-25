import { Tabs } from "expo-router";
import { CalendarDays, Diff, SquareCheckBig } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FloatingTabBar } from "@/components/floating-tab-bar";
import { TaskEditDialog } from "@/components/tracker/task-edit-dialog";
import { TopBar } from "@/components/top-bar";
import { Icon } from "@/components/ui/icon";
import { type Anchor, Popover, PopoverItem } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import type { TaskType } from "@/lib/tasks/api";
import { TrackerProvider, useTrackerContext } from "@/lib/tasks/tracker-context";

/**
 * Which tab the app opens on. Without this the router falls back to whichever
 * route sorts first alphabetically, which would be Dailies.
 */
export const unstable_settings = { initialRouteName: "habits" };

/**
 * The signed-in app: one tracker, one top bar, three tabs.
 *
 * The web laid the three task types out as columns in a grid. A phone has room
 * for one at a time, so each becomes a tab — which also gives each column the
 * full height the web only had at `lg`.
 */
export default function AppLayout() {
  const { user } = useAuth();

  // The root guard only renders this group with a session, so this is belt and
  // braces — but useTracker needs a real user id, and rendering without one
  // would read the wrong account's snapshot key.
  if (!user) return null;

  return (
    // Keyed so switching accounts builds a fresh hook, which re-seeds state
    // from that user's snapshot rather than showing the previous one's.
    <TrackerProvider key={user.id} userId={user.id}>
      <View className="flex-1 bg-background">
        <SafeAreaView edges={["top"]}>
          <TopBar />
        </SafeAreaView>
        <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
          <Tabs.Screen
            name="habits"
            options={{
              title: "Habits",
              tabBarIcon: ({ color, size }) => <Icon as={Diff} size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="dailies"
            options={{
              title: "Dailies",
              tabBarIcon: ({ color, size }) => (
                <Icon as={CalendarDays} size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="todos"
            options={{
              title: "To-dos",
              tabBarIcon: ({ color, size }) => (
                <Icon as={SquareCheckBig} size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </View>
    </TrackerProvider>
  );
}

const TYPES: { type: TaskType; label: string; icon: typeof Diff }[] = [
  { type: "habit", label: "Habit", icon: Diff },
  { type: "daily", label: "Daily", icon: CalendarDays },
  { type: "todo", label: "To-do", icon: SquareCheckBig },
];

/**
 * The add button's flow, which lives beside the tab bar rather than in any one
 * tab: pick a type, then fill the task in.
 *
 * A task's type cannot be changed once it exists — the database's check
 * constraints are written per type — so it is asked first, before anything
 * else has been typed.
 */
function TabBar(props: React.ComponentProps<typeof FloatingTabBar>) {
  const tracker = useTrackerContext();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [creating, setCreating] = useState<TaskType | null>(null);

  return (
    <>
      <FloatingTabBar {...props} onAddPress={setAnchor} />

      <Popover anchor={anchor} onClose={() => setAnchor(null)}>
        {TYPES.map(({ type, label, icon }) => (
          <PopoverItem
            key={type}
            label={label}
            icon={<Icon as={icon} size={16} className="text-popover-foreground" />}
            // PopoverItem plays the panel out before running this, so the
            // picker is never left standing over the editor.
            onPress={() => setCreating(type)}
          />
        ))}
      </Popover>

      <TaskEditDialog
        type={creating}
        tracker={tracker}
        onClose={() => setCreating(null)}
      />
    </>
  );
}
