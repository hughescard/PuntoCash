import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The PuntoCash type scale lives in the Tailwind `--text-*` namespace, so its
 * utilities are `text-body`, `text-label`, `text-amount`… — the same `text-`
 * prefix Tailwind uses for colour.
 *
 * tailwind-merge cannot tell the two apart for custom names: left unconfigured
 * it classifies them all as `text-color`, so `cn("text-label", "text-white")`
 * silently drops the font size, and `cn("text-white", "text-body")` silently
 * drops the colour. The second case produced dark text on a navy button.
 *
 * Registering the scale under `font-size` keeps size and colour independent.
 * Any token added to `--text-*` in `src/styles/tokens.css` must be added here.
 */
const FONT_SIZES = [
  "screen-title",
  "section-title",
  "card-title",
  "body",
  "body-sm",
  "label",
  "caption",
  "amount",
  "amount-lg",
  "overline",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...FONT_SIZES] }],
    },
  },
});

/** Merge conditional class names, resolving conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
