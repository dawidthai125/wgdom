# PAYROLL-ARCH-REVIEW-01 — ARCHITECTURE REVIEW

> **ID:** PAYROLL-ARCH-REVIEW-01  
> **STATUS:** ARCH REVIEW COMPLETE · **P0**  
> **Data:** 2026-07-24  
> **Owner GO:** ARCH REVIEW ONLY  
> **Wejście:** [`PAYROLL-DESIGN-FREEZE-01.md`](./PAYROLL-DESIGN-FREEZE-01.md) · [`PAYROLL-RCA-01-ROOT-CAUSE-AND-DESIGN-PLAN.md`](./PAYROLL-RCA-01-ROOT-CAUSE-AND-DESIGN-PLAN.md) · `docs/AI/03_ENGINEERING_RULES.md`  
> **Poza zakresem:** implementacja · DF rewrite pełny · commit · push  
> **Baseline:** UI **2.65.40** · Domain Push ACTIVE · STABILIZATION ACTIVE

```text
════════════════════════════════════════════════════════
PAYROLL-ARCH-REVIEW-01 — VERDICT

Design Freeze NIE narusza architektury SSOT / Domain Push.
Implementacja MOŻE startować po DF AMENDMENT (korekty poniżej)
— bez zmiany zestawu IN D1–D6.

PASS WITH REQUIRED CORRECTIONS (amendment-level)
════════════════════════════════════════════════════════
```

---

## 1. Architecture Review

### 1.1 Zgodność z Owner Principles

| Zasada | Werdykt | Komentarz |
|--------|---------|-----------|
| **SSOT FIRST** | **PASS** | D6 zatrzymuje Domain Push jako jedyny zapis godzin; D4 restore kończy się domain push, nie local-only |
| **REUSE FIRST** | **PASS WITH CORRECTIONS** | D1→`payrollTraceEmit`; D3→`applyPayrollGuardBeforePush` / `wouldBlockPayrollShrink`; D4→`payrollMetrics` + richer-than **pattern** (nie ten sam banner co archive) |
| **ZERO DUPLICATE LOGIC** | **PASS WITH CORRECTIONS** | Unikać drugiej metryki godzin; **nie** mylić nowej flagi z istniejącym `isIntentionalPayrollWeekClear` |
| **MOBILE FIRST** | **PASS** | D2 jeden confirm na destrukcję; D5 default restore = mniej klików na telefonie; brak nowego sync modelu |

### 1.2 Omijanie warstw?

| Pytanie | Werdykt |
|---------|---------|
| Dublowanie logiki? | **Ryzyko** przy złym REUSE banera archive / nazwy „intentional*” → **C1–C3** |
| Omija Domain Layer? | **Nie**, jeśli D2 policy + D5 overlay siedzą w domain/PWRB (nie tylko w `PayrollView`) → **C2, C5** |
| Omija Payroll write pipeline? | **Nie** — owija W1/W2 przed `pwrPush` |
| Omija Cloud SSOT? | **Nie** — D6 zakazuje RS payroll set |

### 1.3 Pytania Ownera (szczegół)

#### Q3 — Czy Confirmation UX wyłącznie warstwą UI?

**NIE (ARCH FROZEN clarification).**

| Warstwa | Rola |
|---------|------|
| **UI** | Prezentacja dialogu, Cancel/OK |
| **Domain** | Predykat destrukcji (D14), blokada `schedulePayrollDomainPush` / `pwrPush` bez ACK, ustawienie flagi domenowej |

Sam UI confirm **bez** domain gate da się ominąć (inne call sites, przyszły Worker hours, skrypt).  
**FROZEN:** *policy in domain · chrome in UI*.

#### Q4 — `intentionalClear` tylko domenowa, bez wpływu na inne ścieżki?

**TAK, z korektą nazwy (C1).**

- Flaga **tylko** na opcjach push `kw-week-employees` / `PushWeekEmployeesOptions`.  
- **Nie** wpływa na jobs, directory, tenders, RS non-payroll.  
- **Nie** mylić z istniejącym `isIntentionalPayrollWeekClear` (= **pusty roster** po archiwizacji tygodnia — inna semantyka).

#### Q5 — Recovery Banner / Soft Restore a semantyka Payroll?

| Element | Czy zmienia merge/LWW/SSOT model? | Czy zmienia UX outcome? |
|---------|-----------------------------------|-------------------------|
| D4 Banner | **Nie** (read + świadomy restore push) | Tak (CTA) |
| D5 Soft Restore | **Nie** zmienia `weekEmployeeFromDir` pure; **overlay** days przed push | **Tak** — re-add default = zachowaj godziny |

To jest **zamierzona** zmiana produktu w DF D5, nie zmiana Cloud Sync merge core.  
**Semantyka SSOT/pipeline: zachowana. Semantyka UX re-add: ewoluuje (DF IN).**

#### Q6 — Telemetry całkowicie pasywna?

**TAK (wymóg ARCH).**  
D1: emit only · zero `return` early · zero mutacji roster · zero zmiany `skipPayrollGuard` · konsola opt-in.

---

## 2. Architecture Matrix

| ID | Element | SSOT | REUSE | Zero Dup | Mobile | Ryzyko arch | Mitigacja |
|----|---------|------|-------|----------|--------|-------------|-----------|
| **D1** | Telemetry | n/a | `payrollTraceEmit` / write-trace ring | jeden emitter | OK | flood / AUTO_ENABLE | ring always · console opt-in · **zakaz** AUTO_ENABLE |
| **D2** | Confirm | push po ACK | predikat wspólny z D14 | jeden predikat shared | touch-friendly dialog | UI-only bypass | **domain gate** (C2) |
| **D3** | skipGuard ↔ flag | shrink chroniony | `applyPayrollGuardBeforePush` | nie duplikować guard | toast przy block | flaga ≠ week-clear; partial wipe &lt;50% | **C1 + C4** |
| **D4** | Recovery `-prev` | restore→domain push | `payrollMetrics` + richer pattern | **osobny** helper ≠ archive banner | banner LP | mylenie z archive RB | **C3** |
| **D5** | Soft Restore | wynik→domain push | tombstone / session snapshot / `-prev` | overlay w PWRB/add | default restore | zmiana `weekEmployeeFromDir` | **pure factory + overlay (C5)** |
| **D6** | Domain Push SSOT | **ANCHOR** | S1-1 retain | n/a | n/a | regresja RS payroll | **ZAKAZ** w AC |

---

## 3. Risks

| # | Ryzyko | P | Impact | Mitigacja |
|---|--------|---|--------|-----------|
| R1 | Nazwa `intentionalClear` koliduje z `isIntentionalPayrollWeekClear` | H | Zły bypass guarda / chaos code review | **C1** rename |
| R2 | D2 tylko w UI | H | Ominięcie ochrony | **C2** domain gate |
| R3 | D4 = ten sam `shouldShowPayrollRestoreBanner` | H | False banner / zła akcja | **C3** nowy predikat `-prev` |
| R4 | D3 sam nie łapie INCIDENT-01 (2/14 &lt; 50% shrink) | H | Poczucie bezpieczeństwa bez D2 | **C4** D2 = primary |
| R5 | Soft Restore w UI duplikuje hours copy | M | Drift vs PWRB | **C5** domain overlay |
| R6 | Rollover/`[]` wymaga D2 hours confirm | M | Ops friction | Rollover zostaje na **istniejącym** week-clear / własnym intent — **nie** D2 hours |
| R7 | D1 wpływa na write | L | Regresja | AC: telemetry side-effect free |
| R8 | Mobile double-modal | L | UX | jeden confirm; Soft Restore prefer default bez drugiego dialogu gdy snapshot OK |

---

## 4. Required Corrections (DF Amendment — przed IMPLEMENT)

> Korekty **nie** wykreślają D1–D6 IN. Wymagają **krótkiego DF amendment** (Owner ACK) albo notatki ARCH binding poniżej jako errata.

| ID | Korekta | Typ |
|----|---------|-----|
| **C1** | Flaga domenowa: **`intentionalHoursClear`** (nie `intentionalClear`). Dokumentować: ≠ `isIntentionalPayrollWeekClear` (empty week after archive). | Naming / Zero Dup |
| **C2** | D2: **policy w domain** (shared predikat + block push bez ACK); UI tylko dialog. | Layering |
| **C3** | D4: nowy helper np. `shouldShowPayrollPrevRecoveryBanner` — REUSE `payrollMetrics` / richer-than; **zakaz** reuse `shouldShowPayrollRestoreBanner` (archive). Osobny copy UI. | REUSE / semantics |
| **C4** | Jawnie: **D2 = primary** ochrona przed partial wipe; D3 = defense-in-depth (roster-level &gt;50%). Samo włączenie guarda **nie** zamyka INCIDENT-01. | Clarification |
| **C5** | D5: `weekEmployeeFromDir` **pure**; Soft Restore = overlay w `addFromDirectory` / PWRB **przed** `pwrPush`. | Domain purity |
| **C6** | Ścieżki: rollover / świadomy clear-all / istniejący empty-week archive clear — **poza** D2 hours gate (własne intent / istniejący helper). | Scope |

**DF errata (binding dla IMPLEMENT):**

```text
intentionalHoursClear ∈ PushWeekEmployeesOptions
D2_policy ∈ domain (gate) + UI dialog
D4_prev_banner ≠ archive restore banner
D2 primary · D3 secondary
weekEmployeeFromDir pure · Soft Restore overlay
```

---

## 5. Odpowiedzi Ownera

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Czy DF narusza architekturę? | **NIE** (przy C1–C6) |
| 2 | Czy potrzebne korekty? | **TAK** — amendment-level C1–C6 (nie redesign) |
| 3 | Czy IMPLEMENT może start bez zmian projektu? | **TAK po ACK erraty C1–C6**; bez ACK — **NIE** (ryzyko R1–R4) |
| 4 | Czy wszystkie decyzje zgodne z SSOT? | **TAK** — D6 + restore/soft-restore kończą domain push |

---

## 6. Final Verdict

```text
VERDICT: PASS WITH REQUIRED CORRECTIONS

Architecture: COMPATIBLE with SSOT FIRST · Domain Push · W1/W2 retain
Blockers to IMPLEMENT: DF errata ACK (C1–C6) — no new RCA/DF cycle needed
Redesign of D1–D6 IN set: NOT REQUIRED
```

---

## 7. Owner Readiness

```text
OWNER READINESS: ARCH REVIEW COMPLETE

Next (Owner GO only):
  A) ACK DF errata C1–C6 → GO IMPLEMENT (D1 first)
  B) Request DF amendment doc patch — optional formal
  C) Hold IMPLEMENT — if Owner rejects C2 domain gate

Forbidden: implement · commit · push (until IMPLEMENT GO)
```

---

## 8. Raport końcowy (Owner card)

1. **Architecture Review** — §1 PASS WITH CORRECTIONS  
2. **Architecture Matrix** — §2  
3. **Risks** — §3  
4. **Required Corrections** — C1–C6 §4  
5. **Final Verdict** — PASS WITH REQUIRED CORRECTIONS  
6. **Owner Readiness** — COMPLETE · czekaj ACK erraty → IMPLEMENT GO  

**BEZ IMPLEMENTACJI · BEZ COMMIT · BEZ PUSH**
