/**
 * Chief Orchestrator P0 — runner (Case → Task).
 * Wyłącznie public API ekspertów. Zero logiki domenowej.
 */

import { analyzeRealCostFromExperts } from "@/lib/cost-expert";
import {
  analyzeExecutionFromOfferBoq,
  defaultExecutionExpertBusinessProfile,
} from "@/lib/execution-expert";
import { analyzeMaterialsFromExecution } from "@/lib/material-expert";
import { analyzeOfferFromCost, defaultOfferStrategyParams } from "@/lib/offer-expert";
import { analyzeMarketPricingFromMaterials } from "@/lib/pricing-expert";
import { assembleDecydentDossier } from "./dossier";
import {
  gateCost,
  gateExecution,
  gateMaterials,
  gateOffer,
  gatePricingNeedsReturn,
} from "./gates";
import type {
  ChiefCaseStatus,
  ChiefExpertSnapshots,
  ChiefOrchestratorInput,
  ChiefOrchestratorResult,
  ChiefTaskId,
  ChiefTaskRecord,
} from "./types";

const DF_MAX_RETURN_LOOPS = 1;

function isoNow(override?: string): string {
  return override ?? new Date().toISOString();
}

function makeTasks(): ChiefTaskRecord[] {
  const ids: ChiefTaskId[] = [
    "T1_execution",
    "T2_materials",
    "T3_pricing",
    "T2_materials_return",
    "T3_pricing_return",
    "T4_cost",
    "T5_offer",
    "T6_assemble_dossier",
  ];
  return ids.map((id) => ({
    id,
    status: "pending",
    startedAt: null,
    finishedAt: null,
    failReasonPl: null,
  }));
}

function task(tasks: ChiefTaskRecord[], id: ChiefTaskId): ChiefTaskRecord {
  const t = tasks.find((x) => x.id === id);
  if (!t) throw new Error(`Chief: missing task ${id}`);
  return t;
}

function startTask(t: ChiefTaskRecord, at: string): void {
  t.status = "running";
  t.startedAt = at;
}

function doneTask(t: ChiefTaskRecord, at: string): void {
  t.status = "done";
  t.finishedAt = at;
}

function failTask(t: ChiefTaskRecord, at: string, reasonPl: string): void {
  t.status = "failed";
  t.finishedAt = at;
  t.failReasonPl = reasonPl;
}

function skipRemaining(tasks: ChiefTaskRecord[], fromExclusive: ChiefTaskId): void {
  const order = tasks.map((t) => t.id);
  const idx = order.indexOf(fromExclusive);
  for (let i = idx + 1; i < tasks.length; i++) {
    const t = tasks[i]!;
    if (t.status === "pending") t.status = "skipped";
  }
}

function finishBlocked(
  opts: {
    caseId: string;
    createdAt: string;
    finishedAt: string;
    tasks: ChiefTaskRecord[];
    experts: ChiefExpertSnapshots;
    loopCount: number;
    notes: string[];
  },
): ChiefOrchestratorResult {
  const status: ChiefCaseStatus = "blocked";
  const dossier = assembleDecydentDossier({
    caseId: opts.caseId,
    status,
    createdAt: opts.createdAt,
    finishedAt: opts.finishedAt,
    loopCount: opts.loopCount,
    tasks: opts.tasks,
    experts: opts.experts,
    orchestrationNotesPl: opts.notes,
  });
  return {
    caseId: opts.caseId,
    status,
    tasks: opts.tasks,
    loopCount: opts.loopCount,
    experts: opts.experts,
    dossier,
  };
}

/**
 * Uruchamia łańcuch T1→T5 (+ opcjonalny LOOP PE→ME N=1) i składa dossier.
 */
export function runChiefOrchestrator(
  input: ChiefOrchestratorInput,
): ChiefOrchestratorResult {
  const createdAt = isoNow(input.nowIso);
  const maxLoops = input.maxReturnLoops ?? DF_MAX_RETURN_LOOPS;
  const tasks = makeTasks();
  const notes: string[] = [];
  const experts: ChiefExpertSnapshots = {
    execution: null,
    materials: null,
    pricing: null,
    cost: null,
    offer: null,
  };
  let loopCount = 0;
  let caseStatus: ChiefCaseStatus = "running";

  // ── T1 Execution ──────────────────────────────────────────
  {
    const t = task(tasks, "T1_execution");
    startTask(t, createdAt);
    experts.execution = analyzeExecutionFromOfferBoq(
      input.offerBoq,
      input.executionProfile ?? defaultExecutionExpertBusinessProfile(),
    );
    const g = gateExecution(experts.execution);
    notes.push(g.reasonPl);
    if (!g.pass) {
      failTask(t, isoNow(input.nowIso), g.reasonPl);
      skipRemaining(tasks, "T1_execution");
      return finishBlocked({
        caseId: input.caseId,
        createdAt,
        finishedAt: isoNow(input.nowIso),
        tasks,
        experts,
        loopCount,
        notes,
      });
    }
    doneTask(t, isoNow(input.nowIso));
  }

  // ── T2 Materials ──────────────────────────────────────────
  {
    const t = task(tasks, "T2_materials");
    startTask(t, isoNow(input.nowIso));
    experts.materials = analyzeMaterialsFromExecution(experts.execution!);
    const g = gateMaterials(experts.materials);
    notes.push(g.reasonPl);
    if (!g.pass) {
      failTask(t, isoNow(input.nowIso), g.reasonPl);
      skipRemaining(tasks, "T2_materials");
      return finishBlocked({
        caseId: input.caseId,
        createdAt,
        finishedAt: isoNow(input.nowIso),
        tasks,
        experts,
        loopCount,
        notes,
      });
    }
    doneTask(t, isoNow(input.nowIso));
  }

  // ── T3 Pricing (+ LOOP) ───────────────────────────────────
  {
    const t3 = task(tasks, "T3_pricing");
    startTask(t3, isoNow(input.nowIso));
    experts.pricing = analyzeMarketPricingFromMaterials(
      experts.materials!,
      input.pricing,
    );
    doneTask(t3, isoNow(input.nowIso));
    notes.push(
      experts.pricing.returnToMaterialExpert
        ? "G-PE-LOOP: returnToMaterialExpert=true"
        : "G-PE-FORWARD: brak RETURN",
    );

    while (gatePricingNeedsReturn(experts.pricing) && loopCount < maxLoops) {
      caseStatus = "waiting_return";
      loopCount += 1;
      notes.push(`LOOP PE→ME iteracja ${loopCount}/${maxLoops}`);

      const t2r = task(tasks, "T2_materials_return");
      startTask(t2r, isoNow(input.nowIso));
      // EE immutable — ponowne ME na tym samym execution
      experts.materials = analyzeMaterialsFromExecution(experts.execution!);
      const gMe = gateMaterials(experts.materials);
      notes.push(`LOOP ${gMe.reasonPl}`);
      if (!gMe.pass) {
        failTask(t2r, isoNow(input.nowIso), gMe.reasonPl);
        skipRemaining(tasks, "T2_materials_return");
        return finishBlocked({
          caseId: input.caseId,
          createdAt,
          finishedAt: isoNow(input.nowIso),
          tasks,
          experts,
          loopCount,
          notes,
        });
      }
      doneTask(t2r, isoNow(input.nowIso));

      const t3r = task(tasks, "T3_pricing_return");
      startTask(t3r, isoNow(input.nowIso));
      experts.pricing = analyzeMarketPricingFromMaterials(
        experts.materials!,
        input.pricing,
      );
      doneTask(t3r, isoNow(input.nowIso));
      caseStatus = "running";
    }

    // Po wyczerpaniu LOOP: nie hard-block na residual returnToMaterialExpert
    // (np. availability hints). Twardy stop należy do G-COST / G-OFFER.
    if (gatePricingNeedsReturn(experts.pricing!)) {
      notes.push(
        `G-PE-FORWARD after LOOP N=${maxLoops}: residual returnToMaterialExpert recorded — proceeding to Cost`,
      );
    }

    if (loopCount === 0) {
      task(tasks, "T2_materials_return").status = "skipped";
      task(tasks, "T3_pricing_return").status = "skipped";
    }
  }

  // ── T4 Cost ───────────────────────────────────────────────
  {
    const t = task(tasks, "T4_cost");
    startTask(t, isoNow(input.nowIso));
    experts.cost = analyzeRealCostFromExperts({
      execution: experts.execution!,
      materials: experts.materials!,
      pricing: experts.pricing!,
      company: input.company,
    });
    const g = gateCost(experts.cost);
    notes.push(g.reasonPl);
    if (!g.pass) {
      failTask(t, isoNow(input.nowIso), g.reasonPl);
      skipRemaining(tasks, "T4_cost");
      return finishBlocked({
        caseId: input.caseId,
        createdAt,
        finishedAt: isoNow(input.nowIso),
        tasks,
        experts,
        loopCount,
        notes,
      });
    }
    doneTask(t, isoNow(input.nowIso));
  }

  // ── T5 Offer ──────────────────────────────────────────────
  {
    const t = task(tasks, "T5_offer");
    startTask(t, isoNow(input.nowIso));
    experts.offer = analyzeOfferFromCost(
      experts.cost!,
      input.offerStrategy ?? defaultOfferStrategyParams(),
    );
    const g = gateOffer(experts.offer);
    notes.push(g.reasonPl);
    if (!g.pass) {
      failTask(t, isoNow(input.nowIso), g.reasonPl);
      skipRemaining(tasks, "T5_offer");
      return finishBlocked({
        caseId: input.caseId,
        createdAt,
        finishedAt: isoNow(input.nowIso),
        tasks,
        experts,
        loopCount,
        notes,
      });
    }
    doneTask(t, isoNow(input.nowIso));
  }

  // ── T6 Assemble dossier ───────────────────────────────────
  {
    const t = task(tasks, "T6_assemble_dossier");
    startTask(t, isoNow(input.nowIso));
    caseStatus = "ready_for_decydent";
    const finishedAt = isoNow(input.nowIso);
    const dossier = assembleDecydentDossier({
      caseId: input.caseId,
      status: caseStatus,
      createdAt,
      finishedAt,
      loopCount,
      tasks,
      experts,
      orchestrationNotesPl: notes,
    });
    doneTask(t, finishedAt);
    return {
      caseId: input.caseId,
      status: caseStatus,
      tasks,
      loopCount,
      experts,
      dossier,
    };
  }
}
