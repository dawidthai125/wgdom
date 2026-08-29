# PAYROLL — Guard Rails (AI Safety)

> **Rola:** kontrakt bezpieczeństwa **Listy Płac** dla AI.  
> **Globalne zakazy:** [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md) (czytaj też).  
> **Treść invariants / przepływ:** [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) — **ten plik nie duplikuje diagramów**.  
> **Proces:** [`PAYROLL_AI_PLAYBOOK.md`](PAYROLL_AI_PLAYBOOK.md)

```text
Gdy wątpliwość → STOP → AUDIT / Owner.
Nie zgaduj. Nie obchodź guardów. Nie psuj LP.
```

---

## 1. Zakazane zmiany (Payroll)

| # | Zakaz |
|---|--------|
| P1 | Nowy write path godzin / roster **omijający** Domain Push / PWRB |
| P2 | `skipPayrollGuard: true` **bez** `intentionalHoursClear === true` |
| P3 | Mylenie `intentionalHoursClear` z `isIntentionalPayrollWeekClear` lub `isPayrollRolloverWeekClear` (§5B SSOT) |
| P3b | Ustawianie `payrollWeekRolloverPush` poza `pushPayrollWeekAfterRollover` |
| P4 | Side-effecty w `weekEmployeeFromDir` (musi **PURE**) |
| P5 | Mutacja składu tygodnia **poza** PWRB |
| P6 | Usuwanie / omijanie `payroll-bootstrap-resurrection-fence` |
| P7 | Cofanie `classifyPayrollWeekTransition` (ALIGN ≠ wipe) |
| P8 | Przywracanie `kw-week-employees` do RS `runCloudSync` push |
| P9 | Zmiana semantyki `finalizePayrollBundleMerge` / `mergeWeekEmployees*` bez DF+GO |
| P10 | Łączenie D4 `-prev` banner z archive Restore Banner |
| P11 | Direct `fetch` / `batch-set` z UI Payroll |
| P12 | Mixed commit FEATURE + `cloud-sync` / payroll / Edge |
| P13 | „Temporary HACK” w CORE bez ticketu |
| P14 | Start nowego Payroll EPIC bez Owner GO (STABILIZATION) |
| P15 | Traktowanie Gate B CI / TEUX jako „fix Payroll” |
| **P16** | Traktowanie **Freshness Gate jako jedynej** ochrony payloadu (Freshness ≠ canonical) |
| **P17** | Przywracanie ślepego closed-over `weekEmployees` jako outgoing bez `rebuildPayrollOutgoingAfterFreshness` |
| **P18** | Osłabianie `extraCosts` baseline (`before ≡ cloud`) lub P0/P2/CAS „bo testy przechodzą” |
| **P19** | Nowy `skipCloudFreshnessGate: true` poza CloudLoader post-merge / internal reentry po ensure |
| **P20** | Oznaczanie Payroll GREEN przy FAIL regression gate bez Owner review |

---

## 2. Miejsca krytyczne (blast radius)

| Plik / obszar | Ryzyko |
|---------------|--------|
| `src/lib/cloud-sync.ts` | Merge, push, guardy, RS vs Domain Push, **canonical rebuild** |
| `src/lib/cloud-freshness-gate.ts` | Write barrier · resume · storage |
| `src/lib/payroll-field-intent.ts` | P2 · **extraCosts baseline** |
| `src/app/CloudLoader.tsx` | Bootstrap merge + fence · intentional skip gate |
| `src/lib/payroll-domain-sync.ts` | Domain Push debounce |
| `src/lib/payroll-week-roster-bundle.ts` | PWRB — jedyna mutacja składu |
| `src/lib/payroll-week-employee-merge.ts` | Parity klient↔Edge |
| `src/lib/payroll-hours-collapse-gate.ts` | Domain Gate D2 |
| `src/lib/payroll-bootstrap-resurrection-fence.ts` | Anti-resurrection |
| `src/lib/payroll-cycle.ts` / rollover | ALIGN vs ROLLOVER |
| `src/lib/payroll-prev-recovery.ts` / soft-restore | D4/D5 |
| `App.tsx` handlery LP | Orkiestracja — łatwo dodać drugi write path · resume |
| `WorkerPhotoView.tsx` | Worker `pwrPush` · resume parity |
| `PayrollView.tsx` / `WeekEmployeeDetail.tsx` | UI → łatwo pominąć gate |
| Edge `make-server-0afb8820` merge | Shrink/expansion — multi-device |
| `cloud-sync-mutation-guard.ts` | Pull podczas mutacji |

---

## 2b. Regression Watch (skrót)

Pełna lista + suite: [`../architecture/PAYROLL-FRESHNESS-PAYLOAD-2.66.126-INCIDENT-CLOSEOUT.md`](../architecture/PAYROLL-FRESHNESS-PAYLOAD-2.66.126-INCIDENT-CLOSEOUT.md) §9.

```text
Przed zmianą Payroll/cloud-sync/Edge:
□ Freshness mandatory? Canonical rebuild?
□ Brak batch-set bypass? RS still excludes payroll?
□ P0 / P2 / extraCosts before≡cloud / CAS?
□ storage/resume → unknown? offline blocks?
□ Worker/mobile parity? New write path?
□ Suites: freshness · hardening · P0 · P2 · settlement · early · MA · roster · P1 · mutation guard · build
FAIL → STOP
```

---

## 3. Kolejność analiz przed zmianą

```text
1. Dependency Map — czy ten plik jest Shared z Payroll?
2. FEATURE vs CORE (#CORE-013 / #CORE-014 Boundary Check)
3. Czy dotyka W1 (skład) czy W2 (godziny) czy merge pull?
4. Czy istnieje już facade (PWRB / Domain Push)? → reuse
5. Jaki invariant SSOT §2 mógłby pęknąć?
6. Czy był podobny incident? → Regression History
7. Owner GO? DF?
```

---

## 4. Checklist — przed implementacją

```text
□ 08 + ten Guard Rails + SSOT §1–3
□ 09 tip prod
□ Dependency Map przejrzana
□ Playbook: klasyfikacja FEATURE/CORE
□ Owner GO jeśli CORE IMPLEMENT
□ DF jeśli merge/guard/fence/write path
□ Plan testów (Gate B payroll + unit D2–D5 jeśli hours)
□ Zero „omijania” Domain Gate / PWRB
□ Nie ruszam PURE weekEmployeeFromDir
```

---

## 5. Checklist — przed commit

```text
□ Diff ⊆ scope DF / brief
□ Brak mixed CORE+FEATURE
□ Brak sekretów
□ Nowe pliki src tracked
□ CHANGELOG jeśli UI widoczne
□ Gate B payroll PASS (gdy CORE)
□ Owner poprosił o commit
```

---

## 6. Checklist — przed push

```text
□ Owner poprosił o push
□ RELEASE A/B/C według WORKFLOW-RELEASE-DEPLOY
□ Nie vercel CLI deploy
□ Po push: jedno curl version.json (bez retry loop)
□ Obserwacja: dual-device LP jeśli CORE sync
```

---

## 7. Najczęstsze błędy AI (anty-wzorzec)

| Błąd | Dlaczego boli | Zamiast tego |
|------|---------------|--------------|
| „Szybki batch-set z PayrollView” | Omija guardy | Domain Push / PWRB |
| „skipPayrollGuard zawsze true” | Hours Wipe | Tylko po Gate + intentionalHoursClear |
| Soft Restore w factory directory | Side-effects / złe seedowanie | Overlay D5 |
| Merge „dla jednego urządzenia” | Psuje drugie urządzenie | UNION + tombstones DF |
| Usunięcie fence „żeby E2E przeszło” | Resurrection prod | Seed / harness — nie fence |
| FEATURE Tenders + cloud-sync w 1 commit | Regresja LP dni później | Osobne bundle |
| Hotfix merge po wipe | Maskuje RC | AUDIT → RCA → DF |
| „Freshness Gate naprawił wszystko” | Ignoruje closed-over payload | Canonical rebuild + P0/P2 + CAS |
| `extraCosts` bez `before ≡ cloud` | Stale costs overwrite | Field-intent baseline (2.66.126) |

---

## 8. Quality Gate (skrót)

Szczegóły: [`../PAYROLL-QUALITY-GATE.md`](../PAYROLL-QUALITY-GATE.md) (jeśli ACTIVE) + Gate B `--scope payroll`.

**Werdykt AI:** bez checklist §4–6 → **nie commit / nie push**.
