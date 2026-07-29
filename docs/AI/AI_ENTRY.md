# AI ENTRY — oficjalny start sesji (WGDOM)

> **ID:** AI-DOCS-PAYROLL-GUARD-02 · **MASTER:** COST-BID-GAP-01 **CLOSED** · COST-MULTI **CLOSED** · COST-02-A **CLOSED** · Foundation Lib Phase 0 **COMPLETE**  
> **STATUS:** **ACTIVE** · **JEDYNY oficjalny punkt wejścia dla AI**  
> **Data:** 2026-07-29

```text
════════════════════════════════════════════════════════
STOP. Nie zaczynaj IMPLEMENT od CURRENT-TASK, Continuity,
    losowego PAYROLL-*, ani historii czatu.
MASTER_HANDOFF (stan) → ten plik → Safety Gate → dopiero kod.
Tip = 2.65.77 / a061bbd — SSOT 09 + version.json
COST-BID-GAP-01 / GAP-A = CLOSED · PRODUCTION VERIFIED
COST-MULTI = SERIES CLOSED · PRODUCTION VERIFIED (UI 2.65.74–76)
AI-COST-01 = EPIC COMPLETE · FROZEN · FIELD READY
AI-COST-02 / COST-02-A = EPIC COMPLETE · PRODUCTION VERIFIED · CLOSED
Foundation Lib (wgdom-foundation) Phase 0 = COMPLETE (FND-01…05 @ origin/main)
FND-06 Observability = BLOCKED (brak Impl Spec → ADR/Blueprint)
NEXT (wycena) = AI-COST-02-B — tylko po Owner GO → AUDIT → DF
Handoff = docs/architecture/SESSION-HANDOFF-POST-COST-BID-GAP-01.md
════════════════════════════════════════════════════════
```

**Lista Płac = priorytet produkcyjny #1.** Regresje LP po FEATURE zwykle wynikają z pominięcia tej ścieżki.

**Stan projektu / NEXT EPICS (bez historii czatu):** [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md)  
**Handoff po GAP-A:** [`SESSION-HANDOFF-POST-COST-BID-GAP-01.md`](../architecture/SESSION-HANDOFF-POST-COST-BID-GAP-01.md)  
**COST-BID-GAP-01 closeout:** [`COST-BID-GAP-01-CLOSEOUT.md`](../architecture/COST-BID-GAP-01-CLOSEOUT.md)  
**COST-MULTI closeout:** [`COST-MULTI-CLOSEOUT.md`](../architecture/COST-MULTI-CLOSEOUT.md) · kandydaci [`NEXT-EPIC-CANDIDATES.md`](../architecture/NEXT-EPIC-CANDIDATES.md)  
**Foundation Lib (ID/Digest/Error/Audit/Event):** [`WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](../architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md) — **nie** mylić z UI Foundation  
**AI Cost (gdy temat wyceny/oferty):** [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`SSOT`](../architecture/WGDOM-AI-COST-01-SSOT.md) · [`AI-COST-02 Starting Point`](../architecture/WGDOM-AI-COST-02-STARTING-POINT.md) · [`COST-02-A CLOSEOUT`](../architecture/WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md)

---

## 0. Tip produkcji (nie kopiuj numeru tutaj)

**Jedyne źródło tipu w docs:** [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md)  
**Live check:** `https://www.wgdom.fun/version.json`

---

## 1. Obowiązkowa ścieżka czytania (kolejność)

```text
0. MASTER_HANDOFF.md                    ← stan · baseline · NEXT (≤10 min)
1. AI_ENTRY.md                          ← JESTEŚ TUTAJ
2. PROJECT_HANDOFF.md                   ← zasady startu
3. AI_MEMORY.md                         ← pamięć ≤5 min
4. AI_DECISION_TREE.md                  ← routing decyzji
5. PAYROLL_SAFETY_GATE.md               ← ★ GATE — odpowiedz TAK/NIE
6. AI_PAYROLL_SAFETY_MANUAL.md          ← pack LP (gdy Gate wymaga)
7. 02_ARCHITECTURE.md  lub  docs/ARCHITECTURE.md  (tematycznie)
8. CURRENT-TASK.md                      ← dopiero tu: status sesji Ownera
9. FEATURE_IMPLEMENTATION_CHECKLIST.md  ← przed KAŻDYM IMPLEMENT
10. → IMPLEMENT (tylko po Gate PASS + Owner GO gdy wymagane)
```

**Zakaz skrótów:** pominięcie kroków 3–5 = naruszenie procesu.

---

## 2. Po Gate — co czytać dalej (indeks, nie esej)

| Potrzeba | Dokument |
|----------|----------|
| Foundation Lib / FND-* | [`../architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](../architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md) |
| Never break (1 strona) | [`PAYROLL_NEVER_BREAK_RULES.md`](PAYROLL_NEVER_BREAK_RULES.md) |
| Boundary FEATURE vs CORE | [`PAYROLL_BOUNDARY_MAP.md`](PAYROLL_BOUNDARY_MAP.md) |
| Week / ALIGN / ROLLOVER | [`PAYROLL_WEEK_MODEL.md`](PAYROLL_WEEK_MODEL.md) |
| Data / cloud / LS flow | [`PAYROLL_DATA_FLOW_INDEX.md`](PAYROLL_DATA_FLOW_INDEX.md) |
| Incydenty | [`PAYROLL_INCIDENT_INDEX.md`](PAYROLL_INCIDENT_INDEX.md) |
| RCA | [`PAYROLL_RCA_INDEX.md`](PAYROLL_RCA_INDEX.md) |
| SSOT architektury LP | [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) |
| Zakazy szczegółowe | [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md) · [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md) |
| Workflow deweloperski | [`../../AGENTS.md`](../../AGENTS.md) (po Entry) |

Pełny katalog Knowledge Base: [`README.md`](README.md) (INDEX — **nie** entry).

---

## 3. Alternatywne entry — DEPRECATED

| Plik | Status |
|------|--------|
| `AI-START-HERE.md` (root) | **DEPRECATED** → redirect tutaj |
| `AI-HANDOFF.md` (root) | **DEPRECATED** → ten plik + `PROJECT_HANDOFF.md` |
| `CURSOR-HANDOFF.md` (root) | **DEPRECATED** → ten plik + Gate |
| Start od samego `AGENTS.md` | **Niewystarczające** — AGENTS po Entry |
| Start od `AGENT-CONTINUITY-GUIDE` | Living notes — **po** Entry + Gate |
| Losowy `docs/architecture/PAYROLL-*` | Historyczne — tylko przez INDEX |

---

## 4. Definition of Done (zanim napiszesz kod)

- [ ] Przeszedłem kroki 1–5  
- [ ] Wypełniłem odpowiedzi w `PAYROLL_SAFETY_GATE.md`  
- [ ] Jeśli jakikolwiek TAK w Gate → pełna checklista Payroll (Manual)  
- [ ] Wypełniłem `FEATURE_IMPLEMENTATION_CHECKLIST.md`  
- [ ] Tip sprawdziłem w `09` / `version.json` (nie z pamięci czatu)  
- [ ] Owner GO gdy CORE / Payroll write path  

**Koniec Entry. Następny:** [`PROJECT_HANDOFF.md`](PROJECT_HANDOFF.md)
