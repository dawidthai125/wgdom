/**
 * MOPS Electrical RC-1 — CatalogWork candidates (Owner GO 2026-09-15).
 *
 * CREATE only (ZERO OUR RATE · ZERO BOM invent · ZERO parent legacy rate):
 * - KNR|5-08|0504-07 (IP44) — separate from 0504-03 / p2b-montaz-opraw
 * - KNR|5-08|0501-03 unit kpl — NEVER szt
 * - KNR|13-21|0402-03 RCD test — ≠ 1202 / 1301
 * - KNR|4-03|1202-01 pomiar — ≠ SEPA knnr-wc-knnr-5-1301-01-pomiar
 * - stolarka: wymiana klamek z rozetami — ≠ electrical
 *
 * REUSE: CatalogWork field contract · SEPA seed pattern · insert both regions.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { withFreshnessStatus } from "@/lib/work-catalog/freshness";

export const MOPS_ELEC_RC1_TENDER_ID =
  "08def932-550d-d6f5-962b-1200014aa6e7" as const;

export const MOPS_ELEC_RC1_0504_07_WORK_ID =
  "knr-wc-knr-5-08-0504-07-szt" as const;
export const MOPS_ELEC_RC1_0501_03_WORK_ID =
  "knr-wc-knr-5-08-0501-03-kpl" as const;
export const MOPS_ELEC_RC1_0402_03_WORK_ID =
  "knr-wc-knr-13-21-0402-03-szt" as const;
export const MOPS_ELEC_RC1_1202_01_WORK_ID =
  "knr-wc-knr-4-03-1202-01-pomiar" as const;
export const MOPS_ELEC_RC1_KLAMKI_WORK_ID =
  "p2b-wymiana-klamek-z-rozetami-szt" as const;

/** Existing CONNECT targets (VERIFY_CONNECT — do not recreate). */
export const MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID =
  "p2b-montaz-opraw-oswietleniowych-szt" as const;
export const MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID =
  "p2b-montaz-wylacznikow-szt" as const;

export const MOPS_ELEC_RC1_CREATE_WORK_IDS = [
  MOPS_ELEC_RC1_0504_07_WORK_ID,
  MOPS_ELEC_RC1_0501_03_WORK_ID,
  MOPS_ELEC_RC1_0402_03_WORK_ID,
  MOPS_ELEC_RC1_1202_01_WORK_ID,
  MOPS_ELEC_RC1_KLAMKI_WORK_ID,
] as const;

export type MopsElecRc1WorkSpec = {
  id: (typeof MOPS_ELEC_RC1_CREATE_WORK_IDS)[number];
  sourceCode: string;
  namePl: string;
  sourceDescription: string;
  unit: WgdomCostUnit;
  tradeId: "ELEKTRYKA" | "DRZWI";
  knrFamily: string;
  tableCode: string | null;
  notesPl: string;
};

/** Exact MOPS BOQ strings (identity aliases) — from live package audit. */
export const MOPS_ELEC_RC1_EXACT_ALIASES = Object.freeze({
  "0504-03":
    "Montaż z podłączeniem na gotowym podłożu opraw szt d.4 0504-03 oświetleniowych typu LED (plafon IP20) przykręcanych, końcowych 6",
  "0504-07":
    "Montaż z podłączeniem na gotowym podłożu opraw szt d.4 0504-07 oświetleniowych typu LED (plafon bryzgoszczelny IP44) przykręcanych, końcowych-łazienka, kuchnia 3",
  "0501-03":
    "Przygotowanie podłoża pod oprawy oświetleniowe kpl d.4 0501-03 zawieszane na kołkach kotwiących na podłożu betonowym (il. mocowań 1) 5",
  "0407-01":
    "Montaż osprzętu modułowego w rozdzielnicach-szt d.4 0407-01 wyłącznik nadprądowy 1-biegunowy 10",
  "0402-03":
    "Badanie wyłącznika przeciwporażeniowego szt d.4 0402-03 różnicowo-prądowego 6",
  "1202-01":
    "Sprawdzenie i pomiar kompletnego 1-fazowego obwodu pomiar d.4 1202-01 elektrycznego niskiego napięcia 20",
  klamki: "Wymiana klamek z rozetami",
} as const);

export const MOPS_ELEC_RC1_CREATE_WORKS: readonly MopsElecRc1WorkSpec[] =
  Object.freeze([
    {
      id: MOPS_ELEC_RC1_0504_07_WORK_ID,
      sourceCode: "KNR|5-08|0504-07",
      namePl:
        "Montaż opraw LED plafon IP44 / bryzgoszczelny z podłączeniem (KNR 5-08 0504-07) (szt)",
      sourceDescription:
        "Montaż z podłączeniem na gotowym podłożu opraw oświetleniowych typu LED (plafon bryzgoszczelny IP44) przykręcanych, końcowych",
      unit: "szt",
      tradeId: "ELEKTRYKA",
      knrFamily: "KNR",
      tableCode: "0504-07",
      notesPl:
        "MOPS RC-1 CREATE — ≠ 0504-03 · ≠ p2b-montaz-opraw-oswietleniowych-szt · ZERO OUR RATE until AUT-R1",
    },
    {
      id: MOPS_ELEC_RC1_0501_03_WORK_ID,
      sourceCode: "KNR|5-08|0501-03",
      namePl:
        "Przygotowanie podłoża pod oprawy oświetleniowe na kołkach (KNR 5-08 0501-03) (kpl)",
      sourceDescription:
        "Przygotowanie podłoża pod oprawy oświetleniowe zawieszane na kołkach kotwiących na podłożu betonowym",
      unit: "kpl",
      tradeId: "ELEKTRYKA",
      knrFamily: "KNR",
      tableCode: "0501-03",
      notesPl:
        "MOPS RC-1 CREATE_CANDIDATE_KPL — unit kpl HARD · ≠ 0504 mount · ≠ szt leaf · ZERO OUR RATE",
    },
    {
      id: MOPS_ELEC_RC1_0402_03_WORK_ID,
      sourceCode: "KNR|13-21|0402-03",
      namePl:
        "Badanie wyłącznika różnicowoprądowego / RCD (KNR 13-21 0402-03) (szt)",
      sourceDescription:
        "Badanie wyłącznika przeciwporażeniowego różnicowo-prądowego",
      unit: "szt",
      tradeId: "ELEKTRYKA",
      knrFamily: "KNR",
      tableCode: "0402-03",
      notesPl:
        "MOPS RC-1 CREATE_CANDIDATE_RCD — ≠ 1202-01 · ≠ 1301-01 · KNR norm ≠ OUR RATE PLN",
    },
    {
      id: MOPS_ELEC_RC1_1202_01_WORK_ID,
      sourceCode: "KNR|4-03|1202-01",
      namePl:
        "Sprawdzenie i pomiar kompletnego 1-fazowego obwodu NN (KNR 4-03 1202-01) (pomiar)",
      sourceDescription:
        "Sprawdzenie i pomiar kompletnego 1-fazowego obwodu elektrycznego niskiego napięcia",
      unit: "pomiar",
      tradeId: "ELEKTRYKA",
      knrFamily: "KNR",
      tableCode: "1202-01",
      notesPl:
        "MOPS RC-1 CREATE_CANDIDATE_POMIAR — ≠ knnr-wc-knnr-5-1301-01-pomiar · unit pomiar HARD",
    },
    {
      id: MOPS_ELEC_RC1_KLAMKI_WORK_ID,
      sourceCode: "MOPS|DRZWI|KLAMKI",
      namePl: "Wymiana klamek z rozetami (szt)",
      sourceDescription: "Wymiana klamek z rozetami",
      unit: "szt",
      tradeId: "DRZWI",
      knrFamily: "DRZWI",
      tableCode: null,
      notesPl:
        "MOPS RC-1 RECLASS_STOLARKA/DRZWI — was misbound legacy-elektryka-szt · ≠ electrical leaf/rate/BOM",
    },
  ]);

export function getMopsElecRc1WorkSpec(
  workId: string,
): MopsElecRc1WorkSpec | null {
  return MOPS_ELEC_RC1_CREATE_WORKS.find((w) => w.id === workId) ?? null;
}

export function isMopsElecRc1CreateWorkId(
  workId: string | null | undefined,
): boolean {
  const id = String(workId ?? "").trim();
  return (MOPS_ELEC_RC1_CREATE_WORK_IDS as readonly string[]).includes(id);
}

export function buildMopsElecRc1CatalogWork(
  spec: MopsElecRc1WorkSpec,
  nowIso: string,
): CatalogWork {
  const work: CatalogWork = {
    id: spec.id,
    tradeId: spec.tradeId,
    namePl: spec.namePl,
    unit: spec.unit,
    companyPricePln: 0,
    legacyCategoryId: spec.tradeId,
    commercialPricing: {
      marginPct: 0,
      updatedAt: nowIso,
      source: "owner",
    },
    updatedAt: nowIso,
    freshnessStatus: "missing",
    descriptionPl: `${spec.sourceDescription} · ${spec.sourceCode} · ${spec.notesPl}`,
    keywords: [
      ...spec.sourceDescription
        .toLowerCase()
        .split(/[^a-z0-9ąćęłńóśźż]+/i)
        .filter((t) => t.length >= 3)
        .slice(0, 12),
      spec.tableCode,
      spec.knrFamily.toLowerCase(),
      "mops",
      "rc1",
    ].filter(Boolean) as string[],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    costSplit: { materialRatio: 0, laborRatio: 1 },
  };
  return withFreshnessStatus(work, Date.parse(nowIso));
}

export function workMatchesMopsElecRc1Spec(
  work: CatalogWork,
  spec: MopsElecRc1WorkSpec,
): boolean {
  return (
    work.id === spec.id &&
    work.unit === spec.unit &&
    work.namePl === spec.namePl &&
    work.tradeId === spec.tradeId &&
    work.companyPricePln === 0 &&
    work.costSplit?.laborRatio === 1 &&
    work.costSplit?.materialRatio === 0 &&
    work.active === true &&
    !work.ourWorkRate &&
    String(work.descriptionPl ?? "").includes(spec.sourceCode)
  );
}
