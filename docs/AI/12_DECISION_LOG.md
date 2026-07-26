# 12 — Decision Log (WGDOM)

> Najważniejsze decyzje architektoniczne. **Obowiązuje = TAK** dopóki Owner nie superseduje DF/ADR.

---

## D-01 — Vite/React SPA (nie Next.js)

| | |
|--|--|
| **Data** | historyczna / utrzymana |
| **Powód** | PWA + Capacitor + prosty deploy Vercel |
| **Alternatywy** | Next SSR |
| **Dlaczego** | Brak wymogu SSR; monolit admin już na Vite |
| **Obowiązuje** | **TAK** |

---

## D-02 — LocalStorage + Supabase KV jako primary data plane

| | |
|--|--|
| **Data** | foundational |
| **Powód** | Offline-ish admin, multi-device merge |
| **Alternatywy** | pure Postgres rows / Firebase |
| **Dlaczego** | Szybkość UI + Edge batch API |
| **Obowiązuje** | **TAK** (ADR Sync = ewolucja, nie wymiana z dnia na dzień) |

---

## D-03 — Single Edge Function `make-server-0afb8820`

| | |
|--|--|
| **Powód** | Jeden kontrakt API app |
| **Alternatywy** | wiele functions |
| **Obowiązuje** | **TAK** |

---

## D-04 — Deploy FE tylko przez `git push main` → Vercel

| | |
|--|--|
| **Powód** | Determinizm, zero CLI drift |
| **Zakaz** | `vercel deploy` |
| **Obowiązuje** | **TAK** · `WORKFLOW-RELEASE-DEPLOY.md` |

---

## D-05 — VERIFY DEPLOY FAST (jedno curl)

| | |
|--|--|
| **Powód** | Uniknąć agent loops na propagacji |
| **Obowiązuje** | **TAK** |

---

## D-06 — Owner GO + Stabilization Window

| | |
|--|--|
| **Data** | 2026-07 |
| **Powód** | Chronić CORE po serii P0 |
| **Obowiązuje** | **TAK** · `#WORKFLOW-OWNER-GO-001` |

---

## D-07 — #CORE-013 zero mixed bundles

| | |
|--|--|
| **Powód** | Regresje LP przy FEATURE |
| **Obowiązuje** | **TAK** · CORE-01A |

---

## D-08 — Payroll Domain Push + PWRB + Fence + Rollover classifier

| | |
|--|--|
| **Data** | 2026-07 (seria) |
| **Powód** | Cross-device LP; anty-resurrection; ALIGN≠wipe |
| **Alternatywy** | pełny RS push payroll; free-form roster edits |
| **Obowiązuje** | **TAK** |

---

## D-09 — Photos union merge + delete tombstones

| | |
|--|--|
| **Data** | 2026-07 |
| **Powód** | Utrata / resurrect zdjęć |
| **Obowiązuje** | **TAK** |

---

## D-10 — Tender Workflow V4 SSOT (`WORKFLOW-ARCHITECTURE-v2.63`)

| | |
|--|--|
| **Powód** | Jedna nawigacja Hub/CTA/tabs |
| **Obowiązuje** | **TAK** |

---

## D-11 — TEUX token freeze (typography import-only)

| | |
|--|--|
| **Powód** | Spójność design systemu Przetargi |
| **Wyjątek** | TWSL layout tokens z Owner GO |
| **Obowiązuje** | **TAK** |

---

## D-12 — Sync Storm P0: E-RUN bez builtAt; partial local; final cloud

| | |
|--|--|
| **Data** | 2026-07-24 |
| **Powód** | Incident 23.07 — pętla fat persist |
| **Alternatywy** | debounce-only; Edge chunk only |
| **Dlaczego** | Usuwa root cause restartu; chunk to osobny epic |
| **Obowiązuje** | **TAK** · Final Audit READY |

---

## D-13 — Deadlock retry tylko 40P01 (nie CF 522)

| | |
|--|--|
| **Data** | 2026-07 · N1 |
| **Powód** | Transient DB deadlock ≠ origin timeout HTML |
| **Obowiązuje** | **TAK** |

---

## D-14 — Theme-01C next-themes standard (#THEME-020)

| | |
|--|--|
| **Data** | 2026-07 |
| **Powód** | FOUC / dual bridges |
| **Obowiązuje** | **TAK** |

---

## D-15 — LOCALSTORAGE-ARCH-02 A–E (IDB cold); 02F gated

| | |
|--|--|
| **Data** | 2026-07 |
| **Powód** | Quota / cold storage |
| **02F** | GO ale **NOT STARTED** bez IMPLEMENT |
| **Obowiązuje** | A–E **TAK**; 02F **GATED** |

---

## D-16 — Diag AUTO_ENABLE OFF po Incident 23.07 cleanup

| | |
|--|--|
| **Data** | 2026-07-24 · 2.65.39 |
| **Powód** | Hałas / ryzyko na prod |
| **KEEP DEBUG** | API zostaje, default off |
| **Obowiązuje** | **TAK** |

---

## D-17 — ADR Cloud Sync = PROPOSED (Evidence Gate OPEN)

| | |
|--|--|
| **Powód** | Duża migracja wymaga dowodów |
| **IMPL** | **BLOCKED** do Gate |
| **Obowiązuje** | Status ADR **TAK** |

---

## D-18 — HARDENING-01A Persist SSOT (bootstrap local + opts forward)

| | |
|--|--|
| **Data** | 2026-07-24 · **2.65.40** · **`23d7723`** |
| **Powód** | Residual Final Audit H1/H2 — fat cloud przy bootstrap / drop opts w UI |
| **Decyzja** | Mid-flight `{persist:"local"}` · ≤1 terminal `{persist:"cloud"}` · `bindTenderPipelineOnUpdate` · kill-switch `pipelineBootstrapPersistLocal` default ON |
| **OUT** | Heavy E-RUN / breaker / `builtAt` / cloud-sync / Payroll |
| **Alternatywy** | Global debounce ON; thinner payload only |
| **Dlaczego** | Reuse istniejącego `TenderItemUpdateOpts` bez naruszania Sync Storm P0 |
| **Obowiązuje** | **TAK** · Closeout [`WGDOM-HARDENING-01A-CLOSEOUT.md`](../architecture/WGDOM-HARDENING-01A-CLOSEOUT.md) |

---

## D-19 — HARDENING-01D Edge 546 Monitoring (M2-A monitor-only)

| | |
|--|--|
| **Data** | 2026-07-24 · UI **2.65.40** · feature **`23d7723`** · docs tip **`96d44d0`** |
| **Powód** | Residual Final Audit M2 — sporadyczny HTTP 546 przy multi-open; potrzeba mierzalnego sygnału Stabilization |
| **Decyzja** | M2-A tooling/docs: smoke + progi WARN/FAIL + trend ledger + runbook; **zero** runtime / Cloud Sync / retry 546 / Edge chunk |
| **D-V3** | **DEFER** (`statusByPath=null`) — re-open tylko Owner GO + DF amendment |
| **OUT** | Naprawa 546 · Edge chunk · retry · `src/**` |
| **Alternatywy** | M2-C chunk (gated osobny); retry 546 (zakazane) |
| **Dlaczego** | 546 = `WORKER_RESOURCE_LIMIT` (load signal); 01A już obniżył pipeSet; monitor chroni przed regresją bez blast radius |
| **Obowiązuje** | **TAK** · Closeout [`WGDOM-HARDENING-01D-CLOSEOUT.md`](../architecture/WGDOM-HARDENING-01D-CLOSEOUT.md) · residual **M-EDGE-546 = MONITOR** |

---

## D-20 — HARDENING-01B0 Circuit Breaker Telemetry (H3-C monitor-only)

| | |
|--|--|
| **Data** | 2026-07-24 · UI **2.65.40** · feature **`23d7723`** · docs tip **`fcf66b0`** |
| **Powód** | Residual Final Audit H3 — bounded FP churn bez mierzalnej telemetry Stabilization |
| **Decyzja** | H3-C tooling/docs: smoke + M1–M5 + progi WARN/FAIL + trend ledger + runbook; **zero** runtime / breaker semantics / limits / deps / `builtAt` / B1 / CORE |
| **M6** | **DEFER** (`includeM6=false`) — re-open tylko Owner GO + DF amendment |
| **OUT** | Zmiana limitu 2 · B1 global cap · „FIXED” H-FP-CHURN · `src/**` |
| **Alternatywy** | B1 H3-A/B (gated); podniesienie limitu (zakazane w Stabilization) |
| **Dlaczego** | Per-FP breaker by design (P0 G2/T3); monitor chroni przed regresją limitu i anomalią trips bez blast radius |
| **Obowiązuje** | **TAK** · Closeout [`WGDOM-HARDENING-01B0-CLOSEOUT.md`](../architecture/WGDOM-HARDENING-01B0-CLOSEOUT.md) · residual **H-FP-CHURN = MITIGATED / MONITOR** |

---

## D-15 — Payroll hours-collapse protections (D1–D5)

| | |
|--|--|
| **Data** | 2026-07-24 |
| **Powód** | INCIDENT-01 partial hours wipe na Domain Push bez ACK; brak recovery z `-prev` / Soft Restore |
| **Decyzja** | DF-01 D1–D5: passive telemetry · Domain Gate+confirm · `intentionalHoursClear` ⇔ `skipPayrollGuard` · `-prev` Recovery Banner · Soft Restore overlay (factory PURE) · D6 Domain Push SSOT constraint |
| **OUT** | Zmiana W1/W2 entry · Cloud Sync merge semantics · resurrection fence · CI Gate B (osobny EPIC) |
| **Alternatywy** | Sam shrink guard (>50%) — niewystarczający (C4); mutacja `weekEmployeeFromDir` — zakaz (C5) |
| **Dlaczego** | Primary = D2 Domain Gate; D3 secondary; recovery UX bez regresji archive Restore Banner |
| **Obowiązuje** | **TAK** · Closeout [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) · tip **2.65.43** / **`ea1b0a6`** |

---

## D-21 — GLOBAL-DESIGN-SYSTEM-01 (global UI SSOT + DS-13)

| | |
|--|--|
| **Data** | 2026-07-26 · EPIC **CLOSED** |
| **Powód** | Po premium Login (2.65.46) admin UI był niespójny (legacy dense + dormant shadcn); potrzeba jednego SSOT poza TEUX |
| **Decyzja** | SSOT = `src/lib/wg-ui-tokens.ts` + `WgButton` · `WgField` · `WgCard` · `WgModalFrame`; slices S0–S4 (Login → focus/overlay → Topbar → CTA/Search allowlist → Modal allowlist); TEUX / Payroll CORE **OUT** |
| **DS-13** | **No Parallel Design Systems** — nowe komponenty UI wyłącznie Wg*; zakaz nowych lokalnych Button/Input/Modal; zakaz reaktywacji `components/ui` (shadcn) bez świadomej decyzji architektonicznej (Owner + DF) |
| **OUT** | Dashboard full reskin · Sidebar · Payroll CORE · Cloud Sync · Edge · auth/routing/API · TEUX rewrite |
| **GDS-02** | Nie startować pełnego EPIC bez Owner GO; prefer soak + wąski high-traffic |
| **Alternatywy** | Adopcja shadcn jako global SSOT — odrzucone (dormant kit, Login bar = Wg*) |
| **Dlaczego** | Jedna ścieżka chrome; chroni Login quality bar; zero blast radius na CORE |
| **Obowiązuje** | **TAK** · Closeout [`GLOBAL-DESIGN-SYSTEM-01-EPIC-CLOSE-REPORT.md`](../architecture/GLOBAL-DESIGN-SYSTEM-01-EPIC-CLOSE-REPORT.md) · tip UI nadal **2.65.46** do release commit |
| **Post-epic MAINT** | **GLOBAL-DESIGN-SYSTEM-MAINT-01 CLOSED** — SOAK-01+03 WDROŻONE · SOAK-02/06 DEFER · [`GLOBAL-DESIGN-SYSTEM-MAINT-01-CLOSE-REPORT.md`](../architecture/GLOBAL-DESIGN-SYSTEM-MAINT-01-CLOSE-REPORT.md) · **nie** re-open GDS-01 |

---

## D-22 — UI Foundation v1.0 + Dashboard Body S1–S4 COMPLETE

| | |
|--|--|
| **Data** | 2026-07-26 · **COMPLETE** |
| **Powód** | Po GDS chrome nadal mid-body (Braki/Pilne/Notatki/Przetargi skrót) = legacy/TEUX paint + ryzyko second Primary |
| **Decyzja** | (1) Foundation v1.0 = shell+sidebar+topbar+Roboty+A11Y+e2e-ui-guard **COMPLETE**; (2) Body S1–S4 = thin paint-only → `WgCard` soft · ghost/secondary CTA · **0** Primary w body; (3) semantyka V3 / liczniki / TEUX Strategia **OUT** |
| **Thin** | Każdy slice = 1 src + DF + IMPLEMENT · osobny PV · tip w `09` |
| **OUT / backlog** | S5 rows W08/W09 · S6 guard body · GDS-02 · Payroll CORE |
| **Dlaczego** | Jeden język GDS na Pulpicie bez blast radius CORE |
| **Obowiązuje** | **TAK** · Foundation [`WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) · Body [`WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) · tip live **`1e07574`** / feature S4 **`bd0f239`** |

---

## Jak dodać decyzję

1. Nowy wpis D-xx z datą, powodem, alternatywami.  
2. Link do DF/ADR/Closeout.  
3. Ustaw **Obowiązuje**.  
4. Jeśli superseduje starą — oznacz starą **NIE** + pointer.
