/**
 * Geometry for the floating tab bar, shared by the bar itself and the lists
 * that must scroll clear of it.
 *
 * The bar is `position: absolute`, so it takes no layout space and content
 * runs underneath. Every scrolling column therefore pads its own bottom by
 * exactly this much — hence one module rather than two guesses.
 */

/** The pill, and the add button beside it. */
export const TAB_BAR_HEIGHT = 56;

/** Gap between the bar and the safe area at the bottom of the screen. */
export const TAB_BAR_GAP = 12;

/** Gap between the pill and the add button. */
export const TAB_BAR_SPACING = 12;

/**
 * Inset from the screen edges. 16 to match the `px-4` gutter every column
 * uses, so the bar lines up with the cards above it rather than floating to
 * its own margin.
 */
export const TAB_BAR_MARGIN = 16;

/** How much room a scrolling list needs below its last item. */
export function tabBarClearance(bottomInset: number): number {
  return TAB_BAR_HEIGHT + TAB_BAR_GAP * 2 + bottomInset;
}
