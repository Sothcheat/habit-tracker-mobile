import type { TextProps } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: TextProps) {
  return <Text className={cn("font-medium text-sm", className)} {...props} />;
}
