import { RotateCw } from "lucide-react-native";
import { Component, Fragment, type ReactNode } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** Names the part that failed, e.g. "Habits" or "The account menu". */
  section: string;
  variant?: "block" | "inline";
  className?: string;
};

type State = { error: Error | null; attempt: number };

/**
 * Keeps one bad row from taking down the whole app: each column and the top
 * bar's menu get their own, so the rest of the screen survives.
 *
 * Two rules from the design system, both deliberate: the raw error is never
 * shown, and the fallback uses no destructive red — nothing the user did
 * failed, so this is not that kind of message.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    const { section } = this.props;
    // Deferred by a tick on purpose. console.error mounts LogBox, and doing
    // that synchronously re-enters the reconciler inside the very commit that
    // is already recovering from an error — which makes NativeWind's
    // render-phase dispatch (react-native-css-interop's native-interop.js
    // updates state during render) fire against fibers React does not yet
    // consider mounted. The report is just as useful one tick later.
    setTimeout(() => {
      console.error(`${section} failed`, error, info.componentStack);
    }, 0);
  }

  private retry = () => {
    // Bumping the key remounts the subtree rather than merely re-rendering it,
    // so a component that threw while building its state starts over.
    this.setState((prev) => ({ error: null, attempt: prev.attempt + 1 }));
  };

  render() {
    const { children, section, variant = "block", className } = this.props;

    if (!this.state.error) {
      return <Fragment key={this.state.attempt}>{children}</Fragment>;
    }

    if (variant === "inline") {
      return (
        <View
          accessibilityRole="alert"
          className={cn("flex-row items-center gap-2", className)}
        >
          <Text className="flex-1 text-muted-foreground text-sm">
            {section} isn&rsquo;t working.
          </Text>
          <Button variant="ghost" size="sm" onPress={this.retry}>
            <Icon as={RotateCw} size={14} className="text-foreground" />
            <Text className="font-medium text-foreground text-sm">Try again</Text>
          </Button>
        </View>
      );
    }

    return (
      <View
        accessibilityRole="alert"
        className={cn(
          "items-center justify-center gap-3 rounded-xl border border-border border-dashed p-6",
          className,
        )}
      >
        <Text className="text-center font-medium text-foreground text-sm">
          {section} couldn&rsquo;t be shown.
        </Text>
        <Text className="text-center text-muted-foreground text-sm leading-relaxed">
          Something went wrong in this section. The rest of the page is fine.
        </Text>
        <Button variant="outline" onPress={this.retry}>
          <Icon as={RotateCw} size={14} className="text-foreground" />
          <Text className="font-medium text-foreground text-sm">Try again</Text>
        </Button>
      </View>
    );
  }
}
