import { useEffect, useState } from "react";
import {
  getPayrollRcbDebugOverlaySnapshot,
  subscribePayrollRcbDebugOverlay,
  type PayrollRcbDebugOverlaySnapshot,
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

export function PayrollRcbDebugOverlay() {
  const [snap, setSnap] = useState<PayrollRcbDebugOverlaySnapshot>(() =>
    getPayrollRcbDebugOverlaySnapshot(),
  );

  useEffect(
    () =>
      subscribePayrollRcbDebugOverlay(() => {
        setSnap({ ...getPayrollRcbDebugOverlaySnapshot() });
      }),
    [],
  );

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        right: "max(8px, env(safe-area-inset-right))",
        bottom: "max(8px, env(safe-area-inset-bottom))",
        zIndex: 2147483000,
        maxWidth: "min(280px, calc(100vw - 16px))",
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
    </div>
  );
}
