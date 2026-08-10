/**
 * TECHNOLOGY-RECIPE-CONSUMPTION-01B — deterministic paint coats from BOQ text.
 * Result: 1 | 2 | null (null → UNBOUND, no guessing).
 */

import type { OfferBoqLineLike } from "./offer-boq-adapter";

export type PaintCoats = 1 | 2;

function foldPl(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z")
    .replace(/\s+/g, " ")
    .trim();
}

function lineText(line: OfferBoqLineLike): string {
  return foldPl(
    `${line.normalizedDescription || ""} ${line.description || ""} ${line.catalogWorkId || ""}`,
  );
}

/**
 * Resolve paint coats from BOQ wording only.
 * 2: dwukrotne / 2-krotne / 2x / 2 x
 * 1: jednokrotne / 1-krotne / 1x / 1 x
 * else: null (UNBOUND)
 */
export function resolvePaintCoats(line: OfferBoqLineLike): PaintCoats | null {
  const text = lineText(line);
  if (!text) return null;

  const has2 =
    /\bdwukrotn/.test(text) ||
    /\b2[\s-]*krotn/.test(text) ||
    /\b2\s*[x×]\b/.test(text) ||
    /\b2x\b/.test(text);
  const has1 =
    /\bjednokrotn/.test(text) ||
    /\b1[\s-]*krotn/.test(text) ||
    /\b1\s*[x×]\b/.test(text) ||
    /\b1x\b/.test(text);

  if (has2 && has1) return null;
  if (has2) return 2;
  if (has1) return 1;
  return null;
}
