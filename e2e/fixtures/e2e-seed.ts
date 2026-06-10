import { createHash } from "node:crypto";

export const E2E_JOB_ID = "e2e-z1-job-001";
export const E2E_JOB_ADDRESS = "E2E Testowa 20.5Z.1";
export const E2E_JOB_FLAT = "7";
export const E2E_WORKER_ID = "e2e-z1-worker";
export const E2E_WORKER_NAME = "E2E Worker Z1";
export const E2E_WORKER_PIN = "9876";
/** Ostatnie 9 cyfr bez +48 — do pola logowania pracownika */
export const E2E_WORKER_PHONE_INPUT = "501112233";
export const E2E_ADMIN_PASS = "e2e-z1-admin-pass";
export const E2E_INSPECTOR_PASS = "e2e-z1-insp-pass";
export const E2E_MARKER = "• E2E-HAPPY-PATH-001 zakres testowy";

export function hashWorkerPin(pin: string): string {
  return createHash("sha256").update(`wgdom-worker-pin-v1:${pin}`).digest("hex");
}

export function hashAdminPassword(login: string, password: string): string {
  return createHash("sha256").update(`wgdom-admin-account-v1:${login}:${password}`).digest("hex");
}

export function currentWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(mon), to: fmt(sun) };
}

export type E2eSeedArgs = {
  jobId: string;
  jobAddress: string;
  jobFlat: string;
  workerId: string;
  workerName: string;
  workerPinHash: string;
  workerPhone: string;
  adminHash: string;
  inspectorHash: string;
  weekFrom: string;
  weekTo: string;
};

export function buildE2eSeedArgs(): E2eSeedArgs {
  const { from, to } = currentWeekRange();
  return {
    jobId: E2E_JOB_ID,
    jobAddress: E2E_JOB_ADDRESS,
    jobFlat: E2E_JOB_FLAT,
    workerId: E2E_WORKER_ID,
    workerName: E2E_WORKER_NAME,
    workerPinHash: hashWorkerPin(E2E_WORKER_PIN),
    workerPhone: `+48${E2E_WORKER_PHONE_INPUT}`,
    adminHash: hashAdminPassword("Dawid", E2E_ADMIN_PASS),
    inspectorHash: hashAdminPassword("Szymon", E2E_INSPECTOR_PASS),
    weekFrom: from,
    weekTo: to,
  };
}

/** Dane seed do localStorage (wywoływane w przeglądarce przez addInitScript). */
export function applyE2eSeedInBrowser(args: E2eSeedArgs): void {
  const days = {
    Pn: { active: true, from: "07:00", to: "15:00", zaliczka: "" },
    Wt: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    Sr: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    Cz: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    Pt: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    So: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
  };

  localStorage.setItem(
    "kw-directory",
    JSON.stringify([
      {
        id: args.workerId,
        name: args.workerName,
        phone: args.workerPhone,
        active: true,
        position: "E2E Test",
        defaultRate: "100",
        notes: "",
        documents: {},
        workerPinHash: args.workerPinHash,
      },
    ]),
  );

  localStorage.setItem(
    "kw-week-employees",
    JSON.stringify([
      {
        id: "we-e2e-z1",
        directoryId: args.workerId,
        name: args.workerName,
        phone: args.workerPhone,
        position: "E2E Test",
        rate: "100",
        days,
        prevSaturday: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
        extraCosts: [],
        settled: false,
      },
    ]),
  );

  localStorage.setItem("kw-weekFrom", JSON.stringify(args.weekFrom));
  localStorage.setItem("kw-weekTo", JSON.stringify(args.weekTo));
  localStorage.setItem("kw-archive", JSON.stringify([]));
  localStorage.setItem("kw-contacts", JSON.stringify([]));
  localStorage.setItem(
    "kw-admin-passwords",
    JSON.stringify({ dawid: args.adminHash, szymon: args.inspectorHash }),
  );

  const job = {
    id: args.jobId,
    address: args.jobAddress,
    flatNumber: args.jobFlat,
    client: "E2E Client Z1",
    startDate: args.weekFrom,
    endDate: "",
    status: "in_progress",
    keysHandedOver: false,
    notes: "",
    documents: {},
    workEntries: [],
    materials: [],
    invoiceStatus: "pending",
    invoiceNumber: "",
    invoiceAmount: "",
    photos: [],
    workerReports: [],
    jobAttachments: [],
    jobFiles: [],
    activityLog: [],
  };
  localStorage.setItem("kw-jobs", JSON.stringify([job]));
}
