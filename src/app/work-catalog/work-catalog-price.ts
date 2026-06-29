/**
 * P2.2 — walidacja i mutacja ceny firmy (app layer; P1 lib zamrożony).
 */

import {
  withFreshnessStatus,
  type CatalogWork,
  type WorkCatalogStore,
} from "@/lib/work-catalog";

export type ValidateCompanyPriceResult =
  | { ok: true; valuePln: number }
  | { ok: false; message: string };

const PRICE_INPUT_RE = /^\d+(\.\d{1,2})?$/;

export function normalizeCompanyPriceInput(raw: string): string {
  return raw.trim().replace(",", ".");
}

/** Walidacja wejścia użytkownika: ≥ 0, max 2 miejsca po przecinku. */
export function validateCompanyPricePlnInput(raw: string): ValidateCompanyPriceResult {
  const normalized = normalizeCompanyPriceInput(raw);
  if (!normalized) {
    return { ok: false, message: "Podaj cenę" };
  }
  if (!PRICE_INPUT_RE.test(normalized)) {
    return {
      ok: false,
      message: "Cena musi być ≥ 0 z maks. 2 miejscami po przecinku",
    };
  }
  const valuePln = Number(normalized);
  if (!Number.isFinite(valuePln) || valuePln < 0) {
    return { ok: false, message: "Cena musi być ≥ 0" };
  }
  return { ok: true, valuePln: Math.round(valuePln * 100) / 100 };
}

export function formatCompanyPriceDraft(companyPricePln: number): string {
  if (!Number.isFinite(companyPricePln) || companyPricePln <= 0) return "";
  return String(Math.round(companyPricePln * 100) / 100);
}

/** Immutable patch jednej roboty w aktywnym regionie store. */
export function patchWorkCompanyPriceInStore(
  store: WorkCatalogStore,
  workId: string,
  companyPricePln: number,
  updatedAtIso: string,
  nowMs: number = Date.now(),
): WorkCatalogStore | null {
  const region = store.activeRegion;
  const slice = store.catalogs[region];
  const index = slice.works.findIndex((work) => work.id === workId);
  if (index < 0) return null;

  const previous = slice.works[index];
  const updatedWork: CatalogWork = withFreshnessStatus(
    {
      ...previous,
      companyPricePln,
      updatedAt: updatedAtIso,
    },
    nowMs,
  );

  const works = [...slice.works];
  works[index] = updatedWork;

  return {
    ...store,
    updatedAt: updatedAtIso,
    catalogs: {
      ...store.catalogs,
      [region]: {
        ...slice,
        works,
        updatedAt: updatedAtIso,
      },
    },
  };
}
