# TEST-HARNESS-01 H1 — ARCHITECTURE REVIEW

> **Status:** ARCHITECTURE REVIEW · AUDIT ONLY  
> **Data:** 2026-07-19  
> **Wejście:** [`TEST-HARNESS-01-H1-RCA.md`](TEST-HARNESS-01-H1-RCA.md) · [`TEST-HARNESS-01-H1-PLAN.md`](TEST-HARNESS-01-H1-PLAN.md) · [`TEST-HARNESS-01-H1-DESIGN-FREEZE.md`](TEST-HARNESS-01-H1-DESIGN-FREEZE.md)  
> **Fundament:** H0 RELEASED · [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md)

---

## 1. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy DF H1 jest spójny z H0? | **TAK** — reuse guardrailów, zero nowego modelu izolacji |
| Always-create + cleanup? | **APPROVE** — najbezpieczniejszy model na prod |
| Protected Core? | **NIE** przy D-H1-11 — Path A / test-infra |
| Czy wolno IMPLEMENT? | **NIE** — BLOCK do Owner GO |
| Residual risk | Flaky analysis timeout · storage orphans · brak H0.x cross-run ledger |

**REVIEW:** **APPROVE DESIGN** · **BLOCK IMPLEMENT**.

---

## 2. Architektura docelowa

```text
CLI --scenario h1-tender --allow-prod
        │
        ▼
┌───────────────────┐
│ H0 runner + H1    │
│ mutate-guard      │
│ CleanupTracker    │
└─────────┬─────────┘
          │
    ┌─────┴──────┐
    ▼            ▼
 Edge KV      Playwright
 batch-get/set  upload SWZ
 kw-tenders-*   /przetargi/psb-*
    │            │
    └─────┬──────┘
          ▼
   finally → cleanup
   (pipeline + tombstone)
```

**Zakaz:** forowanie logiki merge z `cloud-sync.ts` · zmiany Edge · mutacje katalogu.

---

## 3. Bezpieczeństwo danych produkcyjnych

| Kontrola | Mechanizm |
|----------|-----------|
| Izolacja ID | `psb-*` only · mutate-guard |
| Brak replace pipeline | #H1-001 read-merge-append |
| Cleanup wymuszony | PSB-001 `finally` · exit 4 |
| Tombstone | `kw-tenders-deleted-ids` (#H1-003) |
| Katalog / profil | read-only (#H1-007) |
| Dry-run | zero writes |
| Credentials | env only |

---

## 4. Determinism

| Źródło niedeterminizmu | Polityka DF |
|------------------------|-------------|
| BZP network discovery | Nie wymagane do PASS — lokalny upload |
| Classification UNKNOWN | WARNING |
| Bid PLN | nie assertować |
| Sync icon timing | soft; SSOT = batch-get |
| Analysis duration | bounded timeout → scenario FAIL + cleanup |

---

## 5. Zgodność z systemem

| Komponent | Rola w H1 |
|-----------|-----------|
| `kw-tenders-pipeline` | seed + save verify + cleanup filter |
| `kw-tenders-deleted-ids` | tombstone cleanup |
| `uploadTenderFile` / „Wgraj SWZ” | PDF import |
| `useTenderPipelineRuntime` | auto analysis (obserwacja, nie control) |
| `classifyAthLineCategory` | obserwacja WARNING-tolerant |
| `computeTenderBidProposal` | proposal surface |
| H0 `CleanupTracker` | PSB-001 |

---

## 6. Threat model (skrót)

| Threat | Sev | Kontrola |
|--------|-----|----------|
| Usunięcie / nadpisanie realnego tendera | Critical | mutate-guard + psb-only |
| Przywrócenie po „delete” bez tombstone | High | #H1-003 |
| Leak credentials w report | High | env · gitignore out |
| False FAIL na UNKNOWN | Medium | #H1-005 |
| Deadlock batch-set | Medium | N1 już na prod; nie dual-writer w H1 |

---

## 7. Open questions (nie blokują DF)

| # | Pytanie | Default DF |
|---|---------|------------|
| Q1 | Czy seed przez UI da się kiedyś zrobić? | NIE w H1 — KV seed |
| Q2 | Czy usuwać też storage object uploadu? | Best-effort / backlog |
| Q3 | Czy H1 wymaga H0.x ledger najpierw? | **NIE** — H1.session cleanup wystarczy; H0.x osobno |
| Q4 | Minimalny fixture PDF (1–2 pozycje)? | TAK — committed small PDF |

---

## 8. Rekomendacje

| Priorytet | Akcja |
|-----------|--------|
| P0 | Owner GO → IMPLEMENT H1 only |
| P0 | Trzymać D-H1-11 (zero Core) |
| P1 | Po H1: rozważyć H0.x jeśli kill mid-run na prod stanie się częsty |
| P2 | H2 Jobs dopiero po zielonym H1 |

---

## 9. Podsumowanie dla Ownera

H1 na always-create `psb-*` + H0 Cleanup Guarantee jest **architektonicznie poprawny** i bezpieczny względem prod, o ile seed jest merge-append, a cleanup ma tombstone.

| Dokument | Status |
|----------|--------|
| RCA | COMPLETE |
| PLAN | COMPLETE |
| DESIGN FREEZE | READY · NOT STARTED |
| ARCHITECTURE REVIEW | APPROVE DESIGN · BLOCK IMPLEMENT |

**Czekam na Owner GO** (`IMPLEMENT TEST-HARNESS-01 H1`).  
**Nie implementować H0.x / H2** w tym GO.
