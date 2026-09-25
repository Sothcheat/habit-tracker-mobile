import { readFileSync } from "node:fs";
import { join } from "node:path";
import { THEME_COLORS } from "@/lib/theme-colors";

/**
 * THEME_COLORS mirrors a handful of tokens for the two places that cannot read
 * a className. A mirror that drifts is worse than no mirror, so this reads the
 * real stylesheet and compares.
 */
const css = readFileSync(join(__dirname, "../../global.css"), "utf8");

function tokensFor(selector: string): Record<string, string> {
  const block = css.slice(css.indexOf(selector));
  const body = block.slice(block.indexOf("{") + 1, block.indexOf("}"));
  const tokens: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([\d\s]+);/g)) {
    const [r, g, b] = value.trim().split(/\s+/);
    tokens[name] = `rgb(${r}, ${g}, ${b})`;
  }
  return tokens;
}

describe("THEME_COLORS", () => {
  it.each([
    ["light", ":root"],
    ["dark", ".dark:root"],
  ] as const)("matches the %s tokens in global.css", (theme, selector) => {
    const actual = tokensFor(selector);
    // Guard the parser itself: an empty block would make every check vacuous.
    expect(Object.keys(actual).length).toBeGreaterThan(10);

    for (const [name, value] of Object.entries(THEME_COLORS[theme])) {
      expect(`${theme} --${name}: ${value}`).toBe(`${theme} --${name}: ${actual[name]}`);
    }
  });
});
