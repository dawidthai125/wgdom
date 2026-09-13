/**
 * MOPS clone p2ui-prod-cache-clone-tender-08def932 — painting / priming / related
 * labor-gap research register (identity + norms + Owner PLN Evidence status).
 *
 * RESEARCH ≠ OUR RATE · KNR r-g ≠ PLN · no invent · no r-g×hourly.
 * Tip baseline: 7d73a3a5 / 2.66.206 → P1 AUT-R1 2.66.207
 */

export const MOPS_08DEF932_LABOR_GAP_RESEARCH_VERSION =
  "MOPS-08DEF932-LABOR-GAP-V1" as const;
export const MOPS_08DEF932_LABOR_GAP_RESEARCH_BASELINE_HEAD = "7d73a3a5" as const;

export type Mops08LaborGapStatus =
  | "ACLC_IDENTITY_READY"
  | "EVIDENCE_ONLY_HOLD"
  | "AUT_R1_BLOCKED_NO_PLN_ROUTE"
  | "AUT_R1_CURRENT"
  | "BOM_TECHNOLOGY_REQUIRED"
  | "OWNER_DECISION"
  | "IDENTITY_UNCERTAIN"
  | "TRANSPORT_PLANE"
  | "MISSING_CATALOG_WORK";

export type Mops08LaborGapRow = {
  group: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "OTHER";
  tableCode: string | null;
  catalogFamilyPrefix: string | null;
  /** Deterministic ACLC id when create is eligible; else null. */
  proposedCatalogWorkId: string | null;
  /** Wrong parent currently bound on OfferBoq (clone). */
  liveWrongParentWorkId: string | null;
  unit: string;
  descriptionPl: string;
  laborNormRgPerUnit: number | null;
  /** Source-observed labor PLN/m² (Evidence) — NEVER invent; OUR RATE only via AUT-R1. */
  researchPlnCandidate: number | null;
  researchPlnNotePl: string | null;
  status: Mops08LaborGapStatus;
  autR1SufficientPlnEvidence: boolean;
  holdReason: string;
  notesPl: string;
  ownerEvidenceSourceId?: string | null;
  ownerEvidenceUrl?: string | null;
};

export const MOPS_08DEF932_LABOR_GAP_HARD_RULES = Object.freeze([
  "KNR / NNRNKB labor norm (r-g/unit) is not OUR RATE.",
  "Source-observed R PLN/m² is Evidence only until AUT-R1 Accept.",
  "No r-g × arbitrary hourly rate → OUR RATE.",
  "No reuse of 0815-05 22.88 or legacy-malowanie-m2 22.9 onto paint/prime leaves.",
  "AUT-R1 CURRENT requires Owner-authorized durable PLN Evidence route + contract PASS.",
  "ACLC creates cw.knr.* leaves — not legacy-gruntowanie-m2.",
  "0909-04 / wykwity / transport remain OWNER or excluded — no silent implement.",
  "P0 1014-07 remains EVIDENCE_ONLY_HOLD until separate Owner GO.",
] as const);

export const MOPS_08DEF932_LABOR_GAP_ROWS: readonly Mops08LaborGapRow[] =
  Object.freeze([
    {
      group: "A",
      tableCode: "1204-02",
      catalogFamilyPrefix: "KNR 4-01",
      proposedCatalogWorkId: "cw.knr.knr-4-01.1204-02.m2",
      liveWrongParentWorkId: "legacy-gladzie_tynki-m2",
      unit: "m2",
      descriptionPl:
        "Dwukrotne malowanie farbami emulsyjnymi starych tynków wewnętrznych ścian",
      laborNormRgPerUnit: 0.119,
      researchPlnCandidate: 3.721,
      researchPlnNotePl:
        "ZSCKR Bozków PDF — źródłowe R = 3.721 PLN/m² (nie przeliczać z r-g) → Owner route zsckr_bozkow_1204_02",
      status: "AUT_R1_CURRENT",
      autR1SufficientPlnEvidence: true,
      holdReason: "",
      notesPl: "Pair-risk vs 1505-01 — separate leaf · OUR RATE via AUT-R1 (2 dp canonical)",
      ownerEvidenceSourceId: "zsckr_bozkow_1204_02",
      ownerEvidenceUrl:
        "https://zsckrbozkow.pl/wp-content/uploads/2025/05/Szkola-Bozkow-rem-Ip-kosztorys-inwest-pdf.pdf",
    },
    {
      group: "A",
      tableCode: "1505-01",
      catalogFamilyPrefix: "KNR 2-02",
      proposedCatalogWorkId: "cw.knr.knr-2-02.1505-01.m2",
      liveWrongParentWorkId: "legacy-gladzie_tynki-m2",
      unit: "m2",
      descriptionPl:
        "Dwukrotne malowanie farbami emulsyjnymi wewnętrznych tynków gładkich bez gruntowania — sufity",
      laborNormRgPerUnit: 0.1391,
      researchPlnCandidate: 1.182,
      researchPlnNotePl:
        "HBStudio Cypisek — Jednostkowe koszty bezpośrednie R = 1.182 PLN/m² → hbstudio_cypisek_1505_01",
      status: "AUT_R1_CURRENT",
      autR1SufficientPlnEvidence: true,
      holdReason: "",
      notesPl: "≠ 1204-02 walls · ≠ legacy-malowanie-m2",
      ownerEvidenceSourceId: "hbstudio_cypisek_1505_01",
      ownerEvidenceUrl:
        "https://hbstudio.pl/wp-content/uploads/2017/10/cypisek-ceny-minimalne.pdf",
    },
    {
      group: "B",
      tableCode: "1134-01",
      catalogFamilyPrefix: "NNRNKB",
      proposedCatalogWorkId: "cw.knr.nnrnkb.1134-01.m2",
      liveWrongParentWorkId: "legacy-malowanie-m2",
      unit: "m2",
      descriptionPl: "Gruntowanie podłoży preparatami — powierzchnie poziome / sufity",
      laborNormRgPerUnit: 0.06,
      researchPlnCandidate: 1.044,
      researchPlnNotePl:
        "LOK Łuków — R = 1.044 PLN/m² poziome → lok_lukow_1134_01 (shared PDF z 1134-02)",
      status: "AUT_R1_CURRENT",
      autR1SufficientPlnEvidence: true,
      holdReason: "",
      notesPl:
        "Do NOT copy OUR RATE 22.9 from legacy-malowanie-m2 · pack.priming may still target absent legacy",
      ownerEvidenceSourceId: "lok_lukow_1134_01",
      ownerEvidenceUrl:
        "https://www.lok.lukow.pl/pobierz/article-d235da9c67851a0efa42a4993de09cb7",
    },
    {
      group: "B",
      tableCode: "1134-02",
      catalogFamilyPrefix: "NNRNKB",
      proposedCatalogWorkId: "cw.knr.nnrnkb.1134-02.m2",
      liveWrongParentWorkId: "legacy-malowanie-m2",
      unit: "m2",
      descriptionPl: "Gruntowanie podłoży preparatami — powierzchnie pionowe",
      laborNormRgPerUnit: 0.08,
      researchPlnCandidate: 1.392,
      researchPlnNotePl:
        "LOK Łuków — R = 1.392 PLN/m² pionowe → lok_lukow_1134_02 (shared PDF z 1134-01)",
      status: "AUT_R1_CURRENT",
      autR1SufficientPlnEvidence: true,
      holdReason: "",
      notesPl: "Do NOT copy OUR RATE 22.9 from legacy-malowanie-m2",
      ownerEvidenceSourceId: "lok_lukow_1134_02",
      ownerEvidenceUrl:
        "https://www.lok.lukow.pl/pobierz/article-d235da9c67851a0efa42a4993de09cb7",
    },
    {
      group: "C",
      tableCode: "1014-07",
      catalogFamilyPrefix: "KNNR-W 3",
      proposedCatalogWorkId: "knr-wc-p31-prod-1787410090884-m2",
      liveWrongParentWorkId: null,
      unit: "m2",
      descriptionPl:
        "Mycie po robotach malarskich posadzek lastrykowych / cementowych / wykładzin / płytek",
      laborNormRgPerUnit: null,
      researchPlnCandidate: null,
      researchPlnNotePl: null,
      status: "EVIDENCE_ONLY_HOLD",
      autR1SufficientPlnEvidence: false,
      holdReason:
        "CatalogWork EXISTS · OUR RATE null · no durable PLN Evidence → no AUT-R1 invent (P0 not in this wave)",
      notesPl: "LABOR_ONLY candidate · TechnologyPack not required until BOM proof",
    },
    {
      group: "D",
      tableCode: "0322-02",
      catalogFamilyPrefix: "KNR 4-01",
      proposedCatalogWorkId: null,
      liveWrongParentWorkId: "legacy-wentylacja-szt",
      unit: "szt",
      descriptionPl: "Obsadzenie kratek wentylacyjnych w ścianach z cegieł",
      laborNormRgPerUnit: 0.68,
      researchPlnCandidate: null,
      researchPlnNotePl: null,
      status: "MISSING_CATALOG_WORK",
      autR1SufficientPlnEvidence: false,
      holdReason:
        "Identity EXACT · ACLC deferred — no Owner-confirmed public source URL pack in this GO",
      notesPl: "Norm 0.68 r-g/szt RESEARCH only",
    },
    {
      group: "E",
      tableCode: "0110-01",
      catalogFamilyPrefix: "KNR 2-15",
      proposedCatalogWorkId: null,
      liveWrongParentWorkId: "legacy-hydraulika-mb",
      unit: "mb",
      descriptionPl:
        "Próba szczelności instalacji wodociągowych w budynkach mieszkalnych (rurociąg ø≤65 mm)",
      laborNormRgPerUnit: null,
      researchPlnCandidate: null,
      researchPlnNotePl: null,
      status: "MISSING_CATALOG_WORK",
      autR1SufficientPlnEvidence: false,
      holdReason: "Bridge key KNR|2-15|0110-01 · CW absent · no PLN Evidence this GO",
      notesPl: "Labor-only plane plausible — still no invent rate",
    },
    {
      group: "F",
      tableCode: "0224-03",
      catalogFamilyPrefix: null,
      proposedCatalogWorkId: null,
      liveWrongParentWorkId: "legacy-hydraulika-szt",
      unit: "kpl",
      descriptionPl: "Montaż ustępów pojedynczych z płuczkami (kompakt)",
      laborNormRgPerUnit: null,
      researchPlnCandidate: null,
      researchPlnNotePl: null,
      status: "BOM_TECHNOLOGY_REQUIRED",
      autR1SufficientPlnEvidence: false,
      holdReason: "Not labor-only · TechnologyPack + materials required",
      notesPl: "Do not fake positionComplete from labor rate alone",
    },
    {
      group: "G",
      tableCode: "0115-05",
      catalogFamilyPrefix: null,
      proposedCatalogWorkId: null,
      liveWrongParentWorkId: "legacy-hydraulika-szt",
      unit: "szt",
      descriptionPl: "Baterie prysznicowe ścienne ø20 mm ze słuchawką",
      laborNormRgPerUnit: null,
      researchPlnCandidate: null,
      researchPlnNotePl: null,
      status: "BOM_TECHNOLOGY_REQUIRED",
      autR1SufficientPlnEvidence: false,
      holdReason: "BOM/material authority required",
      notesPl: "Exact token in BOQ — still no partial fake completion",
    },
    {
      group: "H",
      tableCode: "0501-03",
      catalogFamilyPrefix: null,
      proposedCatalogWorkId: null,
      liveWrongParentWorkId: "legacy-elektryka-szt",
      unit: "kpl",
      descriptionPl:
        "Przygotowanie podłoża pod oprawy oświetleniowe zawieszane na kołkach kotwiących",
      laborNormRgPerUnit: null,
      researchPlnCandidate: null,
      researchPlnNotePl: null,
      status: "EVIDENCE_ONLY_HOLD",
      autR1SufficientPlnEvidence: false,
      holdReason: "Exact token · ≠ luminaires mount · no validated PLN Evidence",
      notesPl: "RESEARCH_REQUIRED for CatalogWork create beyond this register",
    },
    {
      group: "I",
      tableCode: "0909-04",
      catalogFamilyPrefix: "KNR 4-01",
      proposedCatalogWorkId: null,
      liveWrongParentWorkId: "legacy-stolarka-szt",
      unit: "szt",
      descriptionPl:
        "Dopasowanie skrzydeł okiennych zespolonych o powierzchni ponad 0.5 do 2.5 m²",
      laborNormRgPerUnit: null,
      researchPlnCandidate: null,
      researchPlnNotePl: null,
      status: "OWNER_DECISION",
      autR1SufficientPlnEvidence: false,
      holdReason: "WINDOW_SASH_FAMILY_NO_LOCKED_RULE — do not implement",
      notesPl: "Identity EXACT but application lock Owner-only",
    },
    {
      group: "J",
      tableCode: "1202-07",
      catalogFamilyPrefix: "KNR-W 4-01",
      proposedCatalogWorkId: "cc-w2-wykwity-zacieki",
      liveWrongParentWorkId: "cw.etics.boards",
      unit: "m2",
      descriptionPl: "Skasowanie wykwitów (zacieków)",
      laborNormRgPerUnit: null,
      researchPlnCandidate: null,
      researchPlnNotePl: null,
      status: "OWNER_DECISION",
      autR1SufficientPlnEvidence: false,
      holdReason: "Owner map exists · CW absent in LS · wrong etics bind — no auto implement",
      notesPl: "MISSING_CATALOG_WORK in live catalog",
    },
  ]);

export function summarizeMops08LaborGapResearch(): {
  version: typeof MOPS_08DEF932_LABOR_GAP_RESEARCH_VERSION;
  total: number;
  aclcIdentityReady: number;
  autR1Blocked: number;
  autR1Current: number;
  ownerDecision: number;
  bomRequired: number;
} {
  const rows = MOPS_08DEF932_LABOR_GAP_ROWS;
  return {
    version: MOPS_08DEF932_LABOR_GAP_RESEARCH_VERSION,
    total: rows.length,
    aclcIdentityReady: rows.filter(
      (r) =>
        (r.group === "A" || r.group === "B") && Boolean(r.proposedCatalogWorkId),
    ).length,
    autR1Blocked: rows.filter((r) => r.status === "AUT_R1_BLOCKED_NO_PLN_ROUTE")
      .length,
    autR1Current: rows.filter((r) => r.status === "AUT_R1_CURRENT").length,
    ownerDecision: rows.filter((r) => r.status === "OWNER_DECISION").length,
    bomRequired: rows.filter((r) => r.status === "BOM_TECHNOLOGY_REQUIRED").length,
  };
}
