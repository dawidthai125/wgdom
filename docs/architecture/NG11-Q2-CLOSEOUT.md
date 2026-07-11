# NG11-Q2 — Parallel Archive Unpack · CLOSEOUT

> **Program:** NG11-TENDER-PIPELINE-PERFORMANCE  
> **Slice:** **NG11-Q2**  
> **Prod:** UI **2.63.98** · https://www.wgdom.fun · **PRODUCTION VERIFIED** (2026-07-11)  
> **Feature commit:** **`608c9ec`**  
> **SSOT plan:** [`NG11-Q2-PARALLEL-ARCHIVE-UNPACK-AUDIT-PLAN.md`](./NG11-Q2-PARALLEL-ARCHIVE-UNPACK-AUDIT-PLAN.md)  
> **Release verify:** [`NG11-Q2-RELEASE-VERIFICATION.md`](./NG11-Q2-RELEASE-VERIFICATION.md)

---

## Werdykt

| Pole | Wartość |
|------|---------|
| **Status** | **EPIC SLICE CLOSED** · **PRODUCTION VERIFIED** |
| **OWNER QA** | **PASS** |
| **Test release** | **76/76 PASS** |
| **PG-Q2** | **PASS (harness proxy · −49.8% P50)** |
| **Flaga** | `pipelinePerfUnpackParallel` default **OFF** |
| **Rollback** | Wyłącz flagę w ⚙ Super Admin |

---

## Zakres dostarczony

| Element | Status |
|---------|--------|
| Parallel ZIP/7Z unpack ≤2 | **DONE** |
| Immutable worker results | **DONE** |
| Serial deterministic merge po `doc.index` | **DONE** |
| Końcowy `sort` bez zmian | **DONE** |
| Flaga `pipelinePerfUnpackParallel` default OFF | **DONE** |
| Super Admin toggle | **DONE** |
| `test-ng11-unpack-parallel.mjs` | **DONE** (10/10) |

---

## Kluczowe pliki

| Plik | Rola |
|------|------|
| `tender-archive-unpack-concurrency.ts` | `runArchiveUnpackWithConcurrency` · limit **2** |
| `tender-document-resolver.ts` | `buildTenderDocCandidates` · fazy outer → unpack → merge → sort |
| `app-settings.ts` | feature flag |
| `AdminSettingsModal.tsx` | Super Admin checkbox |

---

## Boundary (PASS)

**Nie dotknięto:** Payroll · `cloud-sync.ts` kernel · `App.tsx` CORE · Edge · NG10 gate · `wgdom-7z-archive.ts` internals · parsery fidelity · pipeline runtime business logic.

---

## Pre-existing (out of scope)

3 znane FAIL w pełnej regresji dossier/7Z — **niezwiązane z bundlem Q2** (patrz [`NG11-Q2-RELEASE-VERIFICATION.md`](./NG11-Q2-RELEASE-VERIFICATION.md) § Pre-existing).

---

**Następny program**

**NG11-A3** — discovery fork — **AUDIT NOT STARTED** (po A2 closeout ✅).

SSOT: [`NG11-PIPELINE-PERFORMANCE-DESIGN-FREEZE.md`](./NG11-PIPELINE-PERFORMANCE-DESIGN-FREEZE.md) § A3.

**IMPLEMENT A3 NOT STARTED** — czeka na pełny closeout A2 ✅.

---

*NG11-Q2 closeout · PRODUCTION VERIFIED · 2026-07-11*
