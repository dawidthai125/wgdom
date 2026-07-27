/**
 * AI-COST-01 / COST-S5.1 — firmowa baza wiedzy kosztorysowej (pure + localStorage).
 * Przyrostowe uczenie z decyzji użytkownika · dodatkowy provider cen.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import type {
  OfferBoqCompanyKnowledgeHint,
  OfferBoqDocument,
  OfferBoqPriceOriginKind,
  OfferBoqPricedComponent,
  OfferBoqPricedComponentCategory,
} from "@/lib/tender-offer-boq";
import type {
  OfferBoqPriceLookupRequest,
  OfferBoqPriceLookupResult,
  OfferBoqPriceSourceProvider,
} from "@/lib/tender-offer-boq-pricing-engine";

export const OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY = "kw-offer-boq-company-knowledge";
export const OFFER_BOQ_COMPANY_KNOWLEDGE_SCHEMA_VERSION = 1;
const OBSERVATIONS_CAP = 40;
const ENTRIES_CAP = 500;

export type CompanyKnowledgeDecision = "approved" | "changed";

export interface CompanyKnowledgeObservation {
  id: string;
  observedAt: string;
  tenderId?: string;
  lineId?: string;
  componentId: string;
  namePl: string;
  category: OfferBoqPricedComponentCategory;
  unit: string;
  unitPricePln: number | null;
  quantity: number;
  sourceKind: OfferBoqPriceOriginKind;
  sourceLabelPl: string;
  decision: CompanyKnowledgeDecision;
  /** Czy przed decyzją komponent był propozycją AI. */
  fromAi: boolean;
  fieldsChanged: string[];
}

export interface CompanyKnowledgeEntry {
  entryId: string;
  namePl: string;
  nameKey: string;
  category: OfferBoqPricedComponentCategory;
  unit: string;
  occurrenceCount: number;
  approvedCount: number;
  changedCount: number;
  lastUnitPricePln: number | null;
  avgUnitPricePln: number | null;
  lastUsedAt: string;
  lastSourceKind: OfferBoqPriceOriginKind;
  lastSourceLabelPl: string;
  primarilyFromUser: boolean;
  observations: CompanyKnowledgeObservation[];
}

export interface CompanyKnowledgeStore {
  schemaVersion: number;
  updatedAt: string;
  entries: CompanyKnowledgeEntry[];
}

export interface CompanyKnowledgeStats {
  entryCount: number;
  observationCount: number;
  approvedObservationCount: number;
  changedObservationCount: number;
  userConfirmedEntryCount: number;
  topMaterials: Array<{ namePl: string; occurrenceCount: number; category: string }>;
  /** approved / (approved+changed) wśród obserwacji z decyzją — 0–100. */
  aiUserAgreementPct: number | null;
}

function emptyStore(updatedAt = new Date().toISOString()): CompanyKnowledgeStore {
  return {
    schemaVersion: OFFER_BOQ_COMPANY_KNOWLEDGE_SCHEMA_VERSION,
    updatedAt,
    entries: [],
  };
}

export function buildCompanyKnowledgeNameKey(namePl: string): string {
  return foldPolishText(namePl || "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCompanyKnowledgeEntryId(
  namePl: string,
  category: OfferBoqPricedComponentCategory,
  unit: string,
): string {
  const key = `${buildCompanyKnowledgeNameKey(namePl)}|${category}|${foldPolishText(unit || "")}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `ck_${(h >>> 0).toString(16)}`;
}

export function normalizeCompanyKnowledgeStore(raw: unknown): CompanyKnowledgeStore {
  if (!raw || typeof raw !== "object") return emptyStore();
  const s = raw as Partial<CompanyKnowledgeStore>;
  if (s.schemaVersion !== OFFER_BOQ_COMPANY_KNOWLEDGE_SCHEMA_VERSION || !Array.isArray(s.entries)) {
    return emptyStore(typeof s.updatedAt === "string" ? s.updatedAt : undefined);
  }
  const entries: CompanyKnowledgeEntry[] = [];
  for (const e of s.entries) {
    if (!e || typeof e !== "object") continue;
    if (typeof e.entryId !== "string" || !e.entryId) continue;
    if (typeof e.namePl !== "string") continue;
    entries.push({
      entryId: e.entryId,
      namePl: e.namePl,
      nameKey: typeof e.nameKey === "string" ? e.nameKey : buildCompanyKnowledgeNameKey(e.namePl),
      category: e.category,
      unit: typeof e.unit === "string" ? e.unit : "",
      occurrenceCount: Number(e.occurrenceCount) || 0,
      approvedCount: Number(e.approvedCount) || 0,
      changedCount: Number(e.changedCount) || 0,
      lastUnitPricePln:
        e.lastUnitPricePln == null || !Number.isFinite(Number(e.lastUnitPricePln))
          ? null
          : Number(e.lastUnitPricePln),
      avgUnitPricePln:
        e.avgUnitPricePln == null || !Number.isFinite(Number(e.avgUnitPricePln))
          ? null
          : Number(e.avgUnitPricePln),
      lastUsedAt: typeof e.lastUsedAt === "string" ? e.lastUsedAt : "",
      lastSourceKind: e.lastSourceKind ?? "unknown",
      lastSourceLabelPl: typeof e.lastSourceLabelPl === "string" ? e.lastSourceLabelPl : "",
      primarilyFromUser: Boolean(e.primarilyFromUser),
      observations: Array.isArray(e.observations) ? e.observations.slice(-OBSERVATIONS_CAP) : [],
    });
  }
  return {
    schemaVersion: OFFER_BOQ_COMPANY_KNOWLEDGE_SCHEMA_VERSION,
    updatedAt: typeof s.updatedAt === "string" ? s.updatedAt : new Date().toISOString(),
    entries: entries.slice(0, ENTRIES_CAP),
  };
}

export function loadCompanyKnowledgeStoreLocal(): CompanyKnowledgeStore {
  try {
    if (typeof localStorage === "undefined") return emptyStore();
    const raw = localStorage.getItem(OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY);
    if (!raw) return emptyStore();
    return normalizeCompanyKnowledgeStore(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

export function saveCompanyKnowledgeStoreLocal(store: CompanyKnowledgeStore): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY,
      JSON.stringify(normalizeCompanyKnowledgeStore(store)),
    );
  } catch {
    /* ignore quota */
  }
}

export function findCompanyKnowledgeEntry(
  store: CompanyKnowledgeStore,
  opts: {
    namePl: string;
    category: OfferBoqPricedComponentCategory;
    unit: string;
  },
): CompanyKnowledgeEntry | null {
  const entryId = buildCompanyKnowledgeEntryId(opts.namePl, opts.category, opts.unit);
  const exact = store.entries.find((e) => e.entryId === entryId);
  if (exact) return exact;

  const nameKey = buildCompanyKnowledgeNameKey(opts.namePl);
  if (!nameKey) return null;
  // STAB-01 — nie uogólniaj po nazwach generycznych („Materiał”, „Robocizna”)
  const GENERIC_NAME_KEYS = new Set([
    "material",
    "robocizna",
    "zakup",
    "transport",
    "materialy pomocnicze",
    "montaz",
    "uruchomienie",
    "odbior",
    "sprzet pomiarowy",
  ]);
  if (GENERIC_NAME_KEYS.has(nameKey)) return null;

  const unitKey = foldPolishText(opts.unit || "");
  const candidates = store.entries.filter(
    (e) =>
      e.category === opts.category &&
      foldPolishText(e.unit || "") === unitKey &&
      e.nameKey === nameKey,
  );
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
  return candidates[0] ?? null;
}

function foldAvg(prevAvg: number | null, prevCount: number, nextPrice: number | null): number | null {
  if (nextPrice == null || !Number.isFinite(nextPrice)) return prevAvg;
  if (prevAvg == null || prevCount <= 0) return Math.round(nextPrice * 100) / 100;
  const avg = (prevAvg * prevCount + nextPrice) / (prevCount + 1);
  return Math.round(avg * 100) / 100;
}

export function recordCompanyKnowledgeDecision(
  store: CompanyKnowledgeStore,
  opts: {
    component: OfferBoqPricedComponent;
    decision: CompanyKnowledgeDecision;
    fromAi: boolean;
    fieldsChanged?: string[];
    tenderId?: string;
    lineId?: string;
    observedAt?: string;
  },
): CompanyKnowledgeStore {
  const observedAt = opts.observedAt ?? new Date().toISOString();
  const c = opts.component;
  const entryId = buildCompanyKnowledgeEntryId(c.namePl, c.category, c.unit);
  const nameKey = buildCompanyKnowledgeNameKey(c.namePl);
  const observation: CompanyKnowledgeObservation = {
    id: `obs_${entryId}_${observedAt}_${Math.random().toString(16).slice(2, 8)}`,
    observedAt,
    tenderId: opts.tenderId,
    lineId: opts.lineId,
    componentId: c.componentId,
    namePl: c.namePl,
    category: c.category,
    unit: c.unit,
    unitPricePln: c.unitPricePln,
    quantity: c.quantity,
    sourceKind: c.priceOrigin.kind,
    sourceLabelPl: c.priceOrigin.labelPl,
    decision: opts.decision,
    fromAi: opts.fromAi,
    fieldsChanged: opts.fieldsChanged ?? [],
  };

  const entries = [...store.entries];
  const idx = entries.findIndex((e) => e.entryId === entryId);
  if (idx < 0) {
    entries.unshift({
      entryId,
      namePl: c.namePl,
      nameKey,
      category: c.category,
      unit: c.unit,
      occurrenceCount: 1,
      approvedCount: opts.decision === "approved" ? 1 : 0,
      changedCount: opts.decision === "changed" ? 1 : 0,
      lastUnitPricePln: c.unitPricePln,
      avgUnitPricePln: c.unitPricePln,
      lastUsedAt: observedAt,
      lastSourceKind: c.priceOrigin.kind,
      lastSourceLabelPl: c.priceOrigin.labelPl,
      primarilyFromUser: !opts.fromAi || opts.decision === "changed",
      observations: [observation],
    });
  } else {
    const prev = entries[idx]!;
    const occurrenceCount = prev.occurrenceCount + 1;
    entries[idx] = {
      ...prev,
      namePl: c.namePl,
      occurrenceCount,
      approvedCount: prev.approvedCount + (opts.decision === "approved" ? 1 : 0),
      changedCount: prev.changedCount + (opts.decision === "changed" ? 1 : 0),
      lastUnitPricePln: c.unitPricePln ?? prev.lastUnitPricePln,
      avgUnitPricePln: foldAvg(prev.avgUnitPricePln, prev.occurrenceCount, c.unitPricePln),
      lastUsedAt: observedAt,
      lastSourceKind: c.priceOrigin.kind,
      lastSourceLabelPl: c.priceOrigin.labelPl,
      primarilyFromUser:
        prev.primarilyFromUser || !opts.fromAi || opts.decision === "changed",
      observations: [...prev.observations, observation].slice(-OBSERVATIONS_CAP),
    };
  }

  return normalizeCompanyKnowledgeStore({
    schemaVersion: OFFER_BOQ_COMPANY_KNOWLEDGE_SCHEMA_VERSION,
    updatedAt: observedAt,
    entries: entries.slice(0, ENTRIES_CAP),
  });
}

/** Zapis decyzji z dokumentu (patch/approve) — I/O localStorage. */
export function learnFromOfferBoqComponentDecision(opts: {
  component: OfferBoqPricedComponent;
  decision: CompanyKnowledgeDecision;
  fromAi: boolean;
  fieldsChanged?: string[];
  tenderId?: string;
  lineId?: string;
  observedAt?: string;
}): CompanyKnowledgeStore {
  const next = recordCompanyKnowledgeDecision(loadCompanyKnowledgeStoreLocal(), opts);
  saveCompanyKnowledgeStoreLocal(next);
  return next;
}

export function createCompanyKnowledgePriceProvider(
  store: CompanyKnowledgeStore,
): OfferBoqPriceSourceProvider {
  return {
    id: "company_knowledge",
    labelPl: "Wiedza firmy (kosztorysy)",
    lookup(req: OfferBoqPriceLookupRequest): OfferBoqPriceLookupResult | null {
      const entry = findCompanyKnowledgeEntry(store, {
        namePl: req.namePl,
        category: req.category,
        unit: req.unit,
      });
      if (!entry) return null;
      const price = entry.lastUnitPricePln ?? entry.avgUnitPricePln;
      if (price == null || !(price > 0)) return null;

      const confidenceBoosted = entry.approvedCount >= 1 || entry.occurrenceCount >= 2;
      const confidence =
        entry.approvedCount >= 2 || entry.occurrenceCount >= 3
          ? "high"
          : confidenceBoosted
            ? "medium"
            : "low";

      return {
        unitPricePln: price,
        origin: {
          kind: "company_knowledge",
          refId: entry.entryId,
          labelPl: `Wiedza firmy — ${entry.namePl}`,
        },
        confidence,
        rationale:
          `Wykorzystano wiedzę firmy: ${entry.occurrenceCount} wcześniejszych zastosowań` +
          ` (zatwierdzonych: ${entry.approvedCount}, zmienionych: ${entry.changedCount}).` +
          (entry.lastUsedAt ? ` Ostatnie użycie: ${entry.lastUsedAt.slice(0, 10)}.` : "") +
          (confidenceBoosted ? " Podniesiono poziom pewności dzięki historii decyzji." : ""),
        companyKnowledge: {
          entryId: entry.entryId,
          occurrenceCount: entry.occurrenceCount,
          lastUsedAt: entry.lastUsedAt || null,
          confidenceBoosted,
        },
      };
    },
  };
}

export function hintFromLookup(
  result: OfferBoqPriceLookupResult,
): OfferBoqCompanyKnowledgeHint | undefined {
  const ck = result.companyKnowledge;
  if (!ck) {
    if (result.origin.kind !== "company_knowledge") return undefined;
    return {
      used: true,
      entryId: result.origin.refId ?? "",
      occurrenceCount: 1,
      lastUsedAt: null,
      confidenceBoosted: result.confidence !== "low",
    };
  }
  return {
    used: true,
    entryId: ck.entryId,
    occurrenceCount: ck.occurrenceCount,
    lastUsedAt: ck.lastUsedAt,
    confidenceBoosted: ck.confidenceBoosted,
  };
}

export function computeCompanyKnowledgeStats(
  store: CompanyKnowledgeStore,
): CompanyKnowledgeStats {
  let observationCount = 0;
  let approvedObservationCount = 0;
  let changedObservationCount = 0;
  let userConfirmedEntryCount = 0;

  for (const e of store.entries) {
    observationCount += e.observations.length;
    approvedObservationCount += e.approvedCount;
    changedObservationCount += e.changedCount;
    if (e.approvedCount > 0 || e.changedCount > 0) userConfirmedEntryCount += 1;
  }

  const decided = approvedObservationCount + changedObservationCount;
  const aiUserAgreementPct =
    decided > 0
      ? Math.round((approvedObservationCount / decided) * 1000) / 10
      : null;

  const topMaterials = [...store.entries]
    .filter((e) => e.category === "material")
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
    .slice(0, 5)
    .map((e) => ({
      namePl: e.namePl,
      occurrenceCount: e.occurrenceCount,
      category: e.category,
    }));

  return {
    entryCount: store.entries.length,
    observationCount,
    approvedObservationCount,
    changedObservationCount,
    userConfirmedEntryCount,
    topMaterials,
    aiUserAgreementPct,
  };
}

/** Prep S6 — ekspozycja store bez wyliczeń Bid Proposal. */
export function getCompanyKnowledgeStoreForBidPrep(): CompanyKnowledgeStore {
  return loadCompanyKnowledgeStoreLocal();
}

/** Helper: czy dokument ma komponenty z wiedzą firmy. */
export function countCompanyKnowledgeHits(doc: OfferBoqDocument): number {
  let n = 0;
  for (const line of doc.lines) {
    for (const c of line.linePricing?.components ?? []) {
      if (c.companyKnowledgeHint?.used || c.priceOrigin.kind === "company_knowledge") n += 1;
    }
  }
  return n;
}
