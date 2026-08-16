/**
 * P5.26-E — host-scoped INTERNAL-FIRST safety gates.
 *
 * QUALITY > COVERAGE. Reject unsafe object / paint-type collisions.
 * Does NOT widen global semantic thresholds.
 * Pure · ZERO HTTP · ZERO Accept · ZERO invent.
 */

import { softInternalFirstText } from "./internal-first-text";

export const P526E_MONTAZ_GRZEJNIKA_WORK_ID = "cc-p0c-w1-montaz-grzejnika-szt";
export const P526E_MALOWANIE_EMULSJA_WORK_ID = "cc-p0c-w1-malowanie-emulsja-m2";
export const P526E_WYKUCIE_BRUZD_WORK_ID = "cc-p0c-w1-wykucie-bruzd";
export const P526E_ZAPRAWIANIE_BRUZD_WORK_ID = "cc-p0c-w1-zaprawianie-bruzd";

export type HostObjectSafetyResult = {
  ok: boolean;
  reasonCode?: string;
};

function soft(s: unknown): string {
  return softInternalFirstText(s);
}

/** Positive emulsja markers required for SAFE match to emulsja host. */
function hasEmulsjaMarker(q: string): boolean {
  // soft(«emulsyjnymi») = «emulsyjnymi» (emulsy…), soft(«emulsją») = «emulsja»
  return q.includes("emuls");
}

/** Paint-type conflicts for «Malowanie emulsją» PACKAGE host. */
function hasEmulsjaPaintConflict(q: string): boolean {
  return (
    q.includes("wapienn") ||
    q.includes("wapno") ||
    q.includes("klejow") ||
    q.includes("olejn") ||
    q.includes("lakier") ||
    q.includes("stolark") ||
    q.includes("farba elewacyj") ||
    q.includes("malowanie elewacyj") ||
    q.includes("elewacyjn")
  );
}

/** Conflict objects for «Montaż grzejnika» PACKAGE host (query already soft-normalized). */
function hasGrzejnikObjectConflict(q: string): boolean {
  return (
    q.includes("glowic") ||
    q.includes("termostat") ||
    q.includes("zawor termostat") ||
    q.includes("regulator") ||
    q.includes("element regulacyj")
  );
}

function isMontazGrzejnikaHost(workId: string, namePl: string): boolean {
  if (workId === P526E_MONTAZ_GRZEJNIKA_WORK_ID) return true;
  const n = soft(namePl);
  return n === "montaz grzejnika" || /^montaz grzejnika\b/.test(n);
}

function isMalowanieEmulsjaHost(workId: string, namePl: string): boolean {
  if (workId === P526E_MALOWANIE_EMULSJA_WORK_ID) return true;
  return /malowanie emulsj/.test(soft(namePl));
}

function isWykucieBruzdHost(workId: string, namePl: string): boolean {
  if (workId === P526E_WYKUCIE_BRUZD_WORK_ID) return true;
  return /wykucie bruzd/.test(soft(namePl));
}

function isZaprawianieBruzdHost(workId: string, namePl: string): boolean {
  if (workId === P526E_ZAPRAWIANIE_BRUZD_WORK_ID) return true;
  return /zaprawianie bruzd/.test(soft(namePl));
}

/**
 * Host-scoped object / paint-type gate.
 * Call after domain + action gates; reject → not SAFE (NO_INTERNAL_MATCH path).
 */
export function hostObjectSafetyGate(args: {
  queryDesc: string;
  candidateId: string;
  candidateName: string;
}): HostObjectSafetyResult {
  const q = soft(args.queryDesc);
  const id = String(args.candidateId || "");
  const namePl = String(args.candidateName || "");

  if (isMontazGrzejnikaHost(id, namePl)) {
    if (hasGrzejnikObjectConflict(q)) {
      return { ok: false, reasonCode: "głowica≠grzejnik" };
    }
    if (!q.includes("grzejnik")) {
      return { ok: false, reasonCode: "missing-grzejnik-object" };
    }
  }

  if (isMalowanieEmulsjaHost(id, namePl)) {
    if (hasEmulsjaPaintConflict(q)) {
      return { ok: false, reasonCode: "paint-type-conflict≠emulsja" };
    }
    if (!hasEmulsjaMarker(q)) {
      return { ok: false, reasonCode: "emulsja-marker-required" };
    }
  }

  if (isWykucieBruzdHost(id, namePl)) {
    if (/zaprawian/.test(q)) {
      return { ok: false, reasonCode: "zaprawianie≠wykucie" };
    }
  }

  if (isZaprawianieBruzdHost(id, namePl)) {
    if (/wykucie/.test(q) && !/zaprawian/.test(q)) {
      return { ok: false, reasonCode: "wykucie≠zaprawianie" };
    }
  }

  return { ok: true };
}
