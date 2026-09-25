import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge assumes Tailwind's stock scales, where `font-medium` is a
 * font-weight. In this project there are no weight utilities at all — Android
 * ignores fontWeight on a custom family, so `font-sans`, `font-medium` and
 * `font-semibold` each select a different Montserrat *face*.
 *
 * Without this, cn("font-sans", "font-medium") would keep both, because they
 * look like different groups, and the element would carry two fontFamily
 * declarations.
 */
const twMerge = extendTailwindMerge({
  override: {
    classGroups: {
      "font-family": [{ font: ["sans", "medium", "semibold"] }],
      "font-weight": [],
    },
  },
});

/** Compose class strings, letting later Tailwind utilities win over earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
