/**
 * Biblioteka Robót i Cennik v3.0 — branże (TradeId).
 * Język produktu: Branża · kod: TradeId (≠ moduł Roboty).
 */

/** Kolejność = domyślna prezentacja w UI (P2). */
export const TRADE_IDS = [
  "MALOWANIE",
  "SCIANY_GK",
  "ELEKTRYKA",
  "HYDRAULIKA",
  "PODLOGI",
  "LAZIENKA",
  "DRZWI",
  "OKNA",
  "OGRZEWANIE",
  "WENTYLACJA",
  "MONTAZ",
  "BIURA",
  "ROZBIORKI",
  "TRANSPORT",
  "PRZYGOTOWANIE",
  "POZOSTALE",
] as const;

export type TradeId = (typeof TRADE_IDS)[number];

export const TRADE_LABELS_PL: Record<TradeId, string> = {
  MALOWANIE: "Malowanie",
  SCIANY_GK: "Ściany i GK",
  ELEKTRYKA: "Elektryka",
  HYDRAULIKA: "Hydraulika",
  PODLOGI: "Podłogi",
  LAZIENKA: "Łazienki",
  DRZWI: "Drzwi",
  OKNA: "Okna",
  OGRZEWANIE: "Ogrzewanie",
  WENTYLACJA: "Wentylacja",
  MONTAZ: "Montaż i wyposażenie",
  BIURA: "Biura i lokale usługowe",
  ROZBIORKI: "Rozbiórki",
  TRANSPORT: "Transport i utylizacja",
  PRZYGOTOWANIE: "Przygotowanie i ogólne",
  POZOSTALE: "Pozostałe",
};

export function isTradeId(value: unknown): value is TradeId {
  return typeof value === "string" && (TRADE_IDS as readonly string[]).includes(value);
}

export function tradeLabelPl(tradeId: TradeId): string {
  return TRADE_LABELS_PL[tradeId];
}
