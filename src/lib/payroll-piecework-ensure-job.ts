/**
 * Ensure active PieceworkJob for a Job.id — reuse if present, else create.
 */
import {
  createPieceworkJob,
  type PieceworkOpResult,
} from "@/lib/payroll-piecework";
import {
  isPieceworkDeleted,
  type PayrollPieceworkState,
  type PieceworkJob,
} from "@/lib/payroll-piecework-types";

export function findActivePieceworkJobByJobId(
  state: PayrollPieceworkState,
  jobId: string,
): PieceworkJob | undefined {
  const want = String(jobId ?? "").trim();
  if (!want) return undefined;
  return state.jobs.find((j) => !isPieceworkDeleted(j) && j.jobId === want);
}

export function ensurePieceworkJobForJobId(
  state: PayrollPieceworkState,
  jobId: string,
  label?: string,
  now?: string,
): PieceworkOpResult & { pieceworkJobId?: string } {
  const existing = findActivePieceworkJobByJobId(state, jobId);
  if (existing) {
    return { ok: true, state, pieceworkJobId: existing.id };
  }
  const created = createPieceworkJob(state, {
    jobId,
    ...(label ? { label } : {}),
    now,
  });
  if (!created.ok) return created;
  const createdJob = created.state.jobs.find(
    (j) => !isPieceworkDeleted(j) && j.jobId === String(jobId).trim(),
  );
  return { ...created, pieceworkJobId: createdJob?.id };
}
