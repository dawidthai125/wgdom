# TEST-HARNESS-01 H1 — RCA

> **Program:** TEST-HARNESS-01 · Slice **H1** · Tender Production Sandbox  
> **Status:** AUDIT ONLY · **NIE implementować** bez Owner GO  
> **Data:** 2026-07-19  
> **Fundament:** H0 **RELEASED** (`df6d153`) · [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md)  
> **PLAN / DF / Review:** [`TEST-HARNESS-01-H1-PLAN.md`](TEST-HARNESS-01-H1-PLAN.md) · [`TEST-HARNESS-01-H1-DESIGN-FREEZE.md`](TEST-HARNESS-01-H1-DESIGN-FREEZE.md) · [`TEST-HARNESS-01-H1-ARCHITECTURE-REVIEW.md`](TEST-HARNESS-01-H1-ARCHITECTURE-REVIEW.md)

---

## 1. Objaw

Brak formalnego, bezpiecznego scenariusza produkcyjnego:

```text
Sandbox Tender → PDF → Analysis → Classification → Proposal → Save → Cleanup
```

Stability sweep (2.65.33) otwierał Przetargi (shell PASS), ale **nie** wykonywał write path. Ad-hoc `.tmp/*prod-smoke*` nie używa H0 (`psb-*` / mutate-guard / Cleanup Guarantee).

---

## 2. Root cause

| ID | Przyczyna |
|----|-----------|
| **RC-1** | H0 dostarcza fundament, ale `h1-tender` = `PSB_SCENARIO_NOT_IMPLEMENTED` |
| **RC-2** | Pipeline tenderów jest długi i flaky (BZP discovery, sieć, OCR) — bez kontraktu AC „WARNING vs FAIL” łatwo o fałszywe FAIL |
| **RC-3** | Brak pustego „Dodaj przetarg” w UI — seed wymaga **świadomego** zapisu do `kw-tenders-pipeline` (ryzyko bez mutate-guard) |
| **RC-4** | Cleanup bez tombstone `kw-tenders-deleted-ids` → merge może **przywrócić** usunięty item |
| **RC-5** | Klasyfikator zależny od katalogu/fixture — hard-assert na kategorię psuje determinism |

---

## 3. Decyzja Ownera (wejście DF)

| Pytanie | Odpowiedź |
|---------|-----------|
| Izolacja tendera | **Always create** nowy `psb-*`, potem **pełny cleanup** |
| Lokalizacja docs | `docs/architecture/TEST-HARNESS-01-H1-*.md` |

---

## 4. Co H1 **nie** rozwiązuje

- TENDER-P0.2 PDF sanitizer  
- CLOUD-P0-DEADLOCK-N2  
- H0.x Persist Ledger (cross-process orphan) — nadal osobny backlog  
- Mutacje Biblioteki Robót (H5)  
- Protected Core / merge / Edge changes  

---

## 5. Werdykt RCA

| | |
|--|--|
| Problem | Brak H1 scenario na fundamencie H0 |
| Klasa | Test-infra / ops safety |
| Priorytet | **P1** (coverage gate przed kolejnymi release’ami przetargowymi) |
| Kierunek | Playwright + KV seed/cleanup **tylko** `psb-*` · reuse H0 guardrail · zero Core |
| Status | **AUDIT COMPLETE** → PLAN / DESIGN FREEZE |

**NIE implementować** bez Owner GO `IMPLEMENT TEST-HARNESS-01 H1`.
