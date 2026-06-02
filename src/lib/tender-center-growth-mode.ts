/**
 * Tender Center PRO — tryb rozwoju firmy (ETAP 2A).
 * Perspektywa decyzyjna właściciela; wpływa na wagi Kondycji Firmy.
 */

export type GrowthMode = "stabilize" | "balanced" | "growth" | "expansion";

export const GROWTH_MODE_STORAGE_KEY = "kw-tender-center-growth-mode";

export interface GrowthModeState {
  mode: GrowthMode;
  modeChangedAt: string;
}

export const GROWTH_MODE_LABELS: Record<GrowthMode, string> = {
  stabilize: "Stabilizacja",
  balanced: "Wyważony",
  growth: "Wzrost",
  expansion: "Ekspansja",
};

export interface HealthDimensionWeights {
  O: number;
  Z: number;
  F: number;
  R: number;
  D: number;
}

const WEIGHTS_BY_MODE: Record<GrowthMode, HealthDimensionWeights> = {
  stabilize: { O: 0.3, Z: 0.25, F: 0.25, R: 0.1, D: 0.1 },
  balanced: { O: 0.25, Z: 0.25, F: 0.2, R: 0.15, D: 0.15 },
  growth: { O: 0.2, Z: 0.2, F: 0.15, R: 0.25, D: 0.2 },
  expansion: { O: 0.15, Z: 0.15, F: 0.1, R: 0.3, D: 0.3 },
};

export function defaultGrowthModeState(): GrowthModeState {
  return { mode: "balanced", modeChangedAt: "" };
}

export function healthWeightsForMode(mode: GrowthMode): HealthDimensionWeights {
  return WEIGHTS_BY_MODE[mode] ?? WEIGHTS_BY_MODE.balanced;
}

export function loadGrowthMode(): GrowthModeState {
  try {
    const raw = localStorage.getItem(GROWTH_MODE_STORAGE_KEY);
    if (!raw) return defaultGrowthModeState();
    const p = JSON.parse(raw) as Partial<GrowthModeState>;
    const mode = p.mode;
    if (mode !== "stabilize" && mode !== "balanced" && mode !== "growth" && mode !== "expansion") {
      return defaultGrowthModeState();
    }
    return {
      mode,
      modeChangedAt: typeof p.modeChangedAt === "string" ? p.modeChangedAt : "",
    };
  } catch {
    return defaultGrowthModeState();
  }
}

export function saveGrowthMode(state: GrowthModeState): void {
  try {
    localStorage.setItem(GROWTH_MODE_STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function setGrowthMode(mode: GrowthMode): GrowthModeState {
  const next: GrowthModeState = { mode, modeChangedAt: new Date().toISOString() };
  saveGrowthMode(next);
  return next;
}

/** Minimalny próg Opportunity Score do radaru (informacyjny — UI w ETAP 2B+). */
export function minOpportunityScoreForMode(mode: GrowthMode): number {
  switch (mode) {
    case "stabilize": return 70;
    case "balanced": return 55;
    case "growth": return 45;
    case "expansion": return 40;
    default: return 55;
  }
}

export interface SuggestGrowthModeInput {
  healthIndex: number;
  overloadIndex: number;
  wmOverdueCount: number;
  wadiumHeadroomPln: number;
  winRate: number | null;
  freeSlots: number;
}

/** Auto-sugestia trybu (ETAP 1B) — właściciel może nadpisać ręcznie. */
export function suggestGrowthMode(input: SuggestGrowthModeInput): GrowthMode {
  const {
    healthIndex,
    overloadIndex,
    wmOverdueCount,
    wadiumHeadroomPln,
    winRate,
    freeSlots,
  } = input;

  if (healthIndex < 40 || overloadIndex >= 1 || wmOverdueCount >= 2) {
    return "stabilize";
  }
  if (healthIndex < 60 || wadiumHeadroomPln < 15_000) {
    return wadiumHeadroomPln < 15_000 && healthIndex >= 55 ? "balanced" : "stabilize";
  }
  if (healthIndex >= 85 && (winRate ?? 0) >= 40 && freeSlots >= 2) {
    return "expansion";
  }
  if (healthIndex >= 75 && overloadIndex < 0.75) {
    return "growth";
  }
  return "balanced";
}
