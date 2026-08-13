/**
 * OWNER-INPUT-01 — deterministic Owner question prompts (ZERO LLM).
 * Does not invent facts missing from input.
 */

import type {
  OwnerRateDomain,
  OwnerRateEquipmentPayload,
  OwnerRateTransportPayload,
} from "./types";

const GENERIC_PROMPT_RE =
  /^\s*(podaj\s+cen[eę]\s+(transportu|sprz[eę]tu)|cena\s+(transportu|sprz[eę]tu))\s*\.?\s*$/i;

function formatQtyUnit(quantity: number | undefined, unit: string | undefined): string | null {
  if (quantity == null || !Number.isFinite(quantity)) return null;
  const u = unit?.trim();
  if (u) return `${quantity} ${u}`;
  return String(quantity);
}

/**
 * Reject empty / generic prompts that ask for a price without tender context.
 */
export function isInvalidOwnerRatePrompt(promptPl: string | null | undefined): boolean {
  const t = promptPl?.trim() ?? "";
  if (!t) return true;
  if (t.length < 24) return true;
  if (GENERIC_PROMPT_RE.test(t)) return true;
  if (!/tego przetargu/i.test(t) && !/dla tego przetargu/i.test(t)) {
    // Require explicit tender scoping phrase in Owner-facing prompt.
    return true;
  }
  return false;
}

export function buildEquipmentPromptPl(
  equipment: OwnerRateEquipmentPayload,
): string {
  const name = equipment.namePl.trim();
  const qty = formatQtyUnit(equipment.quantity, equipment.unit);
  const qtyPart = qty ? `, około ${qty}` : "";
  const u = equipment.unit?.trim();
  const rateUnitPart =
    u === "h" || u === "godz" || u === "godzina"
      ? " za godzinę"
      : u
        ? ` za ${u}`
        : "";
  return (
    `W wycenie pozycji sprzętowej: ${name}${qtyPart}. ` +
    `Brak wiarygodnej stawki automatycznej. ` +
    `Jaką aktualną stawkę netto${rateUnitPart} mamy przyjąć dla tego przetargu?`
  );
}

export function buildTransportPromptPl(
  transport: OwnerRateTransportPayload,
): string {
  const name = transport.namePl.trim();
  const qty = formatQtyUnit(transport.quantity, transport.unit);
  const qtyPart = qty ? ` około ${qty}` : "";
  const unitHint = transport.unit?.trim()
    ? ` za ${transport.unit.trim()}`
    : "";
  return (
    `Dokumentacja wskazuje ${name}${qtyPart}. ` +
    `Brak wiarygodnej stawki automatycznej. ` +
    `Jaką aktualną stawkę netto${unitHint} mamy przyjąć dla tego przetargu?`
  );
}

export function buildPromptPl(
  domain: OwnerRateDomain,
  payload: OwnerRateEquipmentPayload | OwnerRateTransportPayload,
): string {
  if (domain === "equipment") {
    return buildEquipmentPromptPl(payload as OwnerRateEquipmentPayload);
  }
  return buildTransportPromptPl(payload as OwnerRateTransportPayload);
}
