/**
 * Presentation-only pacing · NEVER delays engine.
 * NORMAL profile · clamp total ≤ 4s (Owner GO).
 */

export type ConversationPaceProfile = "min" | "normal" | "max";

const STEP_MS: Record<ConversationPaceProfile, { base: number; perChar: number; cap: number }> = {
  min: { base: 120, perChar: 1.2, cap: 250 },
  normal: { base: 350, perChar: 2.2, cap: 600 },
  max: { base: 700, perChar: 3.5, cap: 1000 },
};

const TOTAL_CAP_MS: Record<ConversationPaceProfile, number> = {
  min: 2500,
  normal: 4000,
  max: 6000,
};

/** Delay for one step given message weight (char count). */
export function conversationStepDelayMs(
  messageWeight: number,
  profile: ConversationPaceProfile = "normal",
): number {
  const cfg = STEP_MS[profile];
  const w = Math.max(0, Math.floor(messageWeight));
  return Math.min(cfg.cap, Math.max(cfg.base, cfg.base + w * cfg.perChar));
}

/** Scale delays so sum ≤ profile total cap. */
export function scaleConversationDelays(
  delays: readonly number[],
  profile: ConversationPaceProfile = "normal",
): number[] {
  if (delays.length === 0) return [];
  const cap = TOTAL_CAP_MS[profile];
  const sum = delays.reduce((a, b) => a + b, 0);
  if (sum <= cap || sum <= 0) return [...delays];
  const scale = cap / sum;
  return delays.map((d) => Math.max(80, Math.round(d * scale)));
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
