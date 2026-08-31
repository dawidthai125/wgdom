/**
 * IK F5 Auto Gap Resolution — DETECT → DIAGNOSE → RESOLVE → VALIDATE → APPLY → RE-F5 → GATE → LOOP
 *
 * ZERO auto-Accept · ZERO Catalog/PM/TechnologyPack persist · ZERO P7 persist · ZERO G3
 * ZERO invent · ZERO LABOR_ONLY from MISSING_BOM · ZERO cross-dwelling BOM copy
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { computePositionCostShadowAndGate } from "@/lib/tender-position-cost/bid-position-cost-cutover";
import type {
  ShadowBoqPositionCostResult,
  ShadowGapCode,
  ShadowPositionCostLineResult,
} from "@/lib/tender-position-cost/boq-shadow-adapter";
import type { IkDocumentExpertReport } from "./ik-document-expert";
import type { IkLaborExpertReport } from "./ik-labor-expert";
import { buildApfEphemeralCostBasisByLineId } from "./ik-labor-expert";
import type { IkMaterialExpertReport } from "./ik-material-expert";
import {
  ikF5EphemeralBomCompositeKey,
  runIkP7PositionCostBid,
  type IkP7PositionCostBidReport,
} from "./ik-p7-position-cost-bid";
import {
  runIkBomGapResearch,
  type IkBomGapResearchPorts,
  type IkEphemeralBomBasis,
} from "./ik-bom-gap-research";

export const IK_F5_AUTO_GAP_MAX_ITERATIONS_DEFAULT = 3 as const;

export type IkF5AutoGapStopReason =
  | "COMPLETE"
  | "NO_PROGRESS"
  | "OWNER_REQUIRED"
  | "MAX_ITER"
  | "HOLD"
  | "CONFIDENCE"
  | "BUDGET";

export type IkF5AutoGapCutoverPolicyNote =
  | "AUTO_RESOLVED_READY_FOR_CUTOVER"
  | "READY_BUT_OWNER_ACCEPT_REQUIRED"
  | "CUTOVER_FAIL_RESIDUAL_GAPS"
  | "NO_CHANGE";

export type IkF5AutoGapDetectedLine = {
  dwellingId: string;
  lineId: string;
  lp: string;
  description: string;
  workId: string | null;
  unit: string | null;
  gapCode: ShadowGapCode;
  positionComplete: boolean;
};

export type IkF5AutoGapIteration = {
  iteration: number;
  detectedGapCount: number;
  gapsByCode: Record<string, number>;
  resolvedCount: number;
  candidateCount: number;
  rejectedCount: number;
  heldCount: number;
  researchExecuted: boolean;
  httpCalls: number;
  fingerprint: string;
  progress: boolean;
  f5Summary: {
    billable: number;
    complete: number;
    gaps: number;
  };
  cutoverPass: boolean;
  packageGatePass: boolean | null;
  stopReason: IkF5AutoGapStopReason | null;
  holds: Array<{
    dwellingId: string;
    lineId: string;
    gapCode: string;
    reasonPl: string;
    confidence: number | null;
    evidence: string[];
    suggestedNextActionPl: string;
  }>;
};

export type IkF5AutoGapResolutionResult = {
  iterations: IkF5AutoGapIteration[];
  finalP7: IkP7PositionCostBidReport;
  remainingGaps: IkF5AutoGapDetectedLine[];
  stopReason: IkF5AutoGapStopReason;
  researchExecuted: boolean;
  httpCalls: number;
  cutoverPolicyNote: IkF5AutoGapCutoverPolicyNote;
  cloudWrite: false;
  catalogWrite: false;
  priceMemoryWrite: false;
  invent: false;
  summaryPl: string;
};

export type IkF5AutoGapFlags = {
  /** When false, skip BOM research (still detect). Default true. */
  enableBomResearch?: boolean;
  /** Reuse APF ephemeral from labor report. Default true. */
  enableLaborApfReuse?: boolean;
  /** Allow optional injected research ports (tests). Default true for BOM ports. */
  enableMaterialReuse?: boolean;
};

export type RunIkF5AutoGapResolutionOpts = {
  item: TenderPipelineItem;
  expert: IkDocumentExpertReport;
  package?: TenderPackage | null;
  store?: WorkCatalogStore;
  nowMs?: number;
  initialP7: IkP7PositionCostBidReport;
  /** Optional initial shadow (legacy); multi uses package dwellings via re-P7. */
  initialShadow?: ShadowBoqPositionCostResult | null;
  labor?: IkLaborExpertReport | null;
  material?: IkMaterialExpertReport | null;
  flags?: IkF5AutoGapFlags;
  maxIterations?: number;
  bomResearchPorts?: IkBomGapResearchPorts;
  /**
   * Test/port: pre-seeded ephemeral BOM (composite key). Merged with research results.
   * Never persists.
   */
  seedEphemeralBomByCompositeKey?: ReadonlyMap<string, IkEphemeralBomBasis> | null;
};

function primaryGapCode(line: ShadowPositionCostLineResult): ShadowGapCode {
  if (line.gaps.length > 0) return line.gaps[0]!;
  switch (line.identity.status) {
    case "NO_IDENTITY":
      return "BRAK_IDENTYFIKACJI_ROBOTY";
    case "AMBIGUOUS":
      return "NIEJEDNOZNACZNA_ROBOTA";
    case "INVALID_UNIT":
      return "NIEPRAWIDLOWA_JEDNOSTKA";
    case "EQUIPMENT_GAP":
      return "EQUIPMENT_OUT_OF_SCOPE";
    case "TRANSPORT_GAP":
      return "TRANSPORT_OUT_OF_SCOPE";
    case "AUXILIARY_GAP":
      return "AUXILIARY_OUT_OF_SCOPE";
    default:
      return "BRAK_STAWKI_ROBOT";
  }
}

function isGapLine(line: ShadowPositionCostLineResult): boolean {
  if (line.identity.status === "NOISE_SKIP") return false;
  return !line.positionComplete || line.gaps.length > 0;
}

function gapFingerprint(lines: IkF5AutoGapDetectedLine[]): string {
  const parts = lines
    .map(
      (l) =>
        `${l.dwellingId}|${l.lineId}|${l.workId ?? ""}|${l.gapCode}`,
    )
    .sort();
  return parts.join(";;");
}

function countByCode(lines: IkF5AutoGapDetectedLine[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lines) {
    out[l.gapCode] = (out[l.gapCode] ?? 0) + 1;
  }
  return out;
}

function ownerRequiredGap(code: ShadowGapCode): boolean {
  switch (code) {
    case "NIEJEDNOZNACZNA_ROBOTA":
    case "NIEPRAWIDLOWA_JEDNOSTKA":
    case "EQUIPMENT_OUT_OF_SCOPE":
    case "EQUIPMENT_OWNER_INPUT_INVALID":
    case "TRANSPORT_OUT_OF_SCOPE":
    case "TRANSPORT_OWNER_INPUT_INVALID":
    case "BOQ_QUANTITY_HOLD":
    case "NIEPRAWIDLOWA_ILOSC":
    case "AUXILIARY_OUT_OF_SCOPE":
    case "BRAK_KONWERSJI_JEDNOSTEK":
    case "BRAK_NORMY_MATERIALOWEJ":
      return true;
    default:
      return false;
  }
}

function detectGapsFromShadowMaps(
  shadowsByDwelling: Map<string, ShadowBoqPositionCostResult>,
): IkF5AutoGapDetectedLine[] {
  const out: IkF5AutoGapDetectedLine[] = [];
  for (const [dwellingId, shadow] of shadowsByDwelling) {
    for (const line of shadow.lines) {
      if (!isGapLine(line)) continue;
      out.push({
        dwellingId,
        lineId: line.lineId,
        lp: line.lp,
        description: line.description,
        workId: line.identity.workId,
        unit: line.identity.unit,
        gapCode: primaryGapCode(line),
        positionComplete: line.positionComplete,
      });
    }
  }
  return out;
}

/**
 * Build per-dwelling shadows via P7 internals: re-use runIkP7 and package evaluation
 * by reading shadows from evaluateDwelling — imported lazily to avoid cycles in tests.
 */
function collectShadowsForDetect(opts: {
  item: TenderPipelineItem;
  expert: IkDocumentExpertReport;
  package: TenderPackage | null;
  store: WorkCatalogStore;
  nowMs: number;
  labor: IkLaborExpertReport | null | undefined;
  ephemeralBom: Map<string, IkEphemeralBomBasis>;
}): Map<string, ShadowBoqPositionCostResult> {
  const map = new Map<string, ShadowBoqPositionCostResult>();
  const pkg = opts.package;

  const bomForDwelling = (dw: string) => {
    const m = new Map<string, IkEphemeralBomBasis>();
    const prefix = `${dw}::`;
    for (const [k, v] of opts.ephemeralBom) {
      if (k.startsWith(prefix)) m.set(k.slice(prefix.length), v);
      else if (v.dwellingId === dw) m.set(v.lineId, v);
    }
    return m;
  };

  if (pkg?.mode === "multi") {
    for (const d of pkg.dwellings) {
      if (!d.offerBoq?.lines?.length) continue;
      const dw = normalizeDwellingId(d.dwellingId);
      const { shadow } = computePositionCostShadowAndGate({
        doc: d.offerBoq,
        store: opts.store,
        nowMs: opts.nowMs,
        tenderId: opts.item.id || opts.item.tenderId,
        dwellingId: dw,
        ensureOwnerQuestions: false,
        boqDependencyGraph:
          opts.expert.boqDependencyGraphsByDwelling?.[dw]
          ?? opts.expert.boqDependencyGraph
          ?? null,
        ephemeralCostBasisByLineId: buildApfEphemeralCostBasisByLineId(
          opts.labor,
          dw,
        ),
        ephemeralBomBasisByLineId: bomForDwelling(dw),
      });
      map.set(dw, shadow);
    }
    return map;
  }

  const doc = opts.expert.offerBoq;
  if (doc?.lines?.length) {
    const dw = "DEFAULT";
    const { shadow } = computePositionCostShadowAndGate({
      doc,
      store: opts.store,
      nowMs: opts.nowMs,
      tenderId: opts.item.id || opts.item.tenderId,
      dwellingId: dw,
      ensureOwnerQuestions: false,
      boqDependencyGraph: opts.expert.boqDependencyGraph ?? null,
      ephemeralCostBasisByLineId: buildApfEphemeralCostBasisByLineId(
        opts.labor,
        null,
      ),
      ephemeralBomBasisByLineId: bomForDwelling(dw),
    });
    map.set(dw, shadow);
  }
  return map;
}

function suggestedAction(code: ShadowGapCode): string {
  if (code === "BRAK_TECHNOLOGII_BOM") {
    return "Uzupełnij TechnologyPack (Owner Accept) lub dostarcz norm evidence.";
  }
  if (code.startsWith("EQUIPMENT") || code.startsWith("TRANSPORT")) {
    return "Owner Input — stawka sprzętu/transportu.";
  }
  if (code === "BRAK_STAWKI_ROBOT" || code === "PRZETERMINOWANA_STAWKA_ROBOT") {
    return "Owner Accept → OUR RATE (P5).";
  }
  if (
    code === "BRAK_CENY_MATERIALU"
    || code === "PRZETERMINOWANA_CENA_MATERIALU"
    || code === "BRAK_MATERIAL_KEY"
  ) {
    return "Owner Accept → Price Memory (P6).";
  }
  return "Owner Review — bez invent.";
}

/**
 * Central Auto Gap orchestrator.
 */
export function runIkF5AutoGapResolution(
  opts: RunIkF5AutoGapResolutionOpts,
): IkF5AutoGapResolutionResult {
  const maxIterations = Math.max(1, opts.maxIterations ?? IK_F5_AUTO_GAP_MAX_ITERATIONS_DEFAULT);
  const nowMs = opts.nowMs ?? Date.now();
  const store = opts.store ?? loadWorkCatalogStoreLocal();
  const pkg = opts.package ?? null;
  const flags = opts.flags ?? {};
  const enableBom = flags.enableBomResearch !== false;
  const enableLaborApf = flags.enableLaborApfReuse !== false;

  const ephemeralBom = new Map<string, IkEphemeralBomBasis>();
  if (opts.seedEphemeralBomByCompositeKey) {
    for (const [k, v] of opts.seedEphemeralBomByCompositeKey) {
      ephemeralBom.set(k, v);
    }
  }

  const attemptedKeys = new Set<string>();
  const iterations: IkF5AutoGapIteration[] = [];
  let finalP7 = opts.initialP7;
  let researchExecuted = false;
  let httpCalls = 0;
  let prevFingerprint = "";
  let stopReason: IkF5AutoGapStopReason = "NO_PROGRESS";

  for (let iter = 1; iter <= maxIterations; iter++) {
    const shadows = collectShadowsForDetect({
      item: opts.item,
      expert: opts.expert,
      package: pkg,
      store,
      nowMs,
      labor: enableLaborApf ? opts.labor : null,
      ephemeralBom,
    });
    const detected = detectGapsFromShadowMaps(shadows);
    const fingerprint = gapFingerprint(detected);
    const gapsByCode = countByCode(detected);

    let resolvedCount = 0;
    let candidateCount = 0;
    let rejectedCount = 0;
    let heldCount = 0;
    let iterResearch = false;
    const holds: IkF5AutoGapIteration["holds"] = [];

    if (detected.length === 0) {
      // Re-run P7 to confirm gates with current ephemeral state
      finalP7 = runIkP7PositionCostBid({
        item: opts.item,
        expert: opts.expert,
        package: pkg,
        store,
        nowMs,
        labor: enableLaborApf ? opts.labor : null,
        ephemeralBomBasisByCompositeKey: ephemeralBom,
      });
      const cutoverPass = finalP7.cutoverGatePass === true;
      const packagePass = finalP7.packageGatePass;
      const packageOk = packagePass == null ? true : packagePass === true;
      stopReason =
        cutoverPass && packageOk ? "COMPLETE" : "OWNER_REQUIRED";
      iterations.push({
        iteration: iter,
        detectedGapCount: 0,
        gapsByCode: {},
        resolvedCount: 0,
        candidateCount: 0,
        rejectedCount: 0,
        heldCount: 0,
        researchExecuted: false,
        httpCalls: 0,
        fingerprint,
        progress: true,
        f5Summary: {
          billable: finalP7.billableLineCount,
          complete: finalP7.completeLineCount,
          gaps: finalP7.gapLineCount,
        },
        cutoverPass,
        packageGatePass: packagePass,
        stopReason,
        holds: [],
      });
      break;
    }

    // Owner-required only?
    const allOwner = detected.every((d) => ownerRequiredGap(d.gapCode));
    const hasBomGaps = detected.some((d) => d.gapCode === "BRAK_TECHNOLOGII_BOM");
    const hasLaborGaps = detected.some(
      (d) =>
        d.gapCode === "BRAK_STAWKI_ROBOT"
        || d.gapCode === "PRZETERMINOWANA_STAWKA_ROBOT",
    );
    const hasIdentityGaps = detected.some(
      (d) => d.gapCode === "BRAK_IDENTYFIKACJI_ROBOTY",
    );

    if (allOwner && !hasBomGaps && !hasLaborGaps && !hasIdentityGaps) {
      for (const d of detected) {
        heldCount += 1;
        holds.push({
          dwellingId: d.dwellingId,
          lineId: d.lineId,
          gapCode: d.gapCode,
          reasonPl: "Wymaga Owner Input — Auto Gap nie omija policy HOLD.",
          confidence: null,
          evidence: [],
          suggestedNextActionPl: suggestedAction(d.gapCode),
        });
      }
      stopReason = "OWNER_REQUIRED";
      iterations.push({
        iteration: iter,
        detectedGapCount: detected.length,
        gapsByCode,
        resolvedCount: 0,
        candidateCount: 0,
        rejectedCount: 0,
        heldCount,
        researchExecuted: false,
        httpCalls: 0,
        fingerprint,
        progress: false,
        f5Summary: {
          billable: finalP7.billableLineCount,
          complete: finalP7.completeLineCount,
          gaps: detected.length,
        },
        cutoverPass: false,
        packageGatePass: finalP7.packageGatePass,
        stopReason,
        holds,
      });
      break;
    }

    // DISPATCH / RESOLVE
    for (const d of detected) {
      const attemptKey = `${d.dwellingId}|${d.lineId}|${d.gapCode}|${d.workId ?? ""}`;
      if (attemptedKeys.has(attemptKey)) {
        heldCount += 1;
        holds.push({
          dwellingId: d.dwellingId,
          lineId: d.lineId,
          gapCode: d.gapCode,
          reasonPl: "Duplikat próby resolvera — NO_PROGRESS candidate.",
          confidence: null,
          evidence: [],
          suggestedNextActionPl: suggestedAction(d.gapCode),
        });
        continue;
      }

      if (ownerRequiredGap(d.gapCode) && d.gapCode !== "BRAK_TECHNOLOGII_BOM") {
        attemptedKeys.add(attemptKey);
        heldCount += 1;
        holds.push({
          dwellingId: d.dwellingId,
          lineId: d.lineId,
          gapCode: d.gapCode,
          reasonPl: "Policy HOLD / Owner Input.",
          confidence: null,
          evidence: [],
          suggestedNextActionPl: suggestedAction(d.gapCode),
        });
        continue;
      }

      if (
        (d.gapCode === "BRAK_STAWKI_ROBOT"
          || d.gapCode === "PRZETERMINOWANA_STAWKA_ROBOT")
        && enableLaborApf
      ) {
        attemptedKeys.add(attemptKey);
        const apf = buildApfEphemeralCostBasisByLineId(opts.labor, d.dwellingId);
        if (apf.has(d.lineId)) {
          // Already wired via labor on re-P7 — count as resolved attempt
          resolvedCount += 1;
          candidateCount += 1;
        } else {
          heldCount += 1;
          holds.push({
            dwellingId: d.dwellingId,
            lineId: d.lineId,
            gapCode: d.gapCode,
            reasonPl:
              "Brak APF ephemeral / OUR RATE — wymaga Owner Accept (bez auto-Accept).",
            confidence: null,
            evidence: [],
            suggestedNextActionPl: suggestedAction(d.gapCode),
          });
        }
        continue;
      }

      if (
        d.gapCode === "BRAK_CENY_MATERIALU"
        || d.gapCode === "PRZETERMINOWANA_CENA_MATERIALU"
        || d.gapCode === "BRAK_MATERIAL_KEY"
      ) {
        attemptedKeys.add(attemptKey);
        // Material Accept required for PM write — HOLD without invent
        heldCount += 1;
        holds.push({
          dwellingId: d.dwellingId,
          lineId: d.lineId,
          gapCode: d.gapCode,
          reasonPl:
            "Material research candidate wymaga Owner Accept → Price Memory (bez auto-write).",
          confidence: null,
          evidence: opts.material ? ["material-expert-present"] : [],
          suggestedNextActionPl: suggestedAction(d.gapCode),
        });
        continue;
      }

      if (d.gapCode === "BRAK_IDENTYFIKACJI_ROBOTY") {
        attemptedKeys.add(attemptKey);
        heldCount += 1;
        holds.push({
          dwellingId: d.dwellingId,
          lineId: d.lineId,
          gapCode: d.gapCode,
          reasonPl: "Identity GAP — Owner map / CREATE_NEW (bez auto-Accept).",
          confidence: null,
          evidence: [],
          suggestedNextActionPl: suggestedAction(d.gapCode),
        });
        continue;
      }

      if (d.gapCode === "BRAK_TECHNOLOGII_BOM" && enableBom) {
        attemptedKeys.add(attemptKey);
        if (!d.workId) {
          heldCount += 1;
          holds.push({
            dwellingId: d.dwellingId,
            lineId: d.lineId,
            gapCode: d.gapCode,
            reasonPl: "BOM GAP bez workId — HOLD.",
            confidence: null,
            evidence: [],
            suggestedNextActionPl: suggestedAction(d.gapCode),
          });
          continue;
        }
        if (!d.dwellingId) {
          heldCount += 1;
          holds.push({
            dwellingId: "",
            lineId: d.lineId,
            gapCode: d.gapCode,
            reasonPl: "Brak dwellingId — HOLD.",
            confidence: null,
            evidence: [],
            suggestedNextActionPl: "Uzupełnij multi-dwelling map.",
          });
          continue;
        }

        iterResearch = true;
        researchExecuted = true;
        const result = runIkBomGapResearch(
          {
            tenderId: String(opts.item.id || opts.item.tenderId || ""),
            dwellingId: d.dwellingId,
            lineId: d.lineId,
            lp: d.lp,
            workId: d.workId,
            unit: d.unit ?? "",
            quantity: 1,
            description: d.description,
            gapCode: "BRAK_TECHNOLOGII_BOM",
          },
          { ...opts.bomResearchPorts, nowMs },
        );

        if (result.status === "ACTIVE_OK") {
          resolvedCount += 1;
          continue;
        }
        if (result.status === "CANDIDATE") {
          candidateCount += 1;
          const key = ikF5EphemeralBomCompositeKey(d.dwellingId, d.lineId);
          ephemeralBom.set(key, result.ephemeral);
          resolvedCount += 1;
          continue;
        }
        if (result.status === "HOLD") {
          heldCount += 1;
          if (result.reason === "CONFIDENCE") stopReason = "CONFIDENCE";
          holds.push({
            dwellingId: d.dwellingId,
            lineId: d.lineId,
            gapCode: d.gapCode,
            reasonPl: result.messagePl,
            confidence: null,
            evidence: result.rejects,
            suggestedNextActionPl: suggestedAction(d.gapCode),
          });
          continue;
        }
        rejectedCount += 1;
        holds.push({
          dwellingId: d.dwellingId,
          lineId: d.lineId,
          gapCode: d.gapCode,
          reasonPl: result.messagePl,
          confidence: null,
          evidence: result.rejects,
          suggestedNextActionPl: suggestedAction(d.gapCode),
        });
        continue;
      }

      // Default HOLD
      attemptedKeys.add(attemptKey);
      heldCount += 1;
      holds.push({
        dwellingId: d.dwellingId,
        lineId: d.lineId,
        gapCode: d.gapCode,
        reasonPl: "Brak legalnego resolvera Auto Gap.",
        confidence: null,
        evidence: [],
        suggestedNextActionPl: suggestedAction(d.gapCode),
      });
    }

    // RE-F5
    finalP7 = runIkP7PositionCostBid({
      item: opts.item,
      expert: opts.expert,
      package: pkg,
      store,
      nowMs,
      labor: enableLaborApf ? opts.labor : null,
      ephemeralBomBasisByCompositeKey: ephemeralBom,
    });

    const shadowsAfter = collectShadowsForDetect({
      item: opts.item,
      expert: opts.expert,
      package: pkg,
      store,
      nowMs,
      labor: enableLaborApf ? opts.labor : null,
      ephemeralBom,
    });
    const detectedAfter = detectGapsFromShadowMaps(shadowsAfter);
    const fpAfter = gapFingerprint(detectedAfter);
    const progress = fpAfter !== fingerprint && detectedAfter.length < detected.length;

    const cutoverPass = finalP7.cutoverGatePass === true;
    const packagePass = finalP7.packageGatePass;
    const packageOk = packagePass == null ? true : packagePass === true;

    let iterStop: IkF5AutoGapStopReason | null = null;
    if (detectedAfter.length === 0 && cutoverPass && packageOk) {
      iterStop = "COMPLETE";
      stopReason = "COMPLETE";
    } else if (!progress && fpAfter === fingerprint) {
      iterStop = heldCount > 0 ? "HOLD" : "NO_PROGRESS";
      stopReason = iterStop;
    } else if (iter === maxIterations) {
      iterStop = "MAX_ITER";
      stopReason = "MAX_ITER";
    }

    iterations.push({
      iteration: iter,
      detectedGapCount: detected.length,
      gapsByCode,
      resolvedCount,
      candidateCount,
      rejectedCount,
      heldCount,
      researchExecuted: iterResearch,
      httpCalls: 0,
      fingerprint,
      progress,
      f5Summary: {
        billable: finalP7.billableLineCount,
        complete: finalP7.completeLineCount,
        gaps: detectedAfter.length,
      },
      cutoverPass,
      packageGatePass: packagePass,
      stopReason: iterStop,
      holds,
    });

    if (iterStop === "COMPLETE" || iterStop === "NO_PROGRESS" || iterStop === "HOLD") {
      break;
    }
    if (iterStop === "MAX_ITER") break;

    if (fpAfter === prevFingerprint && !progress) {
      stopReason = "NO_PROGRESS";
      break;
    }
    prevFingerprint = fpAfter;
  }

  if (iterations.length >= maxIterations && stopReason !== "COMPLETE") {
    stopReason = stopReason === "NO_PROGRESS" ? "MAX_ITER" : stopReason;
  }

  const remainingShadows = collectShadowsForDetect({
    item: opts.item,
    expert: opts.expert,
    package: pkg,
    store,
    nowMs,
    labor: enableLaborApf ? opts.labor : null,
    ephemeralBom,
  });
  const remainingGaps = detectGapsFromShadowMaps(remainingShadows);

  let cutoverPolicyNote: IkF5AutoGapCutoverPolicyNote = "NO_CHANGE";
  if (stopReason === "COMPLETE" && finalP7.cutoverGatePass) {
    cutoverPolicyNote = "AUTO_RESOLVED_READY_FOR_CUTOVER";
  } else if (
    remainingGaps.length === 0
    && finalP7.completeLineCount === finalP7.billableLineCount
    && !finalP7.cutoverGatePass
  ) {
    cutoverPolicyNote = "READY_BUT_OWNER_ACCEPT_REQUIRED";
  } else if (remainingGaps.length > 0) {
    cutoverPolicyNote = "CUTOVER_FAIL_RESIDUAL_GAPS";
  }

  const resolvedN =
    Math.max(0, opts.initialP7.gapLineCount - remainingGaps.length);
  const summaryPl =
    remainingGaps.length === 0
      ? `IK automatycznie uzupełnił ${resolvedN} z ${opts.initialP7.gapLineCount} GAP.`
      : `IK znalazł kandydatów/ephemeral dla części luk; ${remainingGaps.length} pozycji wymaga Owner Review.`;

  return {
    iterations,
    finalP7,
    remainingGaps,
    stopReason,
    researchExecuted,
    httpCalls,
    cutoverPolicyNote,
    cloudWrite: false,
    catalogWrite: false,
    priceMemoryWrite: false,
    invent: false,
    summaryPl,
  };
}

/** Test helper — assert invent never true on ephemeral map. */
export function assertNoInventEphemeralBom(
  map: ReadonlyMap<string, IkEphemeralBomBasis>,
): void {
  for (const v of map.values()) {
    if (v.invent !== false) {
      throw new Error("INVENT_FORBIDDEN: ephemeral BOM invent flag");
    }
  }
}
