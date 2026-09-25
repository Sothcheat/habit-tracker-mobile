import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The primary action on an auth form: full width at auth scale. */
export function AuthSubmit({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return <Button size="touch" className={cn("w-full", className)} {...props} />;
}
