import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { CalendarDays } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { formatDate, type ISODate } from "@/lib/tasks/dates";
import { cn } from "@/lib/utils";

/**
 * An ISO date is a calendar day, not an instant, so it is converted through
 * *local* components. `new Date("2026-09-24")` parses as UTC midnight, which
 * west of Greenwich is already the day before — the picker would open on the
 * wrong date and hand back another wrong one.
 */
function toDate(iso: ISODate): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISO(date: Date): ISODate {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * A date, chosen with the system picker.
 *
 * Date entry is the one place the design system gives way to the platform: a
 * calendar is a thing people already know how to use, and reimplementing one
 * in the app's own palette would be worse, not more consistent.
 */
export function DateField({
  value,
  onChange,
  placeholder = "Choose a date",
  onClear,
  invalid,
  accessibilityLabel,
  disabled,
}: {
  /** Empty string means no date set. */
  value: ISODate | "";
  onChange: (value: ISODate) => void;
  placeholder?: string;
  /** Offered only when the date is optional, and only once one is set. */
  onClear?: () => void;
  invalid?: boolean;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const current = value ? toDate(value) : new Date();

  function open() {
    if (Platform.OS === "android") {
      // Android's picker is a dialog the system owns and dismisses itself.
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        // onValueChange, not the deprecated onChange: it fires only on a
        // selection, so there is no event.type to sift and no undefined date.
        onValueChange: (_event, date) => onChange(toISO(date)),
      });
    } else {
      setIosOpen(true);
    }
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={open}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={
            value ? `${accessibilityLabel}: ${formatDate(value)}` : accessibilityLabel
          }
          className={cn(
            "h-11 flex-1 flex-row items-center gap-2 rounded-lg border border-input bg-card px-3 active:bg-accent",
            invalid && "border-destructive",
            disabled && "opacity-50",
          )}
        >
          <Icon as={CalendarDays} size={16} className="text-muted-foreground" />
          <Text className={cn("text-base", value ? "text-foreground" : "text-muted-foreground")}>
            {value ? formatDate(value) : placeholder}
          </Text>
        </Pressable>

        {onClear && value ? (
          <Button variant="ghost" onPress={onClear} disabled={disabled}>
            Clear
          </Button>
        ) : null}
      </View>

      {/* iOS has no imperative picker; it renders inline and stays until dismissed. */}
      {iosOpen ? (
        <View className="items-center rounded-lg border border-border bg-card">
          <DateTimePicker
            value={current}
            mode="date"
            display="inline"
            onValueChange={(_event, date) => onChange(toISO(date))}
          />
          <Button variant="ghost" size="touch" onPress={() => setIosOpen(false)}>
            Done
          </Button>
        </View>
      ) : null}
    </View>
  );
}
