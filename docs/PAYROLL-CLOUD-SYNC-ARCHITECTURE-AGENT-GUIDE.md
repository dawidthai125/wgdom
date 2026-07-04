# PAYROLL Cloud Sync — Architecture Agent Guide

> **Cel:** jeden dokument, dzięki któremu **przyszły AI / agent Cursor** rozumie architekturę synchronizacji i merge Payroll **bez analizowania kodu od zera**. Zawiera przepływ danych, pliki SSOT, klucze KV, model merge, logikę Edge, oraz **dwa aktywne problemy P0** (batch-set 500 + resurrection pracowników) z hipotezami i planem.
>
> **Data:** 2026-07-04 · **HEAD `24bde6e`** · **Prod UI v2.63.30** · **RC-B-1 CLOSED** · **P0 batch-set 500 OPEN (H1 UNCONFIRMED)**
>
> **★ RC-B-1 closeout:** [`recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md) · **PWRB facade:** `src/lib/payroll-week-roster-bundle.ts`
>
> **Powiązane SSOT:** [`AGENT-APP-MAP.md`](AGENT-APP-MAP.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md) §11 · [`PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md`](PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md) · [`PAYROLL-PR-PAY-S7A-CLOUD-SYNC-FREQUENCY-AUDIT.md`](PAYROLL-PR-PAY-S7A-CLOUD-SYNC-FREQUENCY-AUDIT.md) · [`PAYROLL-PR-PAY-S7-4-CLOUD-SYNC-OPTIMIZATION-DESIGN-FREEZE.md`](PAYROLL-PR-PAY-S7-4-CLOUD-SYNC-OPTIMIZATION-DESIGN-FREEZE.md) · [`PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md`](PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md)

---

## 0. TL;DR dla agenta (przeczytaj najpierw)

- **Model danych = LocalStorage ↔ Supabase KV** (klucz→JSON). Klient scala, Edge scala ponownie. **Merge jest UNION** (nie replace) — to źródło większości pułapek Payroll.
- **PWRB (RC-B-1):** skład tygodnia = **para** `kw-week-employees` + `kw-week-employees-deleted-ids`. Mutacje UI **tylko** przez `payroll-week-roster-bundle.ts` (`pwrAdd`, `pwrRemove`, `pwrPush`, …). Inwarianty **I-1…I-4** wymuszają G-0 (brak X w rosterze gdy istnieje tomb T).
- **Parytet klient↔Edge to twardy wymóg** (regresja B6). Wspólny kernel identyfikacji: `src/lib/payroll-week-employee-merge.ts`. Nie zmieniaj jednej strony bez drugiej.
- **Aktywne problemy P0** (§7):
  1. **batch-set HTTP 500** (najpr. *statement timeout* — **H1 UNCONFIRMED**). S7-4A observation OPEN.
  2. **Resurrection** — **ZAADRESOWANE** S7-5 ETAP 1 (`ae132bc`) + **RC-B-1** re-add revocation (`35f37b1`). Multi-device AC8–AC11 **PENDING** owner validation.
- **NIE ruszaj** merge/LWW/tombstonów/Edge/kv.mset bez AUDIT i owner GO. STABILIZATION WINDOW — brak nowych epiców.

---

## 1. Pliki SSOT (gdzie jest logika)

| Warstwa | Plik | Odpowiedzialność |
|---------|------|------------------|
| **PWRB facade (RC-B-1)** | `src/lib/payroll-week-roster-bundle.ts` | **Jedyny** publiczny entry mutacji pary roster+tombstones w UI (`pwrAdd`, `pwrRemove`, `pwrPush`, `pwrReconcile`, …) |
| **Merge / sync klient** | `src/lib/cloud-sync.ts` | `DATA_KEYS`, fetch/push KV, `computeMergedDataBundle`, **I-1**, `finalizePayrollBundleMerge`, `mergeWeekEmployees*`, tombstony, **I-4** `pushWeekEmployeesToCloud`, guardy push |
| **Shell / orkiestracja** | `src/app/App.tsx` | `runCloudSync`, `pullFromCloudAndMerge`, `applyAdminDataBundle`, handlery Payroll (`removeWeekEmployee`, `persistPayrollRoster`, `toggleSettled`, rollover) |
| **Backend / merge Edge** | `supabase/functions/make-server-0afb8820/index.tsx` | `batch-get`/`batch-set`, `mergeWeekEmployeesUnion`, guardy shrink/expansion, rotacja backupów, `kv.mset` |
| **KV store Edge** | `supabase/functions/make-server-0afb8820/kv_store.tsx` | `get`/`set`/`mget`/`mset` → Postgres `kv_store_0afb8820` (upsert) |
| **Kernel identyfikacji (parity)** | `src/lib/payroll-week-employee-merge.ts` | `weekEmployeeMergeKey`, `hasWeekEmployeesRosterExpansion` — **wspólny** klient+Edge (B6) |
| **Throttle / metryki (S7-4A)** | `src/lib/cloud-sync-throttle.ts` | `AUTO_SYNC_DEBOUNCE_MS`, `MIN_PULL_INTERVAL_MS`, `shouldPullNow`, `bundleFingerprint`, metryki `batchGet/batchSet/pushSkipped` |
| **Guard mutacji** | `src/lib/cloud-sync-mutation-guard.ts` | `CloudSyncMutationGuard` — blokuje pull podczas mutacji roster/jobs |
| **LocalStorage hook** | `src/app/hooks/useLocalStorage.ts` | `skipApplyWriteTimestamps`, stabilne update'y (`Object.is`) |

---

## 2. Przepływ danych (sync)

```text
ZAPIS (mutacja lokalna)
  setWeekEmployees / persistPayrollRoster / toggleSettled
    → localStorage.setItem(kw-*)
    → scheduleAutoCloudSync (debounce AUTO_SYNC_DEBOUNCE_MS = 2s)
    → runCloudSync():
        1) pull:  pullAndMergeDataBundle → computeMergedDataBundle
                   → finalizePayrollBundleMerge → applyRuntimePayrollAntiLeak
        2) apply: applyAdminDataBundle(merged)      ← lokalny stan ZMIENIONY tu
        3) push:  bundleFingerprint(merged) == last? → recordPushSkipped (AC4)
                   inaczej → pushMergedDataBundleToCloud(merged)
                             → pushKeysToCloud → POST /batch-set

ODCZYT (focus / visibility / resume / boot)
  pullFromCloudAndMerge  (throttled: shouldPullNow, MIN_PULL_INTERVAL_MS = 15s)
    → computeMergedDataBundle → finalizePayrollBundleMerge
  CloudLoader (boot / F5): mergeAllDataKeys → applyBootstrapPayrollMerge
```

**Ważne (partial sync):** pull→apply zachodzi **przed** push (`App.tsx` ~736–770). Jeśli push (`batch-set`) padnie 500, lokalny stan jest już zmutowany po pull-merge → to jeden z mechanizmów, przez który resurrection/utrata statusu jest widoczna mimo błędu zapisu.

---

## 3. Klucze KV (magazyn)

### 3.1 `DATA_KEYS` (rdzeń, `cloud-sync.ts` ~l.300+) — pełny sync
Payroll rdzeń: `kw-week-employees`, `kw-weekFrom`, `kw-weekTo`, `kw-archive`, `kw-directory`, `kw-employee-leaves`, `kw-recoverable-charges` + Jobs/Contacts/OpNotes/WM/EM/Tenders/WorkCatalog.

### 3.2 Tombstony (`*-deleted-ids`) — **UWAGA: nie wszystkie są synchronizowane**

| Klucz | Push? | Pull? | Uwaga |
|-------|-------|-------|-------|
| `kw-jobs-deleted-ids` | ✅ | ✅ | wzorzec: `mergeDeletedJobIds` + `save…` |
| `kw-directory-deleted-ids` | ✅ | ✅ | |
| `kw-contacts-deleted-ids` · `kw-archive-deleted-ids` · leaves · charges · op-notes · WM tpl/doc · EM | ✅ | ✅ | pełny wzorzec deleted-ids (`computeMergedDataBundle` ~2505–2596) |
| **`kw-week-employees-deleted-ids`** | ✅ | ✅ | **Synchronizowany** od **S7-5-1** (`ae132bc`). **Revocation** przy re-add od **RC-B-1** (`35f37b1`) — I-1 pull, I-3 reconcile, I-4 coupled push, I-2 Edge |

Format tombstona week-employee: `${weekFrom}|${weekTo}::${weekEmployeeMergeKey(emp)}` (week-scoped). Filtr: `deletedWeekEmployeeMergeKeySet` + `filterDeletedWeekEmployees`.

### 3.3 AUX (poza `DATA_KEYS`) — osobne pull helpery
`kw-security-audit-log`, `kw-wm-druk-audit-log`, `kw-operational-notes-audit-log`, `kw-inspector-stats`, `kw-app-settings`.

---

## 4. Model merge Week Employees (najważniejsze)

### 4.1 Identyfikacja — `weekEmployeeMergeKey`
```
dir:<directoryId>   (jeśli directoryId)  → inaczej
name:<normalized>   (jeśli name)         → inaczej
id:<uuid>
```
**Pułapka H-R-KEY:** ten sam człowiek na 2 urządzeniach może mieć różny klucz (jedno ma `directoryId`, drugie tylko `name`, lub różne `id`) → tombstone jednego urządzenia nie trafia w kopię z drugiego. Stabilizacja = **S7-5-4**.

### 4.2 Merge klienta — `mergeWeekEmployeesForWeekRange` (`cloud-sync.ts:1619`)
1. Odfiltruj tombstony (**lokalne**) z `local` i `cloud` (l.1636–1638).
2. **Week-scope hard guard** (PR-PAY-S1): nie dodawaj składu z obcego tygodnia.
3. Gdy oba pasują do tygodnia → `mergeWeekEmployees(local, cloud)` = **UNION** po merge-key.
4. Richness override (`sanitizeWeekEmployeesForTargetRange`/`applyRuntimePayrollAntiLeak`) — adoptuje bogatszy skład z chmury, ale **respektuje tombstony** i **nie nadpisuje** nowszego `settled` (LWW).

### 4.3 Settled — LWW
`settled`/`settledUpdatedAt` rozstrzygane **last-write-wins** po timestampie (`preserveSettledLwwFromLocal`, `pickSettledByTimestamps`). Richness/UNION **nie** może cofnąć nowszego statusu. `toggleSettled` (App.tsx) ustawia `settledUpdatedAt` i kolejkuje sync.

### 4.4 Edge — `batch-set` (`index.tsx:586–697`)
- Flagi force-replace z requestu: `replaceJobsKeys`, `replaceDirectoryKeys`, **`replaceWeekEmployeesKeys`**.
- Dla `kw-week-employees`:
  - jeśli **force-replace** → zapisz `next` as-is (bez union);
  - inaczej jeśli `isSuspiciousPayrollShrink(prev,next)` → `mergeWeekEmployeesUnion(prev,next)` (blocked shrink);
  - inaczej jeśli `hasWeekEmployeesRosterExpansion(prev,next)` → `mergeWeekEmployeesUnion` (roster expansion).
- **Edge NIE zna tombstonów** → union może przywrócić usuniętego (H-R1). Naprawa = **S7-5-2** (tombstone-aware przed union).
- `kv.mset(keys, values)` = **jeden upsert całego bundla** (all-or-nothing) → ryzyko 500 (§7.1).

**Ścieżki push a force-replace:** główny `pushMergedDataBundleToCloud` i `pushWeekEmployeesToCloud` ustawiają `replaceWeekEmployeesKeys=["kw-week-employees"]`. **`pushKeysToCloudSafe` — NIE** (l.2606–2629) → dopuszcza union Edge (H-R3). Naprawa = **S7-5-3**.

---

## 5. Guardy i throttle

| Mechanizm | Plik | Rola |
|-----------|------|------|
| `CloudSyncMutationGuard` | `cloud-sync-mutation-guard.ts` | blokuje pull podczas mutacji roster/jobs (`withKwWeekEmployeesAsyncMutation`) |
| `suppressAutoSyncUntilRef` | `App.tsx` | okno wyciszenia auto-sync (np. +6s po `persistPayrollRoster`) |
| `isSuspiciousPayrollShrink` | Edge `index.tsx:423` | blokuje utratę bogatego rostera (union zamiast replace) |
| debounce/min-interval (S7-4A) | `cloud-sync-throttle.ts` | `AUTO_SYNC_DEBOUNCE_MS=2s`, `MIN_PULL_INTERVAL_MS=15s`, throttle pull na focus/visibility |
| fingerprint (S7-4A AC4) | `cloud-sync-throttle.ts` | brak zmian bundla = brak push (`recordPushSkipped`) |
| metryki (S7-4A AC5) | `cloud-sync-throttle.ts` | `globalThis.__wgdomSyncMetrics` = `{batchGet,batchSet,pushSkipped,since}` |

---

## 6. Co zrobiliśmy (oś czasu Payroll Cloud Sync)

| Bundle | Status | Skrót |
|--------|--------|-------|
| **PR-PAY-S1** Week Scope Hard Guard | CLOSED (`1d5b0b7`) | koniec cross-week UNION |
| **PR-PAY-S2** Deletion Tombstones | CLOSED (`d6c6117`) | `kw-week-employees-deleted-ids` (lokalny) |
| **PR-PAY-S3** Zero Hours Persistence | CLOSED | |
| **PR-PAY-S5** Settled Status Persistence | CLOSED (`fd56cf7`) | LWW `settledUpdatedAt` |
| **PR-PAY-S6** Archive Restore Eligibility Guard | CLOSED (`d2a3d90`) | `eligibleArchiveWeekEmployees` — baner/restore respektuje tombstony |
| **PR-PAY-S7-1** Cloud Batch Diagnostics | CLOSED (`4c38f4f`) | `app.onError` + try/catch + `{ok,error,requestId}` w `batch-set` |
| **PR-PAY-S7A** Frequency Audit | AUDIT COMPLETE | CONFIRMED CONTRIBUTING CAUSE (nadmiarowe batch-get/set) |
| **PR-PAY-S7-4A** Cloud Sync Optimization | IMPLEMENT COMPLETE → **OBSERVATION** (`12b09d8`) | debounce + min-interval + focus/visibility throttle + AC4/AC5 |
| **PR-PAY-S7-5** Resurrection Guard | **ETAP 1 DEPLOYED** (`ae132bc`) | S7-5-1 sync tombów + S7-5-2 Edge tombstone-aware |
| **SYNC-ARCH-01 RC-B-1** Tombstone Revocation | **CLOSED** (`35f37b1`) | PWRB facade + I-1…I-4 — fix re-add po delete |
| **RC-B debug overlay cleanup** | **CLOSED** (`24bde6e`) | Usunięto UI overlay; `__wgdomPayrollPipelineDebug` zostaje |

---

## 7. Aktywne problemy P0 (z czym mamy problem)

### 7.1 Problem A — `batch-set` HTTP 500

- **Objaw:** czerwony status synchronizacji podczas zapisu Payroll; zapis nie utrwala się.
- **RCA (MOST PROBABLE, H1 UNCONFIRMED):** `kv.mset` całego bundla (~38 kluczy, ~391 KB, rośnie z `kw-archive`) przekracza *statement timeout* Postgresa → nieprzechwycony throw → opaque 500. Wcześniej brak `app.onError`/`try-catch` (naprawione diagnostycznie w S7-1).
- **Dowód potrzebny (OBSERVATION):** `requestId` · `error.message` · Edge stack · Postgres log — patrz sekcja OBSERVATION w audycie S7.
- **Plan:** S7-1 (diagnostyka) ✅ → S7-4A (mniej ruchu) ✅ OBSERVATION → jeśli 500 nadal → **S7-2 Cloud Batch Hardening** (chunk/izolacja `mset`). S7-3 = singleton klienta Supabase.

### 7.2 Problem B — Resurrection / re-add po delete

- **Resurrection (cross-device):** usunięty pracownik wracał na innym urządzeniu. **Fix:** **S7-5 ETAP 1** (`ae132bc`) — sync `kw-week-employees-deleted-ids` + Edge filtr przed UNION.
- **RC-B (re-add po delete):** po ponownym dodaniu tej samej osoby F5 → znikał. **Root cause:** append-only tomb bez revocation. **Fix:** **RC-B-1** (`35f37b1`) — PWRB + I-1…I-4. Closeout: [`recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md).
- **Status:** mechanizmy **PASS** w testach automatycznych; **manual multi-device AC8–AC11 PENDING**.

---

## 8. Co robimy dalej (next)

1. **Zakończyć Production Observation S7-4A** (metryki `__wgdomSyncMetrics`, czy `batch-set 500` nadal występuje).
2. **Po obserwacji** → automatycznie przygotować **IMPLEMENT ETAP 1 S7-5** (S7-5-1 + S7-5-2) → BUILD → TEST → ponowna obserwacja.
3. **Ocena ETAP 2** (S7-5-3 / S7-5-4) — tylko jeśli resurrection nadal występuje.
4. **Warunkowo S7-2** (batch-set hardening) — jeśli 500 nadal po S7-4A i H1 potwierdzone.
5. **P0 FREEZE** — żadnych nowych EPIC (WC-P3.3 S4 ON HOLD) do zamknięcia incydentu.

---

## 9. Testy (mapa dla sync/payroll)

| Zakres | Skrypt |
|--------|--------|
| Tombstony usuwania | `scripts/test-payroll-deletion-tombstones-pr-pay-s2.mjs` |
| Archive restore eligibility (S6) | `scripts/test-payroll-archive-restore-eligibility-s6.mjs` |
| Edge parity (B6) | `scripts/test-payroll-edge-parity-b6.mjs` |
| Bootstrap/runtime parity (B4) | `scripts/test-payroll-bootstrap-runtime-parity-b4.mjs` |
| Closed week UI (RCA2) | `scripts/test-payroll-closed-week-ui-rca2.mjs` |
| Restore banner false positive | `scripts/test-payroll-restore-banner-false-positive.mjs` |
| Settled merge | `scripts/test-payroll-settled-merge-fix-a.mjs` |
| Sync frequency / throttle (S7-4A) | `scripts/test-payroll-cloud-sync-frequency-s7-4.mjs` |
| (RC-B-1) PWRB boundary | `npm run audit:pwrb` · `scripts/test-pwrb-boundary-rcb.mjs` |
| (RC-B-1) Tombstone revocation | `scripts/test-payroll-tombstone-revocation-rcb.mjs` |
| (S7-5) Resurrection guard | `scripts/test-payroll-resurrection-guard-s7-5.mjs` |

Uruchamianie: `npx vite-node scripts/<plik>.mjs`. Przed release: `npm run build`.

---

## 10. Inwarianty — czego pilnować (dla przyszłego agenta)

1. **PWRB — para roster+tombstones** — mutacje składu tygodnia **tylko** przez `payroll-week-roster-bundle.ts`. Nie zapisuj rosteru i tombów osobno.
2. **G-0** — `K ∈ roster(W)` ⟹ brak `tombstone(W,K)`. Wymuszane przez I-1…I-4.
3. **Parytet klient↔Edge** — `weekEmployeeMergeKey`/union muszą dać ten sam wynik (B6). Wspólny kernel: `payroll-week-employee-merge.ts`.
4. **Week-scope** — nigdy nie mieszaj składu między tygodniami (PR-PAY-S1).
5. **Tombstony week-scoped** — filtr per `${weekFrom}|${weekTo}`; revocation przy re-add (RC-B-1).
6. **Settled = LWW** — richness/union nie cofa nowszego `settledUpdatedAt`.
7. **Force-replace** — usunięcie rostera musi iść z `replaceWeekEmployeesKeys`, inaczej Edge union re-doda.
8. **Nie łącz bundli** — fix payroll ≠ optymalizacja Edge CPU. One Bundle = One Goal.
9. **Przed commitem sync:** `npm run build` + `npm run audit:pwrb` + relevant payroll smoke.
10. **PowerShell** — brak `&&`/heredoc; commit `-m` jednolinijkowy lub `git commit -F plik.txt`.

---

*SSOT tego przewodnika: ten plik. Utrzymuj przy zmianach `cloud-sync.ts` / Edge `index.tsx` / kluczy KV. Aktualizuj status P0 przy zamknięciu S7-4A / S7-5.*
