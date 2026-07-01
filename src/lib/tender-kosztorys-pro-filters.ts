/**
 * V4.2A / NG-04 — filtry branżowe Kosztorys PRO (shared, bez cyklu z BOQ explorer).
 */

import type { TenderCatalogQuantityLine } from "@/lib/tenders-bzp-brief";
import {
  type ConstructionCategoryId,
  foldConstructionText,
  matchConstructionKeywordsInText,
} from "@/lib/construction-keywords";

export type KosztorysProFilterId = "all" | ConstructionCategoryId;

const ELECTRICAL_FILTER_EXCLUDE =
  /nietoperz|siedlisk|budek\s+l[eę]gow|trocinobeton|bruzd.{0,40}tynk|wyka[nń]czan.{0,20}tynk|sprz[aą]tanie\s+pomieszcze[nń]/i;

const ELECTRICAL_FILTER_STRONG =
  /rozdzielnic|ydy|ytksy|ytk\b|domofon|rg6|utp|licznik|swiatlowod|światłowod|instalacj.{0,12}elektryczn|o[sś]wietlen|gniazd|opraw|napi[eę]ci|niskiego\s+napi|okablow|energi.{0,6}elektryczn|przew[oó]d\s+ydy|wci[aą]ganie\s+przewodu/i;

export const KOSZTORYS_PRO_FILTER_OPTIONS: {
  id: KosztorysProFilterId;
  label: string;
}[] = [
  { id: "all", label: "Wszystkie" },
  { id: "wykończeniowe", label: "Wykończeniowe" },
  { id: "sanitarne", label: "Sanitarne" },
  { id: "elektryczne", label: "Elektryczne" },
  { id: "dachowe", label: "Dachowe" },
  { id: "drogowe", label: "Drogowe" },
];

function lineMatchesElectricalFilter(description: string): boolean {
  const text = description ?? "";
  if (!text.trim()) return false;
  if (ELECTRICAL_FILTER_EXCLUDE.test(text)) return false;

  const hits = matchConstructionKeywordsInText(text).filter((h) => h.categoryId === "elektryczne");
  if (!hits.length) return false;

  const folded = foldConstructionText(text);
  if (ELECTRICAL_FILTER_STRONG.test(folded)) return true;

  const strongDictionary = [
    "instalacja elektryczna",
    "instalacje elektryczne",
    "rozdzielnica",
    "rozdzielnia",
    "okablowanie",
    "tablica rozdzielcza",
    "instalacja niskiego napięcia",
  ];
  return hits.some((h) =>
    strongDictionary.some((kw) => foldConstructionText(h.keyword).includes(foldConstructionText(kw))),
  );
}

export function lineMatchesConstructionFilter(
  description: string,
  filter: KosztorysProFilterId,
): boolean {
  if (filter === "all") return true;
  if (filter === "elektryczne") return lineMatchesElectricalFilter(description);
  const hits = matchConstructionKeywordsInText(description ?? "");
  return hits.some((h) => h.categoryId === filter);
}

export function kosztorysFilterEmptyMessage(filter: KosztorysProFilterId): string {
  if (filter === "sanitarne") return "Nie wykryto pozycji sanitarnych.";
  if (filter === "elektryczne") return "Nie wykryto pozycji elektrycznych.";
  if (filter === "wykończeniowe") return "Nie wykryto pozycji wykończeniowych.";
  if (filter === "dachowe") return "Nie wykryto pozycji dachowych.";
  if (filter === "drogowe") return "Nie wykryto pozycji drogowych.";
  return "Brak pozycji dla wybranego filtra.";
}

export function filterCatalogLinesByConstructionCategory(
  lines: TenderCatalogQuantityLine[],
  filter: KosztorysProFilterId,
): TenderCatalogQuantityLine[] {
  if (filter === "all") return lines;
  return lines.filter((line) => lineMatchesConstructionFilter(line.description ?? "", filter));
}
