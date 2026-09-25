import {
  ArrowDown,
  ArrowUp,
  EllipsisVertical,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, type View } from "react-native";
import { Icon } from "@/components/ui/icon";
import {
  type Anchor,
  Popover,
  PopoverItem,
  PopoverSeparator,
} from "@/components/ui/popover";

export type TaskMenuActions = {
  onEdit: () => void;
  onShare: () => void;
  onMoveTop: () => void;
  onMoveBottom: () => void;
  onDelete: () => void;
  /** Already first / last in its column: that move would do nothing. */
  isFirst: boolean;
  isLast: boolean;
};

/**
 * The ⋮ "Options" button on a card, opening a menu anchored to itself.
 *
 * The web hid this until the card was hovered, then revealed it — and already
 * forced it visible on touch, where there is no hover. So it is simply always
 * visible here, which is what that rule resolved to anyway.
 *
 * First/last are judged against the whole column, not the filtered view: "To
 * top" means the top of the list, not the top of what a filter is showing.
 */
export function TaskMenu({
  title,
  disabled,
  onEdit,
  onShare,
  onMoveTop,
  onMoveBottom,
  onDelete,
  isFirst,
  isLast,
}: TaskMenuActions & { title: string; disabled: boolean }) {
  const trigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  // Measured at open rather than on layout: the card can scroll between the
  // two, and a menu pinned to where the button *used to be* is worse than none.
  const open = () => {
    trigger.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  };

  /** Closes first, so the menu is never left standing over a dialog. */
  const run = (action: () => void) => () => {
    setAnchor(null);
    action();
  };

  return (
    <>
      <Pressable
        ref={trigger}
        onPress={open}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Options for "${title}"`}
        accessibilityState={{ disabled, expanded: anchor !== null }}
        hitSlop={10}
        className="size-7 items-center justify-center rounded-md active:bg-accent"
      >
        <Icon as={EllipsisVertical} size={16} className="text-muted-foreground" />
      </Pressable>

      <Popover anchor={anchor} onClose={() => setAnchor(null)}>
        <PopoverItem
          label="Edit"
          icon={<Icon as={Pencil} size={16} className="text-popover-foreground" />}
          onPress={run(onEdit)}
        />
        <PopoverItem
          label="Share"
          icon={<Icon as={Share2} size={16} className="text-popover-foreground" />}
          onPress={run(onShare)}
        />
        <PopoverItem
          label="To top"
          icon={<Icon as={ArrowUp} size={16} className="text-popover-foreground" />}
          onPress={run(onMoveTop)}
          disabled={isFirst}
        />
        <PopoverItem
          label="To bottom"
          icon={<Icon as={ArrowDown} size={16} className="text-popover-foreground" />}
          onPress={run(onMoveBottom)}
          disabled={isLast}
        />
        <PopoverSeparator />
        <PopoverItem
          label="Delete"
          icon={<Icon as={Trash2} size={16} className="text-destructive" />}
          onPress={run(onDelete)}
          destructive
        />
      </Popover>
    </>
  );
}
