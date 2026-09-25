import { cn } from "@/lib/utils";

describe("cn", () => {
  it("treats the Montserrat faces as one font-family group", () => {
    expect(cn("font-sans", "font-medium")).toBe("font-medium");
    expect(cn("font-semibold", "font-sans")).toBe("font-sans");
  });

  it("still resolves ordinary conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("bg-muted", "bg-card")).toBe("bg-card");
  });

  it("keeps unrelated utilities", () => {
    expect(cn("font-medium", "text-sm")).toBe("font-medium text-sm");
  });

  it("keeps a task-state tint alongside layout classes", () => {
    // The card strips carry their tone through cn(). If tailwind-merge ever
    // decided these conflicted, the tint would vanish with no error.
    expect(cn("w-12 items-center pt-2", "bg-caution/30")).toContain("bg-caution/30");
    expect(cn("w-12 items-center pt-2", "bg-positive/25")).toContain("bg-positive/25");
    expect(cn("w-12 items-center pt-2", "bg-muted")).toContain("bg-muted");
  });

  it("lets the checked state win over a caller's resting background", () => {
    // The order the Checkbox composes in: base, caller, then state. A caller
    // passing bg-card must not cancel the checked fill.
    const result = cn(
      "border border-input",
      "bg-card border-muted-foreground",
      "border-primary bg-primary",
    );
    expect(result).toContain("bg-primary");
    expect(result).toContain("border-primary");
    expect(result).not.toContain("bg-card");
    expect(result).not.toContain("border-muted-foreground");
  });
});
