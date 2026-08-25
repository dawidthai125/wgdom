/**
 * IK-KNR KL-6 — Super Admin Owner VERIFY (session-only pending · single candidate).
 *
 * Persistence only via knr-verify-orchestrator → catalog-write-router. No discovery HTTP.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, FileUp, RefreshCw, X } from "lucide-react";
import type { AdminSession } from "@/lib/admin-auth";
import { adminCanVerifyKnrCatalog } from "@/lib/admin-auth";
import { recordSecurityAudit } from "@/lib/security-audit-log";
import type { KnrCatalogEntry } from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-entry-types";
import { loadKnrCatalogStoreLocal, saveKnrCatalogStoreLocal } from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-store";
import type { KnrRawEvidenceStore } from "@/lib/intelligent-estimator/knr-knowledge/knr-evidence-store";
import {
  emptyKnrRawEvidenceStore,
  loadKnrRawEvidenceStoreLocal,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-evidence-store";
import { loadKnrDiscoveryEvidenceStoreLocal } from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-store";
import { knrDiscoveryStatusLabelPl } from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-types";
import { knrVerificationLabelPl } from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-ui";
import {
  buildKnrVerifyCandidateViewModel,
  type KnrVerifyCandidateViewModel,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-verify-display";
import {
  hydrateKnrCorpusPendingQueueFromText,
  hydrateKnrPendingQueueFromLocalCatalog,
  type KnrKl6HydrationQueueItem,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-kl6-hydration";
import {
  executeKnrOwnerVerifyApprove,
  executeKnrOwnerVerifyReject,
  ingestAthForKnrOwnerVerify,
  KNR_VERIFY_REJECT_REASON_MIN_CHARS,
  type KnrVerifyAuditRecord,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-verify-orchestrator";
import { WgButton } from "@/app/ui/WgButton";

type Props = {
  adminSession: AdminSession;
};

function catalogAuthorityHint(entry: KnrCatalogEntry): {
  discoveryLabelPl: string | null;
  sourceLabelPl: string;
} {
  const discoveryStore = loadKnrDiscoveryEvidenceStoreLocal();
  const evidenceHit = discoveryStore.entries[entry.evidenceKeyV1];
  const discoveryLabelPl = evidenceHit
    ? knrDiscoveryStatusLabelPl(evidenceHit.discoveryStatus)
    : entry.provenance.sourceType === "AUTHORIZED_FETCH"
      ? "DISCOVERED (katalog)"
      : null;
  const sourceLabelPl =
    entry.provenance.sourceType === "LICENSED_PROGRAM_EXPORT"
      ? "ATH / licencjonowany eksport"
      : entry.provenance.sourceType === "AUTHORIZED_FETCH"
        ? "Discovery L3 (PENDING_VERIFY)"
        : entry.provenance.sourceProgram || entry.provenance.sourceIdentifier || "—";
  return { discoveryLabelPl, sourceLabelPl };
}

function VerificationBadge({ status }: { status: string }) {
  const label = knrVerificationLabelPl(status as KnrCatalogEntry["verificationStatus"]);
  const tone =
    status === "VERIFIED"
      ? "bg-emerald-500/15 text-emerald-800"
      : status === "PENDING_VERIFY"
        ? "bg-amber-500/15 text-amber-900"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`text-[10px] rounded-full px-2 py-1 ${tone}`} data-knr-verify-status={status}>
      {label}
      {status === "PENDING_VERIFY" ? " · nie VERIFIED" : ""}
    </span>
  );
}

function basenameSafe(name: string): string {
  return name.replace(/\\/g, "/").split("/").pop() || "export.ath";
}

function recordKnrVerifyAudit(record: KnrVerifyAuditRecord): void {
  void recordSecurityAudit({
    actor: record.actorDisplayName,
    actorUserId: record.actorId,
    category: "DATA",
    action: record.action,
    severity: record.action === "knr_catalog_reject" ? "warn" : "info",
    summary:
      record.action === "knr_catalog_verify"
        ? `VERIFY KNR ${record.identityKeyV2} (${record.outcome})`
        : `REJECT KNR ${record.identityKeyV2}`,
    detail: JSON.stringify({
      identityKeyV2: record.identityKeyV2,
      contentHash: record.contentHash,
      evidenceRefId: record.evidenceRefId,
      outcome: record.outcome,
      reason: record.reason ?? null,
    }),
    at: record.at,
  });
}

function NormTable({ title, rows }: { title: string; rows: KnrVerifyCandidateViewModel["laborNorms"] }) {
  if (rows.length === 0) {
    return <p className="text-[11px] text-muted-foreground">{title}: brak</p>;
  }
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pr-2 py-1">Kod</th>
              <th className="pr-2 py-1">Opis</th>
              <th className="pr-2 py-1">j.m.</th>
              <th className="pr-2 py-1">Ilość (nz)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.kind}-${row.code}`} className="border-t border-border/60">
                <td className="pr-2 py-1 font-mono">{row.code}</td>
                <td className="pr-2 py-1">{row.description}</td>
                <td className="pr-2 py-1">{row.unit}</td>
                <td className="pr-2 py-1 tabular-nums">{row.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function KnrVerifyAdminView({ adminSession }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingJsonRef = useRef<HTMLInputElement>(null);
  const evidenceJsonRef = useRef<HTMLInputElement>(null);
  const [targetCode, setTargetCode] = useState("KNR 2-02 0803-01");
  const [busy, setBusy] = useState(false);
  const [errorPl, setErrorPl] = useState<string | null>(null);
  const [infoPl, setInfoPl] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pending, setPending] = useState<KnrCatalogEntry | null>(null);
  const [pendingQueue, setPendingQueue] = useState<KnrKl6HydrationQueueItem[]>([]);
  const [pendingJsonText, setPendingJsonText] = useState<string | null>(null);
  const [evidenceJsonText, setEvidenceJsonText] = useState<string | null>(null);
  const [evidenceStore, setEvidenceStore] = useState<KnrRawEvidenceStore>(() =>
    loadKnrRawEvidenceStoreLocal(),
  );

  const refreshCatalogQueue = useCallback(() => {
    const hydrated = hydrateKnrPendingQueueFromLocalCatalog({ existingQueue: pendingQueue });
    setPendingQueue(hydrated.queue);
    return hydrated;
  }, [pendingQueue]);

  useEffect(() => {
    if (!adminCanVerifyKnrCatalog(adminSession.role)) return;
    setEvidenceStore(loadKnrRawEvidenceStoreLocal());
    const hydrated = hydrateKnrPendingQueueFromLocalCatalog();
    setPendingQueue(hydrated.queue);
    if (hydrated.catalogPendingCount > 0) {
      setInfoPl(
        `Wczytano ${hydrated.catalogPendingCount} wpis(ów) PENDING_VERIFY z lokalnego katalogu KNR.`,
      );
    }
  }, [adminSession.role]);

  const allowed = adminCanVerifyKnrCatalog(adminSession.role);

  const view = useMemo(
    () => (pending ? buildKnrVerifyCandidateViewModel(pending) : null),
    [pending],
  );

  const authorityHint = useMemo(
    () => (pending ? catalogAuthorityHint(pending) : null),
    [pending],
  );

  const actor = {
    actorId: adminSession.id,
    role: adminSession.role,
    displayName: adminSession.displayName,
  };

  const queueSummary = useMemo(() => {
    const total = pendingQueue.length;
    const active = pending ? pendingQueue.find((item) => item.entry.identityKeyV2 === pending.identityKeyV2) : null;
    return { total, active };
  }, [pending, pendingQueue]);

  const onPickFile = useCallback(async (file: File) => {
    setErrorPl(null);
    setInfoPl(null);
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".ath")) {
      setErrorPl("Wybierz plik .ath (Norma / Athenasoft).");
      return;
    }
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const nowIso = new Date().toISOString();
      const catalog = loadKnrCatalogStoreLocal();
      const result = await ingestAthForKnrOwnerVerify({
        bytes,
        sourceFilename: basenameSafe(file.name),
        capturedAt: nowIso,
        nowIso,
        targetDisplayCode: targetCode.trim() || "KNR 2-02 0803-01",
        ownerActorId: adminSession.id,
        catalogStore: catalog,
      });
      if (!result.ok) {
        setPending(null);
        setErrorPl(result.messagePl);
        return;
      }
      setEvidenceStore(result.evidenceStore);
      if (result.outcome === "NOOP") {
        setPending(null);
        setInfoPl("Ten KNR jest już w katalogu (NOOP — ten sam contentHash).");
        return;
      }
      setPending(result.candidate);
      setInfoPl("Kandydat PENDING_VERIFY — sprawdź R/M/S i zatwierdź albo odrzuć.");
    } catch (err) {
      setErrorPl(err instanceof Error ? err.message : "Nie udało się wczytać pliku.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [adminSession.id, targetCode]);

  const onApprove = useCallback(() => {
    if (!pending) return;
    void (async () => {
      setBusy(true);
      setErrorPl(null);
      const nowIso = new Date().toISOString();
      const liveCatalog = loadKnrCatalogStoreLocal();
      const result = await executeKnrOwnerVerifyApprove({
        candidate: pending,
        actor,
        nowIso,
        catalogStore: undefined,
        evidenceStore,
        expectedEtag: liveCatalog.etag,
        expectedCandidateContentHash: pending.contentHash,
        recordAudit: recordKnrVerifyAudit,
      });
      setBusy(false);
      if (!result.ok) {
        setErrorPl(result.messagePl);
        return;
      }
      setPending(null);
      setPendingQueue((prev) =>
        prev.filter(
          (row) =>
            !(
              row.entry.identityKeyV2 === pending.identityKeyV2
              && row.entry.contentHash === pending.contentHash
            ),
        ),
      );
      setRejectReason("");
      refreshCatalogQueue();
      setInfoPl(
        result.outcome === "NOOP"
          ? "Bez zmian — wpis już VERIFIED (LOCAL HIT)."
          : "Zatwierdzono — wpis VERIFIED w katalogu KNR (Owner VERIFY).",
      );
    })();
  }, [actor, evidenceStore, pending, refreshCatalogQueue]);

  const onReject = useCallback(() => {
    if (!pending) return;
    setBusy(true);
    setErrorPl(null);
    const nowIso = new Date().toISOString();
    const liveCatalog = loadKnrCatalogStoreLocal();
    const result = executeKnrOwnerVerifyReject({
      candidate: pending,
      actor,
      nowIso,
      reason: rejectReason,
      catalogStore: liveCatalog,
      evidenceStore,
      recordAudit: recordKnrVerifyAudit,
    });
    setBusy(false);
    if (!result.ok) {
      setErrorPl(result.messagePl);
      return;
    }
    saveKnrCatalogStoreLocal(result.catalogStore, nowIso);
    setPending(null);
    setPendingQueue((prev) =>
      prev.filter(
        (row) =>
          !(
            row.entry.identityKeyV2 === pending.identityKeyV2
            && row.entry.contentHash === pending.contentHash
          ),
      ),
    );
    setRejectReason("");
    refreshCatalogQueue();
    setInfoPl("Odrzucono kandydata (REJECTED w katalogu). Evidence pozostaje.");
  }, [actor, evidenceStore, pending, rejectReason, refreshCatalogQueue]);

  const onPickPendingJson = useCallback(async (file: File) => {
    setErrorPl(null);
    setInfoPl(null);
    try {
      const text = await file.text();
      setPendingJsonText(text);
      setInfoPl("Załadowano plik kolejki PENDING.");
    } catch (err) {
      setErrorPl(err instanceof Error ? err.message : "Nie udało się odczytać JSON kolejki.");
    } finally {
      if (pendingJsonRef.current) pendingJsonRef.current.value = "";
    }
  }, []);

  const onPickEvidenceJson = useCallback(async (file: File) => {
    setErrorPl(null);
    setInfoPl(null);
    try {
      const text = await file.text();
      setEvidenceJsonText(text);
      setInfoPl("Załadowano plik evidence.");
    } catch (err) {
      setErrorPl(err instanceof Error ? err.message : "Nie udało się odczytać JSON evidence.");
    } finally {
      if (evidenceJsonRef.current) evidenceJsonRef.current.value = "";
    }
  }, []);

  const onHydrateQueue = useCallback(() => {
    setErrorPl(null);
    setInfoPl(null);
    if (!pendingJsonText || !evidenceJsonText) {
      setErrorPl("Najpierw wskaż plik kolejki PENDING i plik evidence.");
      return;
    }
    const result = hydrateKnrCorpusPendingQueueFromText({
      pendingJsonText,
      evidenceJsonText,
      existingQueue: pendingQueue,
      existingEvidenceStore: evidenceStore,
      nowIso: new Date().toISOString(),
    });
    setEvidenceStore(result.evidenceStore);
    setPendingQueue(result.queue);
    if (!result.ok) {
      setInfoPl(
        `Hydracja częściowa: załadowano ${result.queue.length}, pominięto ${result.skipped.length}, duplikaty ${result.duplicateDropped}.`,
      );
      setErrorPl(result.skipped[0]?.messagePl ?? result.messagePl);
      return;
    }
    setInfoPl(
      `Załadowano kolejkę KNR (${result.queue.length}) · pominięte ${result.skipped.length} · duplikaty ${result.duplicateDropped}.`,
    );
  }, [evidenceStore, evidenceJsonText, pendingJsonText, pendingQueue]);

  if (!allowed) {
    return (
      <div className="p-4 text-sm text-destructive" data-knr-verify-denied>
        Weryfikacja norm KNR jest dostępna tylko dla Super Administratora.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4 space-y-3" data-knr-verify-root>
      <header className="flex items-start gap-2">
        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
        <div>
          <h1 className="text-base font-semibold leading-tight">Weryfikacja KNR</h1>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Owner VERIFY: PENDING_VERIFY → VERIFIED (lub odrzucenie). DISCOVERED ≠ VERIFIED.
            Normy R/M/S (nz), nie ceny PLN. Tylko Super Admin · bez discovery HTTP.
          </p>
        </div>
      </header>

      <div
        className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-muted-foreground"
        data-knr-verify-authority-banner
      >
        <strong className="text-foreground">Granica authority:</strong> Discovery kończy na{" "}
        <span className="font-mono">PENDING_VERIFY</span>. Tylko ta powierzchnia może promować do{" "}
        <span className="font-mono">VERIFIED</span> przez orchestrator.
      </div>

      <section className="rounded-lg border border-border bg-card p-3 space-y-2" data-knr-verify-catalog-refresh>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold">Katalog lokalny (PENDING_VERIFY)</div>
          <WgButton
            type="button"
            variant="outline"
            className="min-h-[44px]"
            disabled={busy}
            onClick={() => {
              const hydrated = refreshCatalogQueue();
              setInfoPl(
                `Odświeżono katalog: ${hydrated.catalogPendingCount} PENDING_VERIFY · kolejka ${hydrated.queue.length}.`,
              );
            }}
            data-knr-verify-refresh-catalog
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Odśwież z katalogu
          </WgButton>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-3 space-y-2" data-knr-verify-import>
        <label className="text-[11px] font-medium block">
          Kod KNR (pozycja w pliku)
          <input
            className="mt-1 w-full min-h-[44px] rounded-md border border-input bg-background px-3 text-sm"
            value={targetCode}
            onChange={(e) => setTargetCode(e.target.value)}
            autoComplete="off"
          />
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".ath,application/octet-stream"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPickFile(file);
          }}
        />
        <WgButton
          type="button"
          className="min-h-[44px]"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <FileUp className="h-4 w-4" aria-hidden />
          Wybierz plik .ath
        </WgButton>
      </section>

      <section className="rounded-lg border border-border bg-card p-3 space-y-2" data-knr-verify-hydration>
        <div className="text-xs font-semibold">Hydracja kolejki CORPUS (JSON lokalny)</div>
        <p className="text-[11px] text-muted-foreground">
          Hydracja ładuje wyłącznie PENDING_VERIFY do sesji. Nie wykonuje VERIFY/APPROVE/REJECT.
        </p>
        <input
          ref={pendingJsonRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPickPendingJson(file);
          }}
        />
        <input
          ref={evidenceJsonRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPickEvidenceJson(file);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <WgButton type="button" variant="outline" className="min-h-[44px]" onClick={() => pendingJsonRef.current?.click()}>
            Wybierz kolejkę PENDING (.json)
          </WgButton>
          <WgButton type="button" variant="outline" className="min-h-[44px]" onClick={() => evidenceJsonRef.current?.click()}>
            Wybierz evidence (.json)
          </WgButton>
          <WgButton type="button" className="min-h-[44px]" onClick={onHydrateQueue}>
            Załaduj kolejkę KNR
          </WgButton>
        </div>
        <p className="text-[11px] text-muted-foreground">
          W kolejce: {queueSummary.total}. Aktywny rekord: {queueSummary.active?.entry.displayCode ?? "—"}.
        </p>
      </section>

      {errorPl && (
        <p className="text-xs text-destructive" role="alert" data-knr-verify-error>
          {errorPl}
        </p>
      )}
      {infoPl && (
        <p className="text-xs text-muted-foreground" role="status" data-knr-verify-info>
          {infoPl}
        </p>
      )}

      <section className="rounded-lg border border-border bg-card p-3 space-y-2" data-knr-verify-queue>
        <div className="text-xs font-semibold">Kolejka PENDING (sesja)</div>
        {pendingQueue.length === 0 && !pending && (
          <p className="text-[11px] text-muted-foreground">Brak pending — zaimportuj ATH lub załaduj kolejkę JSON.</p>
        )}
        {pendingQueue.length > 0 && (
          <div className="space-y-1">
            {pendingQueue.map((row) => {
              const selected = pending?.identityKeyV2 === row.entry.identityKeyV2;
              return (
                <button
                  key={`${row.entry.identityKeyV2}:${row.entry.contentHash}`}
                  type="button"
                  className={`w-full min-h-[44px] rounded-md border px-3 text-left text-sm ${
                    selected
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-border bg-background hover:bg-muted/40"
                  }`}
                  onClick={() => setPending(row.entry)}
                  data-knr-verify-pending-row
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {row.entry.displayCode} · {row.entry.validationState}
                    </span>
                    <VerificationBadge status={row.entry.verificationStatus} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {pending && view && pendingQueue.length === 0 && (
          <button
            type="button"
            className="w-full min-h-[44px] rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 text-left text-sm"
            data-knr-verify-pending-row
            onClick={() => setPending(pending)}
          >
            {view.displayCode} · {view.verificationStatus} · {view.validationState}
          </button>
        )}
      </section>

      {pending && view && (
        <section className="rounded-lg border border-border bg-card p-3 space-y-3" data-knr-verify-candidate>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">{view.displayCode}</div>
              <div className="text-[11px] text-muted-foreground">{view.description}</div>
            </div>
            <VerificationBadge status={view.verificationStatus} />
          </div>
          {authorityHint && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] rounded-md border border-border/60 bg-muted/20 p-2">
              <div>
                <dt className="text-muted-foreground">Źródło / evidence</dt>
                <dd>{authorityHint.sourceLabelPl}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Discovery status</dt>
                <dd>{authorityHint.discoveryLabelPl ?? "— (nie discovery)"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Catalog status</dt>
                <dd>
                  {view.verificationStatus} · validation {view.validationState} · DISCOVERED ≠
                  VERIFIED
                </dd>
              </div>
            </dl>
          )}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div>
              <dt className="text-muted-foreground">j.m.</dt>
              <dd>{view.unit}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">identityKeyV2</dt>
              <dd className="font-mono break-all">{view.identityKeyV2}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Publisher / edition</dt>
              <dd>
                {view.publisher || "—"} / {view.edition || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tabela / kolumna / rozdział</dt>
              <dd>
                {view.table || "—"} / {view.column || "—"} / {view.chapter || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Evidence SHA / ref</dt>
              <dd className="font-mono break-all">
                {view.evidenceContentHash} · {view.evidenceRefId || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Legal / validation</dt>
              <dd>
                {view.legalOriginId || "—"} · {view.licenceId || "—"} · {view.validationState}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Provenance</dt>
              <dd>
                {view.sourceProgram || view.sourceFilename || "ATH"} · parser {view.parserVersion}
              </dd>
            </div>
          </dl>

          <NormTable title="R — robocizna" rows={view.laborNorms} />
          <NormTable title="M — materiały" rows={view.materialNorms} />
          <NormTable title="S — sprzęt" rows={view.equipmentNorms} />

          <label className="text-[11px] font-medium block">
            Powód odrzucenia (min. {KNR_VERIFY_REJECT_REASON_MIN_CHARS} znaków)
            <textarea
              className="mt-1 w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              data-knr-verify-reject-reason
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <WgButton
              type="button"
              className="min-h-[44px]"
              disabled={busy}
              onClick={onApprove}
              data-knr-verify-approve
            >
              Zatwierdź (VERIFY)
            </WgButton>
            <WgButton
              type="button"
              variant="outline"
              className="min-h-[44px]"
              disabled={busy}
              onClick={onReject}
              data-knr-verify-reject
            >
              Odrzuć
            </WgButton>
            <WgButton
              type="button"
              variant="ghost"
              className="min-h-[44px]"
              disabled={busy}
              onClick={() => {
                setPending(null);
                setRejectReason("");
              }}
            >
              <X className="h-4 w-4" aria-hidden />
              Zamknij
            </WgButton>
          </div>
        </section>
      )}
    </div>
  );
}

export default KnrVerifyAdminView;
