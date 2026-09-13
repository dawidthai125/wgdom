/**
 * MOPS clone p2ui-prod-cache-clone-tender-08def932 — painting / priming / related
 * labor-gap research register (identity + norms).
 *
 * RESEARCH ≠ OUR RATE · KNR r-g ≠ PLN · no invent · no AUT-R1 without Owner PLN route.
 * Tip baseline: 5c47a2dc / 2.66.205 → ship 2.66.206
 */

export const MOPS_08DEF932_LABOR_GAP_RESEARCH_VERSION =
  "MOPS-08DEF932-LABOR-GAP-V1" as const;
export const MOPS_08DEF932_LABOR_GAP_RESEARCH_BASELINE_HEAD = "5c47a2dc" as const;

export type Mops08LaborGapStatus =
  | "ACLC_IDENTITY_READY"
  | "EVIDENCE_ONLY_HOLD"
  | "AUT_R1_BLOCKED_NO_PLN_ROUTE"
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
  /** Research PLN candidate — NEVER auto OUR RATE. */
  researchPlnCandidate: number | null;
  researchPlnNotePl: string | null;
  status: Mops08LaborGapStatus;
  autR1SufficientPlnEvidence: false;
  holdReason: string;
  notesPl: string;
};

export const MOPS_08DEF932_LABOR_GAP_HARD_RULES = Object.freeze([
  "KNR / NNRNKB labor norm (r-g/unit) is not OUR RATE.",
  "Public estimate PLN/m² (e.g. 3.721) is RESEARCH_EVIDENCE_CANDIDATE only.",
  "No r-g × arbitrary hourly rate → OUR RATE.",
  "No reuse of 0815-05 22.88 or legacy-malowanie-m2 22.9 onto paint/prime leaves.",
  "AUT-R1 CURRENT requires Owner-authorized durable PLN Evidence route + contract PASS.",
  "ACLC creates cw.knr.* leaves — not legacy-gruntowanie-m2.",
  "0909-04 / wykwity / transport remain OWNER or excluded — no silent implement.",
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
        "External research: 0.119 r-g/m² × public estimate 31.27 PLN/r-g ≈ 3.721 PLN/m² — RESEARCH only",
      status: "AUT_R1_BLOCKED_NO_PLN_ROUTE",
      autR1SufficientPlnEvidence: false,
      holdReason:
        "ACLC identity ready · no Owner-authorized labor PLN Evidence URL host-lock for AUT-R1",
      notesPl: "Pair-risk vs 1505-01 — separate leaf mandatory",
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
      researchPlnCandidate: null,
      researchPlnNotePl: "Norm only — no durable PLN Evidence route",
      status: "AUT_R1_BLOCKED_NO_PLN_ROUTE",
      autR1SufficientPlnEvidence: false,
      holdReason: "ACLC identity ready · PLN Evidence missing",
      notesPl: "≠ 1204-02 walls · ≠ legacy-malowanie-m2",
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
      researchPlnCandidate: null,
      researchPlnNotePl: null,
      status: "AUT_R1_BLOCKED_NO_PLN_ROUTE",
      autR1SufficientPlnEvidence: false,
      holdReason:
        "ACLC NNRNKB leaf · pack.priming still targets absent legacy-gruntowanie-m2 · no PLN route",
      notesPl: "Do NOT copy OUR RATE 22.9 from legacy-malowanie-m2",
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
      researchPlnCandidate: null,
      researchPlnNotePl: null,
      status: "AUT_R1_BLOCKED_NO_PLN_ROUTE",
      autR1SufficientPlnEvidence: false,
      holdReason:
        "ACLC NNRNKB leaf · pack.priming still targets absent legacy-gruntowanie-m2 · no PLN route",
      notesPl: "Do NOT copy OUR RATE 22.9 from legacy-malowanie-m2",
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
        "CatalogWork EXISTS · OUR RATE null · no durable PLN Evidence → no AUT-R1 invent",
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
    ownerDecision: rows.filter((r) => r.status === "OWNER_DECISION").length,
    bomRequired: rows.filter((r) => r.status === "BOM_TECHNOLOGY_REQUIRED").length,
  };
}
