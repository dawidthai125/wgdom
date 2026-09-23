/**
 * MOPS Electrical RC-1 — Owner identity mappings (exact_normalized).
 *
 * GO 2026-09-15:
 * - VERIFY_CONNECT 0504-03 → p2b-montaz-opraw-oswietleniowych-szt
 * - VERIFY_CONNECT 0407-01 → p2b-montaz-wylacznikow-szt
 * - CREATE mappings for new leaves (0504-07 / 0501-03 kpl / RCD / 1202 / klamki)
 *
 * ZERO fuzzy · ZERO suffix-only · ZERO SEPA 1301 bind for 1202 · ZERO parent legacy.
 */

import type { LaborIdentityMappingRow } from "@/lib/work-catalog/work-rate-identity-mapping";
import {
  MOPS_ELEC_RC1_EXACT_ALIASES,
  MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID,
  MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID,
  MOPS_ELEC_RC1_0504_07_WORK_ID,
  MOPS_ELEC_RC1_0501_03_WORK_ID,
  MOPS_ELEC_RC1_0402_03_WORK_ID,
  MOPS_ELEC_RC1_1202_01_WORK_ID,
  MOPS_ELEC_RC1_KLAMKI_WORK_ID,
  getMopsElecRc1WorkSpec,
} from "@/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog";

export const MOPS_ELEC_RC1_IDENTITY_APPROVED_AT =
  "2026-09-15T05:00:00.000Z" as const;

function baseRow(partial: {
  mappingId: string;
  workId: string;
  categoryKey: LaborIdentityMappingRow["categoryKey"];
  aliases: readonly string[];
  catalogUnit: string;
  observedUnit: string;
  notesPl: string;
}): LaborIdentityMappingRow {
  return {
    mappingId: partial.mappingId,
    version: 1,
    workId: partial.workId,
    sourceId: "*",
    categoryKey: partial.categoryKey,
    matchMode: "exact_normalized",
    observedNameAliases: Object.freeze([...partial.aliases]),
    catalogUnit: partial.catalogUnit as LaborIdentityMappingRow["catalogUnit"],
    observedUnit: partial.observedUnit as LaborIdentityMappingRow["observedUnit"],
    laborOnlyRequired: true,
    includesMaterialPolicy: "reject",
    allowedScopeTags: null,
    regionPolicy: {
      prefer: Object.freeze(["WROCLAW", "REGIONAL", "POLSKA"] as const),
      allowNational: true,
    },
    confidence: "HIGH",
    ownerApproval: true,
    active: true,
    provenance: {
      approvedBy: "owner",
      approvedAt: MOPS_ELEC_RC1_IDENTITY_APPROVED_AT,
      evidenceUrls: Object.freeze([
        "docs/architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md",
        ".tmp/ELECTRICAL_RC1_GO_REQUEST.md",
        ".tmp/ik-electrical-rc1-line-evidence-audit-readonly.md",
      ]),
      notesPl: partial.notesPl,
    },
  };
}

/** VERIFY_CONNECT — MOPS 0504-03 IP20 → existing CHROBREGO leaf (OUR RATE 193 untouched). */
export const MOPS_ELEC_RC1_MAP_0504_03: LaborIdentityMappingRow = baseRow({
  mappingId: "lim-mops-elec-rc1-0504-03-oprawy-ip20",
  workId: MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID,
  categoryKey: "electrical",
  aliases: [MOPS_ELEC_RC1_EXACT_ALIASES["0504-03"]],
  catalogUnit: "szt",
  observedUnit: "szt",
  notesPl:
    "MOPS RC-1 VERIFY_CONNECT — KNR|5-08|0504-03 · exact MOPS BOQ → p2b-montaz-opraw-oswietleniowych-szt. " +
    "≠ 0504-07 · ≠ invent rate · existing OUR RATE 193 unchanged · LABOR_ONLY allowlist inherited from leaf.",
});

/** VERIFY_CONNECT — MOPS 0407-01 KNR-W → existing wylaczniki leaf (OUR RATE 19 untouched). */
export const MOPS_ELEC_RC1_MAP_0407_01: LaborIdentityMappingRow = baseRow({
  mappingId: "lim-mops-elec-rc1-0407-01-wylacznik-nadpradowy",
  workId: MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID,
  categoryKey: "electrical",
  aliases: [MOPS_ELEC_RC1_EXACT_ALIASES["0407-01"]],
  catalogUnit: "szt",
  observedUnit: "szt",
  notesPl:
    "MOPS RC-1 VERIFY_CONNECT — KNR-W|5-08|0407-01 (NOT KNNR 5) · exact MOPS BOQ → p2b-montaz-wylacznikow-szt. " +
    "≠ suffix-only · ≠ mix KNNR evidence · OUR RATE 19 unchanged.",
});

/** CREATE_CANDIDATE — MOPS 0504-07 IP44 → knr-wc-knr-5-08-0504-07-szt (≠ CONNECT 0504-03). */
export const MOPS_ELEC_RC1_MAP_0504_07: LaborIdentityMappingRow = baseRow({
  mappingId: "lim-mops-elec-rc1-0504-07-oprawy-ip44",
  workId: MOPS_ELEC_RC1_0504_07_WORK_ID,
  categoryKey: "electrical",
  aliases: [
    MOPS_ELEC_RC1_EXACT_ALIASES["0504-07"],
    getMopsElecRc1WorkSpec(MOPS_ELEC_RC1_0504_07_WORK_ID)!.namePl,
  ],
  catalogUnit: "szt",
  observedUnit: "szt",
  notesPl:
    "MOPS RC-1 CREATE_CANDIDATE — KNR|5-08|0504-07 IP44 · ≠ 0504-03 · ≠ p2b-montaz-opraw · ZERO OUR RATE until AUT-R1",
});

/** CREATE_CANDIDATE_KPL — MOPS 0501-03 podłoże → knr-wc-knr-5-08-0501-03-kpl (unit kpl HARD). */
export const MOPS_ELEC_RC1_MAP_0501_03: LaborIdentityMappingRow = baseRow({
  mappingId: "lim-mops-elec-rc1-0501-03-podloze-kpl",
  workId: MOPS_ELEC_RC1_0501_03_WORK_ID,
  categoryKey: "electrical",
  aliases: [
    MOPS_ELEC_RC1_EXACT_ALIASES["0501-03"],
    getMopsElecRc1WorkSpec(MOPS_ELEC_RC1_0501_03_WORK_ID)!.namePl,
  ],
  catalogUnit: "kpl",
  observedUnit: "kpl",
  notesPl:
    "MOPS RC-1 CREATE_CANDIDATE_KPL — KNR|5-08|0501-03 · unit kpl HARD · ≠ szt · ≠ 0504 mount · BOM HOLD",
});

export function buildMopsElecRc1CreateMappings(
  approvedAtIso: string = MOPS_ELEC_RC1_IDENTITY_APPROVED_AT,
): readonly LaborIdentityMappingRow[] {
  const rows: LaborIdentityMappingRow[] = [
    MOPS_ELEC_RC1_MAP_0504_07,
    MOPS_ELEC_RC1_MAP_0501_03,
    baseRow({
      mappingId: "lim-mops-elec-rc1-0402-03-rcd-test",
      workId: MOPS_ELEC_RC1_0402_03_WORK_ID,
      categoryKey: "electrical",
      aliases: [
        MOPS_ELEC_RC1_EXACT_ALIASES["0402-03"],
        getMopsElecRc1WorkSpec(MOPS_ELEC_RC1_0402_03_WORK_ID)!.namePl,
      ],
      catalogUnit: "szt",
      observedUnit: "szt",
      notesPl:
        "MOPS RC-1 CREATE_CANDIDATE_RCD — KNR|13-21|0402-03 · ≠ 1202 · ≠ 1301 · r-g ≠ PLN",
    }),
    baseRow({
      mappingId: "lim-mops-elec-rc1-1202-01-circuit-pomiar",
      workId: MOPS_ELEC_RC1_1202_01_WORK_ID,
      categoryKey: "electrical",
      aliases: [
        MOPS_ELEC_RC1_EXACT_ALIASES["1202-01"],
        getMopsElecRc1WorkSpec(MOPS_ELEC_RC1_1202_01_WORK_ID)!.namePl,
      ],
      catalogUnit: "pomiar",
      observedUnit: "pomiar",
      notesPl:
        "MOPS RC-1 CREATE_CANDIDATE_POMIAR — KNR|4-03|1202-01 · ≠ knnr-wc-knnr-5-1301-01-pomiar · unit pomiar HARD",
    }),
    baseRow({
      mappingId: "lim-mops-elec-rc1-klamki-stolarka",
      workId: MOPS_ELEC_RC1_KLAMKI_WORK_ID,
      categoryKey: "other",
      aliases: [
        MOPS_ELEC_RC1_EXACT_ALIASES.klamki,
        getMopsElecRc1WorkSpec(MOPS_ELEC_RC1_KLAMKI_WORK_ID)!.namePl,
      ],
      catalogUnit: "szt",
      observedUnit: "szt",
      notesPl:
        "MOPS RC-1 RECLASS_STOLARKA — Wymiana klamek z rozetami · out of electrical · ≠ legacy-elektryka-szt",
    }),
  ];
  // stamp approvedAt if overridden
  return Object.freeze(
    rows.map((r) => ({
      ...r,
      provenance: { ...r.provenance, approvedAt: approvedAtIso },
    })),
  );
}

export const MOPS_ELEC_RC1_OWNER_IDENTITY_MAPPINGS: readonly LaborIdentityMappingRow[] =
  Object.freeze([
    MOPS_ELEC_RC1_MAP_0504_03,
    MOPS_ELEC_RC1_MAP_0407_01,
    ...buildMopsElecRc1CreateMappings(),
  ]);
