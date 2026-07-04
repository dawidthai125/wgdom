import { useEffect, useState } from "react";
import {
  getPayrollRcbDebugOverlaySnapshot,
  getPayrollRcbDebugTimeline,
  subscribePayrollRcbDebugOverlay,
  type PayrollRcbDebugOverlaySnapshot,
  type PayrollRcbDebugTimelineEntry,
} from "@/lib/payroll-rcb-debug-overlay";

function fmt(value: boolean | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
      <span style={{ opacity: 0.85 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function TimelineEntry({ entry }: { entry: PayrollRcbDebugTimelineEntry }) {
  return (
    <div
      style={{
        borderTop: "1px solid rgba(148, 163, 184, 0.25)",
        marginTop: 5,
        paddingTop: 5,
        fontSize: 9,
        lineHeight: 1.35,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        {entry.time} · {entry.event}
      </div>
      {entry.event === "fetchKeysFromCloud.response" ? (
        <div style={{ opacity: 0.9 }}>
          we={fmt(entry.weekEmployeesCount)} keys={fmt(entry.keysReturned)}
        </div>
      ) : (
        <>
          <div style={{ opacity: 0.9 }}>
            m={fmt(entry.mergedCount)} c={fmt(entry.cloudCount)} p={fmt(entry.payloadCount)}
          </div>
          <div style={{ opacity: 0.9 }}>
            bs.c={fmt(entry.batchSetCount)} bs.s={fmt(entry.batchSetStatus)}
          </div>
        </>
      )}
    </div>
  );
}

export function PayrollRcbDebugOverlay() {
  const [snap, setSnap] = useState<PayrollRcbDebugOverlaySnapshot>(() =>
    getPayrollRcbDebugOverlaySnapshot(),
  );
  const [entries, setEntries] = useState<readonly PayrollRcbDebugTimelineEntry[]>(() =>
    getPayrollRcbDebugTimeline(),
  );

  useEffect(
    () =>
      subscribePayrollRcbDebugOverlay(() => {
        setSnap({ ...getPayrollRcbDebugOverlaySnapshot() });
        setEntries([...getPayrollRcbDebugTimeline()]);
      }),
    [],
  );

  const timelineNewestFirst = [...entries].reverse();

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        right: "max(8px, env(safe-area-inset-right))",
        bottom: "max(8px, env(safe-area-inset-bottom))",
        zIndex: 2147483000,
        maxWidth: "min(300px, calc(100vw - 16px))",
        maxHeight: "min(50vh, 320px)",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "8px 10px",
        borderRadius: 8,
        background: "rgba(15, 23, 42, 0.92)",
        color: "#f8fafc",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 11,
        lineHeight: 1.45,
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
        pointerEvents: "none",
        WebkitBackdropFilter: "blur(4px)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 10, letterSpacing: 0.4 }}>
        RC-B DEBUG
      </div>
      <Row label="mergedCount" value={fmt(snap.mergedCount)} />
      <Row label="cloudCount" value={fmt(snap.cloudCount)} />
      <Row label="shouldPush" value={fmt(snap.shouldPush)} />
      <Row label="payloadCount" value={fmt(snap.payloadCount)} />
      <Row label="payrollGuard.blocked" value={fmt(snap.payrollGuardBlocked)} />
      <Row label="batchSet.status" value={fmt(snap.batchSetStatus)} />
      <Row label="batchSet.count" value={fmt(snap.batchSetCount)} />
      <Row label="lastBatchGetCount" value={fmt(snap.lastBatchGetCount)} />
      {timelineNewestFirst.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.75, marginBottom: 2 }}>
            TIMELINE ({timelineNewestFirst.length}/10)
          </div>
          {timelineNewestFirst.map((entry, index) => (
            <TimelineEntry key={`${entry.time}-${entry.event}-${index}`} entry={entry} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
