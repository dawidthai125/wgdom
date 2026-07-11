# NG11-A2 — Dossier Artifact Cache · CLOSEOUT

> **Program:** NG11-TENDER-PIPELINE-PERFORMANCE  
> **Slice:** **NG11-A2**  
> **Prod:** UI **2.63.99** · https://www.wgdom.fun · **PRODUCTION VERIFIED** (2026-07-11)  
> **Feature commit:** **`447a58b`**  
> **SSOT plan:** [`NG11-A2-ARTIFACT-CACHE-AUDIT-PLAN.md`](./NG11-A2-ARTIFACT-CACHE-AUDIT-PLAN.md)  
> **Release verify:** [`NG11-A2-RELEASE-VERIFICATION.md`](./NG11-A2-RELEASE-VERIFICATION.md)

---

## Werdykt

| Pole | Wartość |
|------|---------|
| **Status** | **EPIC SLICE CLOSED** · **PRODUCTION VERIFIED** |
| **OWNER QA** | **PASS** |
| **Test release** | **92/92 PASS** (smoke release) |
| **PG-A2** | **PASS (harness proxy · −100% P50 mock hit)** |
| **Flaga** | `pipelinePerfArtifactCache` default **OFF** |
| **Rollback** | Wyłącz flagę w ⚙ Super Admin |

---

## Zakres dostarczony

| Element | Status |
|---------|--------|
| Session artifact cache (cost + full) | **DONE** |
| LRU cap **12** | **DONE** |
| Key: normalized fingerprint + `CURRENT_PARSER_VERSION` + phase | **DONE** |
| Immutable snapshots (`structuredClone`) | **DONE** |
| `isDossierParserStale` force miss | **DONE** |
| Flaga `pipelinePerfArtifactCache` default OFF | **DONE** |
| Super Admin toggle | **DONE** |
| `test-ng11-artifact-cache.mjs` | **DONE** (21/21) |
| Telemetry hit phase (session) | **DONE** |

---

## Kluczowe pliki

| Plik | Rola |
|------|------|
| `tender-dossier-artifact-cache.ts` | Session Map · LRU · key normalize · stale guard |
| `tender-dossier-pipeline.ts` | cost/full hit-miss wire · store po parse |
| `app-settings.ts` | feature flag |
| `AdminSettingsModal.tsx` | Super Admin checkbox |

---

## Boundary (PASS)

**Nie dotknięto:** Payroll · `cloud-sync.ts` kernel · `App.tsx` CORE · Edge · NG10 gate · `wgdom-7z-archive.ts` internals · parsery fidelity · pipeline runtime business logic · KV persist cache.

---

## Interakcja NG11

| Slice | Werdykt |
|-------|---------|
| **A1** progressive heavy | **COMPAT** — phase-split cache |
| **Q1** parse concurrency | **COMPAT** — hit pomija parse loop |
| **Q2** unpack parallel | **COMPAT** — hit pomija P8 upstream |
| **Q3** debounced persist | **COMPAT** — ten sam `onUpdate` path |

---

## Następny program

**NG11-A5** — strategic/economic decision — **BLOCKED** do pełnego closeout A3 ✅ · workflow: AUDIT → Owner GO.

SSOT: [`NG11-PIPELINE-PERFORMANCE-DESIGN-FREEZE.md`](./NG11-PIPELINE-PERFORMANCE-DESIGN-FREEZE.md) § A5 · [`NG11-A3-CLOSEOUT.md`](./NG11-A3-CLOSEOUT.md).

**IMPLEMENT A5 NOT STARTED.**

---

*NG11-A2 closeout · PRODUCTION VERIFIED · 2026-07-11*
