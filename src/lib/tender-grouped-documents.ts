/**
 * EPIC P2 — Grouped Documents (prezentacja listy w TenderAttachmentsPanel).
 * Klasyfikacja wyłącznie z istniejącego SSOT — bez nowych klasyfikatorów.
 */

import { classifyDocumentRole } from "@/lib/tender-document-role";
import { classifyTenderDocumentDisplayTier } from "@/lib/tender-workspace-ux";

export const TENDER_DOCUMENT_BUSINESS_GROUP_ORDER = [
  "swz",
  "przedmiaryAth",
  "formularze",
  "umowy",
  "opzStwior",
  "zalacznikiFormalne",
  "pozostale",
] as const;

export type TenderDocumentBusinessGroupId = (typeof TENDER_DOCUMENT_BUSINESS_GROUP_ORDER)[number];

export const TENDER_DOCUMENT_BUSINESS_GROUP_LABELS: Record<TenderDocumentBusinessGroupId, string> = {
  swz: "SWZ",
  przedmiaryAth: "Przedmiary / ATH",
  formularze: "Formularze ofertowe",
  umowy: "Umowy",
  opzStwior: "OPZ / STWiOR",
  zalacznikiFormalne: "Załączniki formalne",
  pozostale: "Pozostałe",
};

export interface TenderDocumentGroupMeta {
  filename: string;
  isSwzHint?: boolean;
  sortIndex?: number;
}

export interface TenderDocumentBusinessGroup<T> {
  id: TenderDocumentBusinessGroupId;
  label: string;
  items: T[];
}

function businessGroupFromDocumentRole(
  role: ReturnType<typeof classifyDocumentRole>,
): TenderDocumentBusinessGroupId {
  switch (role) {
    case "swz":
    case "swz_modification":
      return "swz";
    case "przedmiar":
    case "obmiar":
    case "kosztorys":
      return "przedmiaryAth";
    case "formularz":
      return "formularze";
    case "opz":
    case "stwior":
      return "opzStwior";
    default:
      return "pozostale";
  }
}

/** Mapuje tier/role (SSOT) na grupę biznesową UI. */
export function classifyTenderDocumentBusinessGroup(
  filename: string,
  opts?: { isSwzHint?: boolean },
): TenderDocumentBusinessGroupId {
  const tier = classifyTenderDocumentDisplayTier(filename, opts);

  switch (tier) {
    case "swz":
      return "swz";
    case "ath_przedmiar":
    case "kosztorys":
      return "przedmiaryAth";
    case "formularz_ofertowy":
      return "formularze";
    case "wzor_umowy":
      return "umowy";
    case "opz":
    case "stwior":
      return "opzStwior";
    case "zalacznik_formalny":
      return "zalacznikiFormalne";
    case "pozostale":
      return businessGroupFromDocumentRole(classifyDocumentRole(filename));
    default:
      return "pozostale";
  }
}

/** Partycjonuje wiersze listy — zachowuje kolejność wejściową wewnątrz grup. */
export function groupTenderAttachmentRows<T>(
  items: T[],
  getMeta: (item: T) => TenderDocumentGroupMeta,
): TenderDocumentBusinessGroup<T>[] {
  const buckets = new Map<TenderDocumentBusinessGroupId, T[]>();
  for (const id of TENDER_DOCUMENT_BUSINESS_GROUP_ORDER) {
    buckets.set(id, []);
  }

  for (const item of items) {
    const meta = getMeta(item);
    const groupId = classifyTenderDocumentBusinessGroup(meta.filename, { isSwzHint: meta.isSwzHint });
    buckets.get(groupId)!.push(item);
  }

  return TENDER_DOCUMENT_BUSINESS_GROUP_ORDER.map((id) => ({
    id,
    label: TENDER_DOCUMENT_BUSINESS_GROUP_LABELS[id],
    items: buckets.get(id)!,
  }));
}

export function defaultTenderDocumentGroupExpanded(count: number): boolean {
  return count > 0;
}
