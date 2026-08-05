# AI ENTRY — oficjalny start sesji (WGDOM)

> **ID:** AI-DOCS-PAYROLL-GUARD-02 · tip / stan → [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md) · [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md)  
> **STATUS:** **ACTIVE** · **proces** Entry (AUDIT→…→CLOSE) · **UTRZYMANIE**  
> **Data:** 2026-07-31

```text
════════════════════════════════════════════════════════
STOP. Nie zaczynaj IMPLEMENT od CURRENT-TASK, Continuity,
    losowego PAYROLL-*, ani historii czatu.
Cold start: MASTER-AI-HANDOFF → AI_QUICK_START → ten plik → Gate.
Tip = wyłącznie docs/AI/09_PRODUCTION_BASELINE.md + version.json
Stan projektu = docs/AI/MASTER-AI-HANDOFF.md (SSOT)
Tryb = UTRZYMANIE · NEXT EPIC = NONE bez Owner GO
════════════════════════════════════════════════════════
```

**Lista Płac = priorytet produkcyjny #1.** Regresje LP po FEATURE zwykle wynikają z pominięcia tej ścieżki.

**★★ Stan / WIP / flagi / NEXT:** [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md)  
**Quick Start (1 strona):** [`AI_QUICK_START.md`](AI_QUICK_START.md)  
**Thin pointer:** [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md)  
**Tip:** [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md)  
**Dokumentacja Szkice -02 Publication CLOSED:** [`WM-DOKUMENTACJA-SZKICE-02-PUBLICATION-CLOSEOUT.md`](../architecture/WM-DOKUMENTACJA-SZKICE-02-PUBLICATION-CLOSEOUT.md)  
**Dokumentacja Szkice P2a CLOSED:** [`WM-DOKUMENTACJA-SZKICE-01-P2a-CLOSEOUT.md`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P2a-CLOSEOUT.md)  
**Dokumentacja Szkice P0 CLOSED:** [`WM-DOKUMENTACJA-SZKICE-01-P0-CLOSEOUT.md`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P0-CLOSEOUT.md)  
**Kandydaci NEXT:** [`NEXT-EPIC-CANDIDATES.md`](../architecture/NEXT-EPIC-CANDIDATES.md)  
**Doc Detection CLOSED:** [`AI-DOC-DETECTION-CLOSE-01.md`](../architecture/AI-DOC-DETECTION-CLOSE-01.md)  
**Catalog EPIC CLOSED:** [`CATALOG-COVERAGE-01-EPIC-CLOSEOUT.md`](../architecture/CATALOG-COVERAGE-01-EPIC-CLOSEOUT.md)  
**Session archive (Catalog):** [`FINAL-AI-HANDOFF.md`](FINAL-AI-HANDOFF.md) — historyczny close Catalog; **nie** zastępuje MASTER-AI-HANDOFF  
**Handoff po GAP-A:** [`SESSION-HANDOFF-POST-COST-BID-GAP-01.md`](../architecture/SESSION-HANDOFF-POST-COST-BID-GAP-01.md)  
**Foundation Lib:** [`WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](../architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md) — **nie** mylić z UI Foundation  
**AI Cost (gdy temat wyceny/oferty):** [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`SSOT`](../architecture/WGDOM-AI-COST-01-SSOT.md) · [`AI-COST-02 Starting Point`](../architecture/WGDOM-AI-COST-02-STARTING-POINT.md)

---

## 0. Tip produkcji (nie kopiuj numeru tutaj)

**Jedyne źródło tipu w docs:** [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md)  
**Live check:** `https://www.wgdom.fun/version.json`

---

## 1. Obowiązkowa ścieżka czytania (kolejność)

```text
0. MASTER-AI-HANDOFF.md              ← ★★ stan świata (SSOT)
0b. AI_QUICK_START.md                ← 1 strona
1. AI_ENTRY.md                       ← JESTEŚ TUTAJ (proces)
2. 09_PRODUCTION_BASELINE.md + version.json
3. PROJECT_HANDOFF.md                ← zasady startu
4. AI_MEMORY.md                      ← pamięć ≤5 min
5. AI_DECISION_TREE.md               ← routing decyzji
6. PAYROLL_SAFETY_GATE.md            ← ★ GATE — odpowiedz TAK/NIE
7. AI_PAYROLL_SAFETY_MANUAL.md       ← pack LP (gdy Gate wymaga)
8. ARCHITECTURE / tematyczny CLOSE   ← gdy FEATURE
9. CURRENT-TASK.md                   ← status sesji Ownera
10. FEATURE_IMPLEMENTATION_CHECKLIST.md
11. → IMPLEMENT (tylko po Gate PASS + Owner GO gdy wymagane)
```

**MASTER_HANDOFF.md** = thin pointer → MASTER-AI-HANDOFF.  
**FINAL-AI-HANDOFF.md** = archiwum sesji Catalog — **nie** tip bieżący.

---

## 2. Po Gate — co czytać dalej (indeks, nie esej)

| Potrzeba | Dokument |
|----------|----------|
| CM-04 P2 / P3 | [`../architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md`](../architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md) · [`NEXT-EPIC-CANDIDATES`](../architecture/NEXT-EPIC-CANDIDATES.md) |
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
