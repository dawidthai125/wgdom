/**
 * Przetargi V4 — SSOT slugów URL ↔ legacy workspace tabs (UX.1B).
 */

import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";

export const TENDERS_LIST_PATH = "/przetargi";

export const TENDER_DETAIL_V4_TAB_ORDER = [
  "przetarg",
  "dokumenty",
  "kosztorys",
  "ceny",
  "decyzja",
  "strategia",
  "materialy",
] as const;

export type TenderDetailV4TabId = (typeof TENDER_DETAIL_V4_TAB_ORDER)[number];

/** MVP — zakładki z treścią „Wkrótce”. */
export const TENDER_DETAIL_V4_PLACEHOLDER_TABS: ReadonlySet<TenderDetailV4TabId> = new Set([
  "materialy",
  "strategia",
]);

export const TENDER_DETAIL_V4_TAB_LABELS: Record<TenderDetailV4TabId, string> = {
  przetarg: "Przetarg",
  kosztorys: "Kosztorys",
  ceny: "Ceny",
  materialy: "Materiały",
  strategia: "Strategia",
  decyzja: "Decyzja",
  dokumenty: "Dokumenty",
};

export const TENDER_DETAIL_V4_DEFAULT_TAB: TenderDetailV4TabId = "przetarg";

export function isTenderDetailV4TabId(value: string): value is TenderDetailV4TabId {
  return (TENDER_DETAIL_V4_TAB_ORDER as readonly string[]).includes(value);
}

export function isTenderDetailV4PlaceholderTab(tab: TenderDetailV4TabId): boolean {
  return TENDER_DETAIL_V4_PLACEHOLDER_TABS.has(tab);
}

/** Query ?ws= na tabie decyzja — qualification | offer (overview = brak parametru). */
export const TENDER_DETAIL_DECYZJA_WS_QUERY = "ws";

export const DECYZJA_V4_EMBED_WORKSPACES = ["overview", "qualification", "offer"] as const;

export type DecyzjaV4EmbedWorkspace = (typeof DECYZJA_V4_EMBED_WORKSPACES)[number];

export function isDecyzjaV4EmbedWorkspace(value: string): value is DecyzjaV4EmbedWorkspace {
  return (DECYZJA_V4_EMBED_WORKSPACES as readonly string[]).includes(value);
}

/** Parsuje ?ws=; nieznane wartości → overview. */
export function parseDecyzjaWorkspaceQuery(raw: string | null | undefined): DecyzjaV4EmbedWorkspace {
  if (raw && isDecyzjaV4EmbedWorkspace(raw)) return raw;
  return "overview";
}

/** Slug V4 → legacy workspace (null = brak panelu / placeholder). */
export function v4TabToLegacyWorkspace(tab: TenderDetailV4TabId): TenderWorkspaceTabId | null {
  switch (tab) {
    case "decyzja":
      return "overview";
    case "dokumenty":
      return "documents";
    case "ceny":
      return "valuation";
    case "kosztorys":
    case "przetarg":
    case "materialy":
    case "strategia":
      return null;
    default:
      return null;
  }
}

/** Tab V4 + opcjonalny ?ws= → workspace osadzony w TenderDetailPanel. */
export function resolveV4EmbedLegacyWorkspace(
  tab: TenderDetailV4TabId,
  decyzjaWs?: string | null,
): TenderWorkspaceTabId | null {
  if (tab !== "decyzja") return v4TabToLegacyWorkspace(tab);
  return parseDecyzjaWorkspaceQuery(decyzjaWs);
}

/** Legacy workspace → slug V4 (nawigacja z TenderOwnerView). */
export function legacyWorkspaceToV4Tab(tab: TenderWorkspaceTabId): TenderDetailV4TabId {
  switch (tab) {
    case "overview":
      return "decyzja";
    case "documents":
      return "dokumenty";
    case "valuation":
      return "ceny";
    case "qualification":
      return "decyzja";
    case "offer":
      return "decyzja";
    default:
      return TENDER_DETAIL_V4_DEFAULT_TAB;
  }
}

/** Nawigacja z OwnerView / legacy → V4 (kosztorys osobno od dokumentów). */
export function legacyWorkspaceToV4TabWithContext(
  tab: TenderWorkspaceTabId,
  preferKosztorys = false,
): TenderDetailV4TabId {
  if (preferKosztorys && tab === "documents") return "kosztorys";
  return legacyWorkspaceToV4Tab(tab);
}

export function buildTenderDetailPath(
  tenderId: string,
  tab: TenderDetailV4TabId = TENDER_DETAIL_V4_DEFAULT_TAB,
  opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
): string {
  const base = `${TENDERS_LIST_PATH}/${encodeURIComponent(tenderId)}/${tab}`;
  if (
    tab === "decyzja"
    && opts?.decyzjaWorkspace
    && opts.decyzjaWorkspace !== "overview"
  ) {
    const q = new URLSearchParams({
      [TENDER_DETAIL_DECYZJA_WS_QUERY]: opts.decyzjaWorkspace,
    });
    return `${base}?${q.toString()}`;
  }
  return base;
}

/** Nawigacja z legacy workspace (OwnerView, kafelki gotowości) → pełny path V4. */
export function buildTenderDetailPathFromLegacyWorkspace(
  tenderId: string,
  legacyTab: TenderWorkspaceTabId,
  opts?: { preferKosztorys?: boolean },
): string {
  if (opts?.preferKosztorys && legacyTab === "documents") {
    return buildTenderDetailPath(tenderId, "kosztorys");
  }
  const v4Tab = legacyWorkspaceToV4Tab(legacyTab);
  if (v4Tab === "decyzja" && (legacyTab === "qualification" || legacyTab === "offer")) {
    return buildTenderDetailPath(tenderId, "decyzja", { decyzjaWorkspace: legacyTab });
  }
  return buildTenderDetailPath(tenderId, v4Tab);
}

export interface ParsedTenderDetailPath {
  tenderId: string;
  tab: TenderDetailV4TabId;
}

/** Parsuje pathname (np. /przetargi/uuid/decyzja). */
export function parseTenderDetailPath(pathname: string): ParsedTenderDetailPath | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === TENDERS_LIST_PATH) return null;

  const prefix = `${TENDERS_LIST_PATH}/`;
  if (!normalized.startsWith(prefix)) return null;

  const rest = normalized.slice(prefix.length);
  const slash = rest.indexOf("/");
  if (slash === -1) {
    const tenderId = decodeURIComponent(rest);
    if (!tenderId) return null;
    return { tenderId, tab: TENDER_DETAIL_V4_DEFAULT_TAB };
  }

  const tenderId = decodeURIComponent(rest.slice(0, slash));
  const tabRaw = rest.slice(slash + 1).split("/")[0];
  if (!tenderId || !tabRaw) return null;
  if (!isTenderDetailV4TabId(tabRaw)) return null;

  return { tenderId, tab: tabRaw };
}

export function isTenderV4Path(pathname: string): boolean {
  return pathname === TENDERS_LIST_PATH || parseTenderDetailPath(pathname) != null;
}
