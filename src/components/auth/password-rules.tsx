import { Check, Circle } from "lucide-react-native";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { PASSWORD_RULES } from "@/lib/validation";
import { cn } from "@/lib/utils";

/**
 * Live checklist of sign-up password requirements. Shown from the start so
 * nobody has to fail a submit to learn the rules.
 *
 * Met rules go to full foreground rather than green: the palette has no success
 * colour, and contrast alone reads clearly. Unmet rules only turn destructive
 * once the user has tried to submit — red before then would scold someone who
 * has barely started typing.
 */
export function PasswordRules({
  value,
  showErrors,
}: {
  value: string;
  showErrors: boolean;
}) {
  return (
    <View className="flex-row flex-wrap gap-x-4 gap-y-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        const tone = met
          ? "text-foreground"
          : showErrors
            ? "text-destructive"
            : "text-muted-foreground";
        return (
          <View
            key={rule.id}
            className="min-w-[45%] flex-row items-center gap-1.5"
            accessibilityLabel={`${rule.label} (${met ? "met" : "not met"})`}
          >
            <Icon as={met ? Check : Circle} size={met ? 14 : 12} className={tone} />
            <Text className={cn("text-xs", tone)}>{rule.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
