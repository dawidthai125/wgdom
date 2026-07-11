# NG11-A3 — Discovery Fork · CLOSEOUT

> **Program:** NG11-TENDER-PIPELINE-PERFORMANCE  
> **Slice:** **NG11-A3**  
> **Prod:** UI **2.64.0** · https://www.wgdom.fun · **PRODUCTION VERIFIED** (2026-07-11)  
> **Feature commit:** **`78c0a40`**  
> **SSOT plan:** [`NG11-A3-DISCOVERY-FORK-AUDIT-PLAN.md`](./NG11-A3-DISCOVERY-FORK-AUDIT-PLAN.md)  
> **Release verify:** [`NG11-A3-RELEASE-VERIFICATION.md`](./NG11-A3-RELEASE-VERIFICATION.md)

---

## Werdykt

| Pole | Wartość |
|------|---------|
| **Status** | **EPIC SLICE CLOSED** · **PRODUCTION VERIFIED** |
| **OWNER QA** | **PASS** |
| **RELEASE PRECHECK** | **PASS** |
| **Test release** | **95/95 PASS** (A3 smoke release) · **138/138** full NG11 regresja |
| **PG-A3** | **PASS** (harness proxy · −35% P50 mock empty BZP) |
| **Flaga** | `pipelinePerfDiscoveryFork` default **OFF** |
| **Rollback** | Wyłącz flagę w ⚙ Super Admin |

---

## Zakres dostarczony

| Element | Status |
|---------|--------|
| Speculative external ∥ BZP (`mode=auto` only) | **DONE** |
| Cancel/discard external gdy BZP > 0 | **DONE** |
| External timeout **45 s** | **DONE** |
| T1 network pool **≤2** | **DONE** |
| Flaga `pipelinePerfDiscoveryFork` default OFF | **DONE** |
| Super Admin toggle | **DONE** |
| Bootstrap `isCancelled` wire (unmount) | **DONE** |
| Manual/rescan waterfall bez fork | **DONE** |
| `test-ng11-discovery-fork.mjs` | **DONE** (27/27) |
| Fork meta telemetry (`forkStarted/Cancelled/Won/TimedOut`) | **DONE** |

---

## Smoke scenariusze (OWNER QA + harness)

| Scenariusz | Werdykt | Dowód |
|------------|---------|-------|
| `mode=auto` + puste BZP → speculative external | **PASS** | O2 · J4-J5 · PG-A3 |
| BZP zwraca dokumenty → discard external | **PASS** | O3 · J1-J3 |
| Timeout **45 s** | **PASS** | C1 frozen constant |
| Unmount → cancel | **PASS** | J6 · bootstrap `isCancelled` |
| Manual → waterfall | **PASS** | P2 · O1 |
| Rescan → waterfall | **PASS** | P2 rescan · fork tylko `auto` |

---

## Kluczowe pliki

| Plik | Rola |
|------|------|
| `tender-discovery-fork.ts` | Fork scheduler · T1 pool · timeout · join |
| `tender-full-document-discovery.ts` | Orchestrator wire · fork meta |
| `useTenderDocumentsBootstrap.ts` | `isCancelled` z hooka |
| `app-settings.ts` | feature flag |
| `AdminSettingsModal.tsx` | Super Admin checkbox |

---

## Boundary (PASS)

**Nie dotknięto:** Payroll · `cloud-sync.ts` kernel · Edge `tenders-external-discover` · `App.tsx` CORE · NG10 gate-exit · parsery fidelity · pipeline runtime business logic.

**Potwierdzone:** brak regresji parser fidelity (gate-exit **28/28**) · brak zmian kontraktu Edge · T1 pool ≤2 · rollback flag OFF.

---

## Interakcja NG11

| Slice | Werdykt |
|-------|---------|
| **A1** progressive heavy | **COMPAT** — wcześniejszy discovery |
| **Q1/Q2** parse/unpack | **COMPAT** — downstream |
| **Q3** debounced persist | **COMPAT** — ten sam persist path |
| **A2** artifact cache | **COMPAT** — fingerprint miss on new external files |
| **NG10** gate-exit | **COMPAT** — 28/28 |

---

## Następny program

**NG11-A5** — strategic/economic decision — **BLOCKED** do pełnego closeout A3 ✅ · workflow: AUDIT → Owner GO.

SSOT: [`NG11-PIPELINE-PERFORMANCE-DESIGN-FREEZE.md`](./NG11-PIPELINE-PERFORMANCE-DESIGN-FREEZE.md) § A5.

**IMPLEMENT A5 NOT STARTED.**

---

*NG11-A3 closeout · PRODUCTION VERIFIED · 2026-07-11*
