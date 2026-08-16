/**
 * P5.25-FIX — per-run source health / circuit breaker.
 *
 * 403 / 429 / 503 / timeout → source unhealthy for the rest of the run.
 * No retry flood. Does not bypass blocks. ZERO invent.
 *
 * Complements work-rate-research-cooldown (per workId|unit) with per-source health.
 */

export type SourceHealthErrorKind = "403" | "429" | "503" | "timeout" | "other";

export type SourceHealthState = {
  sourceId: string;
  healthy: boolean;
  errorKind: SourceHealthErrorKind | null;
  markedAt: string | null;
  failCount: number;
};

const UNHEALTHY_RE = /403|429|503|timeout|ETIMEDOUT|AbortError|upstream_403/i;

export function classifySourceHealthError(error: unknown): SourceHealthErrorKind | null {
  const e = String(error || "");
  if (!UNHEALTHY_RE.test(e)) return null;
  if (/403|upstream_403/i.test(e)) return "403";
  if (/429/i.test(e)) return "429";
  if (/503/i.test(e)) return "503";
  if (/timeout|ETIMEDOUT|AbortError/i.test(e)) return "timeout";
  return "other";
}

export class InternalFirstSourceHealthTracker {
  private readonly bySource = new Map<string, SourceHealthState>();

  isHealthy(sourceId: string): boolean {
    const s = this.bySource.get(sourceId);
    return !s || s.healthy;
  }

  /** Call before HTTP — skip if unhealthy. */
  shouldSkip(sourceId: string): boolean {
    return !this.isHealthy(sourceId);
  }

  /**
   * Mark source unhealthy on hard upstream errors.
   * @returns true if source was marked unhealthy
   */
  noteError(sourceId: string, error: unknown, nowIso = new Date().toISOString()): boolean {
    const kind = classifySourceHealthError(error);
    if (!kind || kind === "other") {
      const prev = this.bySource.get(sourceId);
      this.bySource.set(sourceId, {
        sourceId,
        healthy: prev?.healthy ?? true,
        errorKind: prev?.errorKind ?? null,
        markedAt: prev?.markedAt ?? null,
        failCount: (prev?.failCount || 0) + 1,
      });
      return false;
    }
    this.bySource.set(sourceId, {
      sourceId,
      healthy: false,
      errorKind: kind,
      markedAt: nowIso,
      failCount: (this.bySource.get(sourceId)?.failCount || 0) + 1,
    });
    return true;
  }

  noteSuccess(sourceId: string): void {
    const prev = this.bySource.get(sourceId);
    if (prev && !prev.healthy) return; // stay open for rest of run once tripped
    this.bySource.set(sourceId, {
      sourceId,
      healthy: true,
      errorKind: null,
      markedAt: null,
      failCount: prev?.failCount || 0,
    });
  }

  snapshot(): SourceHealthState[] {
    return [...this.bySource.values()];
  }

  reset(): void {
    this.bySource.clear();
  }
}
