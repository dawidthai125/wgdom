/**
 * TEST-INFRA-001 — Harness core types (#016, #021)
 */
export const HARNESS_VERSION = "1.0.0";

export class HarnessPreconditionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "HarnessPreconditionError";
    this.code = code;
  }
}

export class ScenarioFail extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioFail";
  }
}

export interface HarnessPriorSnapshots {
  weekEmployees?: Record<string, unknown>;
  jobs?: Record<string, unknown>;
  directory?: Record<string, unknown>;
}

export interface HarnessRunManifest {
  runId: string;
  harnessVersion: string;
  environment: "localhost" | "preview" | "prod";
  createdAt: string;
  scenarioId: string;
  directoryIds: string[];
  weekEmployeeIds: string[];
  workEntryIds: string[];
  workEntryTombstoneIds: Array<{ jobId: string; entryId: string }>;
  directoryDeletedIds: string[];
  touchedJobIds: string[];
  priorSnapshots: HarnessPriorSnapshots;
  priorPayrollListMode: string | null;
  cloudPushKeys: string[];
  keysWritten: string[];
}

export function createEmptyManifest(
  runId: string,
  environment: HarnessRunManifest["environment"],
  scenarioId: string,
): HarnessRunManifest {
  return {
    runId,
    harnessVersion: HARNESS_VERSION,
    environment,
    createdAt: new Date().toISOString(),
    scenarioId,
    directoryIds: [],
    weekEmployeeIds: [],
    workEntryIds: [],
    workEntryTombstoneIds: [],
    directoryDeletedIds: [],
    touchedJobIds: [],
    priorSnapshots: {},
    priorPayrollListMode: null,
    cloudPushKeys: [],
    keysWritten: [],
  };
}
