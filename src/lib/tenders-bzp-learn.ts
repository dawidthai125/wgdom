import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";
import { mergeCustomKeywordsForCloud } from "@/lib/tenders-sync";
import {
  TENDER_ACTION_KEYWORDS,
  TENDER_SCOPE_KEYWORDS,
  TENDER_EXCLUDE_KEYWORDS,
} from "@/lib/tenders-bzp-keywords";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { recalculateAllTenderScores } from "@/lib/tenders-bzp";
import {
  getPipelineSessionCacheOrNull,
  keywordsEpochFromCustom,
  patchPipelineSessionCache,
} from "@/lib/tenders-pipeline-session-cache";

export const TENDERS_CUSTOM_KEYWORDS_KEY = "kw-tenders-custom-keywords";

export interface TendersCustomKeywords {
  action: string[];
  scope: string[];
  exclude: string[];
  learnedFromCount: number;
  updatedAt: string;
}

export function defaultCustomKeywords(): TendersCustomKeywords {
  return { action: [], scope: [], exclude: [], learnedFromCount: 0, updatedAt: "" };
}

export function loadCustomKeywordsLocal(): TendersCustomKeywords {
  try {
    const raw = localStorage.getItem(TENDERS_CUSTOM_KEYWORDS_KEY);
    if (!raw) return defaultCustomKeywords();
    const p = JSON.parse(raw) as Partial<TendersCustomKeywords>;
    return {
      action: Array.isArray(p.action) ? p.action : [],
      scope: Array.isArray(p.scope) ? p.scope : [],
      exclude: Array.isArray(p.exclude) ? p.exclude : [],
      learnedFromCount: p.learnedFromCount ?? 0,
      updatedAt: p.updatedAt ?? "",
    };
  } catch {
    return defaultCustomKeywords();
  }
}

export async function loadCustomKeywords(): Promise<TendersCustomKeywords> {
  try {
    const local = loadCustomKeywordsLocal();
    const [cloud] = await fetchKeysFromCloud([TENDERS_CUSTOM_KEYWORDS_KEY]);
    if (cloud == null || typeof cloud !== "object") return local;
    const merged = mergeCustomKeywordsForCloud(local, cloud) as TendersCustomKeywords;
    localStorage.setItem(TENDERS_CUSTOM_KEYWORDS_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return loadCustomKeywordsLocal();
  }
}

export async function saveCustomKeywords(kw: TendersCustomKeywords): Promise<void> {
  localStorage.setItem(TENDERS_CUSTOM_KEYWORDS_KEY, JSON.stringify(kw));
  await persistKey(TENDERS_CUSTOM_KEYWORDS_KEY, kw);
  const entry = getPipelineSessionCacheOrNull();
  if (entry) {
    const rescored = recalculateAllTenderScores(entry.items, kw);
    patchPipelineSessionCache(rescored, {
      customKeywords: kw,
      partialMeta: { keywordsEpoch: keywordsEpochFromCustom(kw) },
    });
  }
}

const STOP = new Set([
  "oraz", "przez", "przy", "oraz", "zgodnie", "postępowania", "zamówienia", "zamowienia",
  "robot", "roboty", "budowlane", "wykonanie", "realizacja", "przetarg", "wrocław", "wroclaw",
]);

function fold(s: string): string {
  return s.toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

function alreadyCovered(token: string): boolean {
  const t = fold(token);
  const all = [...TENDER_ACTION_KEYWORDS, ...TENDER_SCOPE_KEYWORDS, ...TENDER_EXCLUDE_KEYWORDS];
  const custom = loadCustomKeywordsLocal();
  const merged = [...all, ...custom.action, ...custom.scope, ...custom.exclude];
  return merged.some((kw) => t.includes(fold(kw)) || fold(kw).includes(t));
}

/** Propozycje słów z tytułów przetargów oznaczonych jako interesujące. */
export function suggestKeywordsFromPipeline(items: TenderPipelineItem[]): string[] {
  const interested = items.filter((i) =>
    i.status === "interested" || i.status === "preparing" || i.status === "won",
  );
  const freq = new Map<string, number>();
  for (const item of interested) {
    const words = item.title.toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 5 && w.length <= 24 && !STOP.has(w));
    for (const w of words) {
      if (alreadyCovered(w)) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);
}

/** Dodaje propozycje do scope (nie action) i zapisuje w chmurze. */
export async function learnKeywordsFromPipeline(items: TenderPipelineItem[]): Promise<{
  added: string[];
  custom: TendersCustomKeywords;
}> {
  const suggestions = suggestKeywordsFromPipeline(items);
  const custom = await loadCustomKeywords();
  const added: string[] = [];
  for (const s of suggestions) {
    if (custom.scope.includes(s) || custom.action.includes(s)) continue;
    custom.scope.push(s);
    added.push(s);
  }
  if (added.length > 0) {
    custom.learnedFromCount = (custom.learnedFromCount || 0) + added.length;
    custom.updatedAt = new Date().toISOString();
    await saveCustomKeywords(custom);
  }
  return { added, custom };
}

export function getMergedActionKeywords(custom?: TendersCustomKeywords): readonly string[] {
  const c = custom ?? loadCustomKeywordsLocal();
  return [...TENDER_ACTION_KEYWORDS, ...c.action];
}

export function getMergedScopeKeywords(custom?: TendersCustomKeywords): readonly string[] {
  const c = custom ?? loadCustomKeywordsLocal();
  return [...TENDER_SCOPE_KEYWORDS, ...c.scope];
}

export function getMergedExcludeKeywords(custom?: TendersCustomKeywords): readonly string[] {
  const c = custom ?? loadCustomKeywordsLocal();
  return [...TENDER_EXCLUDE_KEYWORDS, ...c.exclude];
}
