/**
 * TPI/729 — durable Labor Rate Research register for 48 residual BRAK_STAWKI_ROBOT.
 *
 * Evidence ≠ OUR RATE · KNR r-g ≠ OUR RATE PLN · historical estimate PLN ≠ automatic OUR RATE.
 * NO invent · NO host-lock bypass · NO semantic rate transfer.
 *
 * Baseline: 7cb6d9fb · tip 2.66.198 · research Owner/ChatGPT GO 2026-09-13
 */

export const TPI729_48_RESIDUAL_RESEARCH_VERSION = "TPI729-48-RESIDUALS-V1" as const;
export const TPI729_48_RESIDUAL_RESEARCH_BASELINE_HEAD = "7cb6d9fb" as const;
export const TPI729_48_RESIDUAL_RESEARCH_BASELINE_VERSION = "2.66.198" as const;

export type Tpi729ResidualResearchStatus =
  | "AUT_R1_CURRENT"
  | "AUT_R1_READY"
  | "EVIDENCE_ONLY_HOLD"
  | "IDENTITY_HOLD"
  | "UNIT_HOLD"
  | "EXCLUDED"
  | "COMPOUND_CLLR_DEPENDENT";

export type Tpi729ResidualResearchClass =
  | "COMPOUND_LABOR_LEAF"
  | "CANONICAL_KNR"
  | "EXCLUDED_SPECIAL";

export type Tpi729ResidualResearchRow = {
  class: Tpi729ResidualResearchClass;
  tableCode: string | null;
  liveWorkId: string | null;
  /** GO-proposed workId when it differs from live (must not silently overwrite). */
  goProposedWorkId: string | null;
  knrFamilyLive: string | null;
  knrFamilyResearch: string | null;
  unit: string | null;
  descriptionPl: string;
  laborNormRgPerUnit: number | null;
  claimedDirectLaborPln: number | null;
  claimedPlnNotePl: string | null;
  sources: readonly {
    label: string;
    sourceUrl: string | null;
    urlResolved: boolean;
    notePl: string;
  }[];
  autR1SufficientPlnEvidence: boolean;
  status: Tpi729ResidualResearchStatus;
  holdReason: string | null;
  notesPl: string;
};

/**
 * HARD rules — cold-start must re-read these before any AUT-R1 attempt.
 */
export const TPI729_48_RESIDUAL_HARD_RULES = Object.freeze([
  "KNR labor norm (r-g/unit) is not OUR RATE.",
  "Historical cost-estimate labor price is Evidence, not automatic OUR RATE.",
  "No companyPricePln migration without separate Owner GO.",
  "No semantic rate transfer across KNR codes / families.",
  "No r-g × arbitrary hourly rate → OUR RATE.",
  "No szt/prob/pomiar unit conversion without hard compatibility rule.",
  "Host lock requires exact Owner-authorized URL — unresolved URL ⇒ no durable PLN Evidence ingest.",
  "CLLR does not create OUR RATE — requires CURRENT leaf rate.",
] as const);

export const TPI729_48_RESIDUAL_RESEARCH_ROWS: readonly Tpi729ResidualResearchRow[] =
  Object.freeze([
    // ── Already CURRENT (prior GO 2.66.198) ──
    {
      class: "CANONICAL_KNR",
      tableCode: "1118-09",
      liveWorkId: "cw.knr.knr-2-02.1118-09.m2",
      goProposedWorkId: null,
      knrFamilyLive: "KNR 2-02",
      knrFamilyResearch: "KNR 2-02 / KNR 202",
      unit: "m2",
      descriptionPl: "Posadzki płytkowe z kamieni sztucznych",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: 48.201,
      claimedPlnNotePl: "BIP Staro Olecko — Robocizna razem 48.201 PLN/m2 (labor-only).",
      sources: Object.freeze([
        {
          label: "BIP Staro Olecko",
          sourceUrl:
            "https://www.spolecko.bip.doc.pl/upload/doc/19103_20180403_120927.pdf",
          urlResolved: true,
          notePl: "Owner exact Evidence route · AUT-R1 ACCEPT · CURRENT 48.20 AUTO_R1",
        },
      ]),
      autR1SufficientPlnEvidence: true,
      status: "AUT_R1_CURRENT",
      holdReason: null,
      notesPl: "CLOSED prior GO 2.66.198 — do not reopen / do not transfer rate.",
    },
    {
      class: "CANONICAL_KNR",
      tableCode: "0829-03",
      liveWorkId: "cw.knr.knr-2-02.0829-03.m2",
      goProposedWorkId: null,
      knrFamilyLive: "KNR 2-02",
      knrFamilyResearch: "KNR 2-02 (alt KNR 0-12 in estimate)",
      unit: "m2",
      descriptionPl: "Licowanie ścian płytkami na klej",
      laborNormRgPerUnit: 1.91,
      claimedDirectLaborPln: 61.12,
      claimedPlnNotePl: "Public estimate — 1.91 r-g × 32 PLN/r-g = 61.12 PLN/m2 labor line.",
      sources: Object.freeze([
        {
          label: "Public cost estimate (fliphtml5)",
          sourceUrl:
            "https://fliphtml5.com/wnzvl/ndtc/RB-_ca%C5%82o%C5%9B%C4%87-_po_inwent/",
          urlResolved: true,
          notePl: "Owner exact Evidence route · AUT-R1 ACCEPT · CURRENT 61.12 AUTO_R1",
        },
      ]),
      autR1SufficientPlnEvidence: true,
      status: "AUT_R1_CURRENT",
      holdReason: null,
      notesPl: "CLOSED prior GO 2.66.198 — do not reopen / do not transfer rate.",
    },

    // ── Compound leaf targets researched ──
    {
      class: "CANONICAL_KNR",
      tableCode: "0815-04",
      liveWorkId: "cw.knr.knr-2-02.0815-04.m2",
      goProposedWorkId: null,
      knrFamilyLive: "KNR 2-02",
      knrFamilyResearch: "KNR 2-02",
      unit: "m2",
      descriptionPl: "Wewnętrzne gładzie gipsowe dwuwarstwowe na ścianach",
      laborNormRgPerUnit: 0.5093,
      claimedDirectLaborPln: 13.15013,
      claimedPlnNotePl:
        "BIP Obornicki: 0.5093 r-g × 25.82 PLN/r-g = 13.15013 PLN/m2 labor-only (Evidence → AUT-R1 → CURRENT 13.15).",
      sources: Object.freeze([
        {
          label: "BIP Powiat Obornicki — kosztorys inwestorski branża budowlana",
          sourceUrl:
            "https://bip.powiatobornicki.pl/pliki/powiatobornicki/zalaczniki/3924/kosztorys-inwestorski-branza-budowlana.pdf",
          urlResolved: true,
          notePl:
            "Owner exact Evidence route bip_powiat_obornicki_0815_04 · host bip.powiatobornicki.pl · AUT-R1 ACCEPT · CURRENT 13.15 AUTO_R1",
        },
        {
          label: "Alternate same-source PDF (discovered; NOT host-authorized)",
          sourceUrl:
            "https://bip.powiatobornicki.pl/pliki/powiatobornicki/zalaczniki/3800/01_07_2022_14_23_54_kosztorys-inwestorski.pdf",
          urlResolved: true,
          notePl: "Corroboration only — not in Owner Evidence routes (exact primary URL only).",
        },
      ]),
      autR1SufficientPlnEvidence: true,
      status: "AUT_R1_CURRENT",
      holdReason: null,
      notesPl:
        "Historical cost-estimate labor price is valid Evidence only; OUR RATE via AUT-R1 · ≠ 0815-05 · no transfer",
    },
    {
      class: "CANONICAL_KNR",
      tableCode: "2006-04",
      liveWorkId: "cw.knr.knr-2-02.2006-04.m2",
      goProposedWorkId: null,
      knrFamilyLive: "KNR 2-02",
      knrFamilyResearch: "KNR 2-02",
      unit: "m2",
      descriptionPl:
        "Okładziny z płyt gipsowo-kartonowych (suche tynki gipsowe) pojedyncze na stropach na rusztach",
      laborNormRgPerUnit: 0.7039,
      claimedDirectLaborPln: 9.62,
      claimedPlnNotePl:
        "winbud Szczegolowy.pdf: 0.7039 r-g × 13.67 PLN/r-g = 9.62 PLN/m2 labor-only (Evidence → AUT-R1 → CURRENT 9.62).",
      sources: Object.freeze([
        {
          label: "winbud.pl — Szczegolowy.pdf",
          sourceUrl: "https://www.winbud.pl/images/Szczegolowy.pdf",
          urlResolved: true,
          notePl:
            "Owner exact Evidence route winbud_szczegolowy_2006_04 · host winbud.pl · AUT-R1 ACCEPT · CURRENT 9.62 AUTO_R1",
        },
      ]),
      autR1SufficientPlnEvidence: true,
      status: "AUT_R1_CURRENT",
      holdReason: null,
      notesPl:
        "Historical cost-estimate labor price is valid Evidence only; OUR RATE via AUT-R1 · no 0.7039×52.30 invent",
    },
    {
      class: "CANONICAL_KNR",
      tableCode: "1205-09",
      liveWorkId: "cw.knr.knnr-2.1205-09.m2",
      goProposedWorkId: "cw.knr.knr-2-02.1205-09.m2",
      knrFamilyLive: "KNNR 2",
      knrFamilyResearch: "KNNR 2",
      unit: "m2",
      descriptionPl: "Posadzki z paneli podłogowych",
      laborNormRgPerUnit: 0.96,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([
        {
          label: "Policja Piła — Adaptacja pomieszczeń biurowych (KNNR 2 1205/09)",
          sourceUrl: null,
          urlResolved: false,
          notePl: "Labor norm 0.96 r-g/m2 claimed; URL not resolved.",
        },
        {
          label: "MZB Tarnów — Remont lokalu mieszkalnego",
          sourceUrl: null,
          urlResolved: false,
          notePl: "Labor norm 0.96 r-g/m2 claimed; URL not resolved.",
        },
        {
          label: "Prior verified identity sources (gov.pl / BIP Karlino)",
          sourceUrl: "https://www.gov.pl/attachment/bfce9db3-9dba-46d1-b28f-f9782eb51260",
          urlResolved: true,
          notePl: "Identity family KNNR 2 — not KNR 2-02.",
        },
      ]),
      autR1SufficientPlnEvidence: false,
      status: "EVIDENCE_ONLY_HOLD",
      holdReason:
        "NO_DIRECT_LABOR_ONLY_PLN_M2 · live ID remains cw.knr.knnr-2.1205-09.m2 (GO knr-2-02 REJECTED — wrong family)",
      notesPl:
        "HARD: do not create cw.knr.knr-2-02.1205-09.m2 · KNNR≠KNR · do not 0.96×hourly.",
    },

    // ── Canonical KNR with identity conflicts / holds ──
    {
      class: "CANONICAL_KNR",
      tableCode: "0135-01",
      liveWorkId: "cw.knr.knr-w-2-15.0135-01.szt",
      goProposedWorkId: null,
      knrFamilyLive: "KNR-W 2-15",
      knrFamilyResearch: "KNR 4-02 (demontaż wodomierza) — DOES NOT MATCH LIVE",
      unit: "szt",
      descriptionPl: "Zawory czerpalne o śr. nominalnej 15 mm (live TPI line)",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([
        {
          label: "Sąd Rejonowy Zielona Góra — ŚLEPY KOSZTORYS (KNR 4-02 0135-01 demontaż wodomierza)",
          sourceUrl: null,
          urlResolved: false,
          notePl: "Research evidence is DIFFERENT identity than live CatalogWork — DO NOT ATTACH.",
        },
      ]),
      autR1SufficientPlnEvidence: false,
      status: "IDENTITY_HOLD",
      holdReason:
        "LIVE_ID_KNR_W_2_15_ZAWORY ≠ RESEARCH_KNR_4_02_DEMONTAZ_WODOMIERZA — no semantic aliasing",
      notesPl: "Root cause also WORK_NOT_IN_CATALOG_OR_UNIT_MISMATCH in residual RCA.",
    },
    {
      class: "CANONICAL_KNR",
      tableCode: "1205-05",
      liveWorkId: "cw.knr.knr-4-03.1205-05-00.pomiar",
      goProposedWorkId: null,
      knrFamilyLive: "KNR 4-03",
      knrFamilyResearch: "KNR 4-03",
      unit: "pomiar",
      descriptionPl: "Pierwszy pomiar skuteczności zerowania",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([
        {
          label: "Baza Konkurencyjności — Instalacja fotowoltaiczna",
          sourceUrl: null,
          urlResolved: false,
          notePl: "Identity corroboration claimed; no trusted PLN/pomiar.",
        },
        {
          label: "BIP Grójec — oświetlenie terenu",
          sourceUrl: null,
          urlResolved: false,
          notePl: "Identity corroboration claimed; no trusted PLN/pomiar.",
        },
      ]),
      autR1SufficientPlnEvidence: false,
      status: "EVIDENCE_ONLY_HOLD",
      holdReason: "NO_TRUSTED_LABOR_ONLY_PLN_PER_POMIAR · no szt↔pomiar conversion",
      notesPl: "UNIT plane sensitive — fail-closed.",
    },
    {
      class: "CANONICAL_KNR",
      tableCode: "0602-01",
      liveWorkId: "cw.knr.knr-k-04.0602-01.m2",
      goProposedWorkId: null,
      knrFamilyLive: "KNR-K 04",
      knrFamilyResearch: "KNR-W 2-02 (GO text) — FAMILY CONFLICT vs live",
      unit: "m2",
      descriptionPl: "Izolacje przeciwwilgociowe (live CatalogWork knr-k-04)",
      laborNormRgPerUnit: 0.0635,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([
        {
          label: "Biuro Obsługi Inwestycji — kosztorys (KNR-W 2-02 0602-01 · 0.0635 r-g)",
          sourceUrl: null,
          urlResolved: false,
          notePl:
            "Research family KNR-W 2-02 ≠ live KNR-K 04 — do not attach until Owner resolves family.",
        },
      ]),
      autR1SufficientPlnEvidence: false,
      status: "IDENTITY_HOLD",
      holdReason: "LIVE_FAMILY_KNR_K_04 ≠ RESEARCH_FAMILY_KNR_W_2_02",
      notesPl: "Also residual RCA: WORK_NOT_IN_CATALOG_OR_UNIT_MISMATCH.",
    },
    {
      class: "CANONICAL_KNR",
      tableCode: "0216-10",
      liveWorkId: "cw.knr.knr-35.216-10.szt",
      goProposedWorkId: null,
      knrFamilyLive: "KNR 35 (id slug knr-35.216-10)",
      knrFamilyResearch: "KNR 0-35 0216-10 filter do wody (claimed)",
      unit: "szt",
      descriptionPl: "Live ID cw.knr.knr-35.216-10.szt — verify vs KNR 0-35 0216-10",
      laborNormRgPerUnit: 0.55,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([
        {
          label: "External search — KNR 0-35 0216-10 filter do wody 0.55 r-g/szt",
          sourceUrl: null,
          urlResolved: false,
          notePl: "Insufficient to assume live ID identity — no semantic attach.",
        },
      ]),
      autR1SufficientPlnEvidence: false,
      status: "IDENTITY_HOLD",
      holdReason: "LIVE_CODE_216-10_VS_RESEARCH_0216-10 · no semantic aliasing · no PLN",
      notesPl: "WORK_NOT_IN_CATALOG_OR_UNIT_MISMATCH in residual RCA.",
    },
    {
      class: "CANONICAL_KNR",
      tableCode: "0401-11",
      liveWorkId: "cw.knr.knr-5-08.0401-11.szt",
      goProposedWorkId: null,
      knrFamilyLive: "KNR 5-08",
      knrFamilyResearch: "KNR 4-04 (dismantling skirting) — DOES NOT MATCH LIVE",
      unit: "szt",
      descriptionPl: "Live CatalogWork cw.knr.knr-5-08.0401-11.szt",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([
        {
          label: "External — KNR 4-04 0401-11 dismantling skirting/sealing strips",
          sourceUrl: null,
          urlResolved: false,
          notePl: "Do NOT normalize to KNR 4-01 or attach to KNR 5-08 without Owner identity GO.",
        },
      ]),
      autR1SufficientPlnEvidence: false,
      status: "IDENTITY_HOLD",
      holdReason: "LIVE_FAMILY_KNR_5_08 ≠ RESEARCH_FAMILY_KNR_4_04",
      notesPl: "Identity conflict HOLD.",
    },

    // ── Compound parents (27 lines) — CLLR dependent ──
    {
      class: "COMPOUND_LABOR_LEAF",
      tableCode: null,
      liveWorkId: "legacy-gladzie_tynki-m2",
      goProposedWorkId: null,
      knrFamilyLive: null,
      knrFamilyResearch: null,
      unit: "m2",
      descriptionPl: "Compound parent — walls skim → leaf 0815-04 (≠ 0815-05)",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([]),
      autR1SufficientPlnEvidence: false,
      status: "COMPOUND_CLLR_DEPENDENT",
      holdReason: "CLLR leaf CURRENT (0815-04=13.15) — Finance may still block on BOM/TechnologyPack",
      notesPl: "Never set OUR RATE on parent · walls leaf CLOSED AUT-R1 2.66.200",
    },
    {
      class: "COMPOUND_LABOR_LEAF",
      tableCode: null,
      liveWorkId: "cc-w2-scianki-dzialowe-gr-pakiet-m2",
      goProposedWorkId: null,
      knrFamilyLive: null,
      knrFamilyResearch: null,
      unit: "m2",
      descriptionPl: "Compound package — 2006-04 only when exact GK ceiling/frame scope",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([]),
      autR1SufficientPlnEvidence: false,
      status: "COMPOUND_CLLR_DEPENDENT",
      holdReason: "CLLR leaf CURRENT (2006-04=9.62) when exact scope — BOM/pack may still block",
      notesPl: "Do not assume every package line is 2006-04 · leaf CLOSED AUT-R1 2.66.200",
    },
    {
      class: "COMPOUND_LABOR_LEAF",
      tableCode: null,
      liveWorkId: "legacy-podlogi-m2",
      goProposedWorkId: null,
      knrFamilyLive: null,
      knrFamilyResearch: null,
      unit: "m2",
      descriptionPl: "Compound floors — panels→1205-09 · stone→1118-09 · foam OWNER · demo HOLD",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([]),
      autR1SufficientPlnEvidence: false,
      status: "COMPOUND_CLLR_DEPENDENT",
      holdReason: "Exact-scope CLLR · 1205-09 HOLD · foam OWNER_DECISION · demolition no rule",
      notesPl: "1118-09 CURRENT may unlock matching stone lines only.",
    },
    {
      class: "COMPOUND_LABOR_LEAF",
      tableCode: null,
      liveWorkId: "legacy-glazura-m2",
      goProposedWorkId: null,
      knrFamilyLive: null,
      knrFamilyResearch: null,
      unit: "m2",
      descriptionPl: "Compound glazura — 0829-03 CURRENT 61.12 for exact researched scope",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([]),
      autR1SufficientPlnEvidence: false,
      status: "COMPOUND_CLLR_DEPENDENT",
      holdReason: "CLLR exact scope only — leaf CURRENT but BOM/pack may still block Finance",
      notesPl: "0829-03 rate CLOSED — do not force-bind non-matching lines.",
    },
    {
      class: "COMPOUND_LABOR_LEAF",
      tableCode: null,
      liveWorkId: "legacy-stolarka-szt",
      goProposedWorkId: null,
      knrFamilyLive: null,
      knrFamilyResearch: null,
      unit: "szt",
      descriptionPl: "Compound stolarka — 0411-08 remains OWNER_DECISION",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([]),
      autR1SufficientPlnEvidence: false,
      status: "COMPOUND_CLLR_DEPENDENT",
      holdReason: "OWNER_DECISION_0411_08 — no generic stolarka OUR RATE",
      notesPl: "Do not force AUT-R1.",
    },

    // ── Excluded / special ×9 ──
    {
      class: "EXCLUDED_SPECIAL",
      tableCode: null,
      liveWorkId: "legacy-transport_utylizacja-m3",
      goProposedWorkId: null,
      knrFamilyLive: null,
      knrFamilyResearch: null,
      unit: "m3",
      descriptionPl: "TRANSPORT ×3 — not labor OUR RATE plane",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([]),
      autR1SufficientPlnEvidence: false,
      status: "EXCLUDED",
      holdReason: "TRANSPORT_PLANE — Owner Input / bid transport · outside AUT-R1",
      notesPl: "3 lines",
    },
    {
      class: "EXCLUDED_SPECIAL",
      tableCode: null,
      liveWorkId: "cw.etics.substrate",
      goProposedWorkId: null,
      knrFamilyLive: null,
      knrFamilyResearch: null,
      unit: null,
      descriptionPl: "ETICS substrate ×2 — MATERIAL plane",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([]),
      autR1SufficientPlnEvidence: false,
      status: "EXCLUDED",
      holdReason: "MATERIAL_PLANE — route AUT-MAT / material research · not AUT-R1",
      notesPl: "2 lines",
    },
    {
      class: "EXCLUDED_SPECIAL",
      tableCode: null,
      liveWorkId: "knr-wc-p31-prod-1787410090884-m2",
      goProposedWorkId: null,
      knrFamilyLive: null,
      knrFamilyResearch: null,
      unit: "m2",
      descriptionPl: "P31 provisional identity ×3",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([]),
      autR1SufficientPlnEvidence: false,
      status: "EXCLUDED",
      holdReason: "P31_IDENTITY_PLANE — no invented labor rate · no companyPrice substitute",
      notesPl: "3 lines",
    },
    {
      class: "EXCLUDED_SPECIAL",
      tableCode: null,
      liveWorkId: null,
      goProposedWorkId: null,
      knrFamilyLive: null,
      knrFamilyResearch: null,
      unit: null,
      descriptionPl: "UNIT mismatch residual ×1 (NIEPRAWIDLOWA_JEDNOSTKA / hard unit HOLD)",
      laborNormRgPerUnit: null,
      claimedDirectLaborPln: null,
      claimedPlnNotePl: null,
      sources: Object.freeze([]),
      autR1SufficientPlnEvidence: false,
      status: "UNIT_HOLD",
      holdReason: "UNIT_MISMATCH — no automatic conversion",
      notesPl: "Separate from BRAK_STAWKI_ROBOT labor research.",
    },
  ]);

export function summarizeTpi72948ResidualResearch(): {
  version: typeof TPI729_48_RESIDUAL_RESEARCH_VERSION;
  baselineHead: typeof TPI729_48_RESIDUAL_RESEARCH_BASELINE_HEAD;
  byStatus: Record<string, number>;
  byClass: Record<string, number>;
  autR1Current: string[];
  holds: string[];
} {
  const byStatus: Record<string, number> = {};
  const byClass: Record<string, number> = {};
  const autR1Current: string[] = [];
  const holds: string[] = [];
  for (const r of TPI729_48_RESIDUAL_RESEARCH_ROWS) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    byClass[r.class] = (byClass[r.class] || 0) + 1;
    const key = r.liveWorkId || r.tableCode || r.descriptionPl.slice(0, 40);
    if (r.status === "AUT_R1_CURRENT") autR1Current.push(key);
    else if (r.status !== "COMPOUND_CLLR_DEPENDENT") holds.push(`${key}:${r.status}`);
  }
  return {
    version: TPI729_48_RESIDUAL_RESEARCH_VERSION,
    baselineHead: TPI729_48_RESIDUAL_RESEARCH_BASELINE_HEAD,
    byStatus,
    byClass,
    autR1Current,
    holds,
  };
}
