# TEST-HARNESS-01 — ARCHITECTURE REVIEW

> **Program:** TEST-HARNESS-01 · Production Sandbox Harness  
> **Status:** ARCHITECTURE REVIEW · AUDIT ONLY  
> **Data:** 2026-07-19  
> **Wejście:** [`TEST-HARNESS-01-RCA.md`](TEST-HARNESS-01-RCA.md) · [`TEST-HARNESS-01-PLAN.md`](TEST-HARNESS-01-PLAN.md) · [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md)

---

## 1. Werdykt przeglądu

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy Design Freeze jest spójny z repo? | **TAK** — pod warunkiem trzymania PSB jako **osobnej klasy** od Payroll Preview (TI-B2.1) |
| Czy model marked entities jest wystarczający? | **TAK na MVP** — bez nowego KV; wymaga dyscypliny allowlist + cleanup |
| Czy program dotyka Protected Core? | **NIE** przy D5 (zero zmian sync/Edge) — Path A / test-infra |
| Czy wolno startować IMPLEMENT? | **NIE** — brak Owner GO |
| Ryzyko residualne | Cleanup FAIL / ludzki błąd allowlist / H1 długi flake |

**REVIEW STATUS:** **APPROVE DESIGN** (z warunkami §5) · **BLOCK IMPLEMENT** do Owner GO.

---

## 2. Architektura docelowa (warstwy)

```text
┌─────────────────────────────────────────────────────────┐
│  CLI  npm run test:prod-sandbox                         │
│  flags: --scenario --allow-prod --dry-run               │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Runner  (test-infra/prod-sandbox/runner.mjs)           │
│  preflight → scenario → assert → cleanup → report       │
└───────┬─────────────────┬───────────────────┬───────────┘
        │                 │                   │
        ▼                 ▼                   ▼
  Mutate Guard      Playwright UI        Edge API client
  (#PSB-001/002)    (login + flows)      (batch-get/set)
        │                 │                   │
        └────────────┬────┴───────────────────┘
                     ▼
              Prod KV / Storage
              (tylko encje sandbox)
```

**Zakaz:** runner **nie** importuje i nie forkuje logiki merge z `cloud-sync.ts`. Asserty cloud = HTTP API + ewentualnie odczyt UI.

---

## 3. Zgodność z istniejącymi kontraktami

| Kontrakt | Ocena | Uwagi |
|----------|-------|-------|
| TEST-INFRA #011 `--allow-prod` | Zgodne | PSB wymaga tej samej filozofii |
| TI-B2.1 Preview First | **Zgodne jeśli #PSB-≠-TI** | Nie otwierać seed Payroll na prod |
| #014 Harness Never Owns Domain | Zgodne | UI + API only |
| #015 SSOT Import Only | Zgodne | Nie duplikować classifier/merge |
| #CORE-013 One Bundle | Zgodne | Tylko tooling; osobne fazy H0…H3 |
| WORKFLOW-OWNER-GO Path B | N/A przy D5 | Jeśli kiedyś zmiana Edge/marker w runtime → Path B |
| PROD-TEST-DATA-CLEANUP-01 | Wspiera | PSB zamyka root cause śmieci z ad-hoc smoke |
| STABILIZATION WINDOW | Zgodne | Brak nowego epiku produktowego |

---

## 4. Analiza modelu „marked entities”

### 4.1 Zalety

- Zero migracji KV / zero Edge deploy  
- Reuse istniejących ścieżek UI (prawdziwa regresja)  
- Align z prośbą Ownera i cleanup-01 backlog  

### 4.2 Ograniczenia (akceptowane w DF)

| Ograniczenie | Wpływ | Mitygacja DF |
|--------------|-------|--------------|
| Sandbox żyje w tych samych kluczach KV | Ryzyko kolizji list UI | Prefix `psb-` + filtry właściciela + cleanup |
| Brak hard DB isolation | Błąd allowlist = katastrofa | Mutate guard + dry-run + fail-loud |
| Payroll week trudny do „oznaczenia” | Save niebezpieczny | MVP = H3-A bez save |
| Catalog row w dużej tablicy | Orphan po padzie mid-run | Cleanup + idempotent delete by prefix |

### 4.3 Alternatywa odrzucona (na życzenie Ownera)

Osobny namespace KV — większy zakres, Protected Core, poza STABILIZATION bez silnego uzasadnienia.

---

## 5. Warunki APPROVE (must-fix przed GO IMPLEMENT)

1. **Docs sync (przy H0):** zaznaczyć w continuity, że TI-B2 „OPEN + sandbox wymagany” w starym `TEST-INFRA-001-CLOSEOUT.md` jest **STALE** względem TI-B2.1 — PSB ≠ naprawa tego wpisu przez ciche przywrócenie #018.  
2. **Sandbox job:** Owner tworzy ręcznie 1 job `psb-*` **albo** akceptuje always-create w H2.  
3. **H3:** potwierdzenie MVP = H3-A (bez save).  
4. **Sekrety:** tylko env; przykład allowlist bez prod secrets w git.  
5. **Nie łączyć** pierwszego IMPLEMENT z TENDER-P0.2 ani CLOUD-N2.

---

## 6. Threat model (skrót)

| Threat | Severity | Kontrola |
|--------|----------|----------|
| Smoke nadpisuje realny job | Critical | Mutate guard + allowlist |
| Cleanup pominięty po FAIL mid-run | High | `finally { cleanup }`; exit 4 |
| Credentials w repo | High | env only; pre-commit culture |
| Deadlock / retry storm z H4 | Medium | Brak celowego dual-writer |
| Flaky H1 (PDF/OCR) | Medium | AC: WARNING na classyfikację fixture; FAIL tylko crash/save |
| Fałszywy PASS bez sync | Medium | Assert `batch-get` po write |

---

## 7. Zależności zewnętrzne

| Zależność | Wymagane do |
|-----------|-------------|
| Prod 2.65.33+ (N1 retry) | H4 metrics observation |
| Vercel + Edge healthy | Wszystkie scenariusze |
| Fixture PDF | H1 |
| Admin credentials env | UI scenarios |
| (Opcja) Storage GC tooling z cleanup-01 | H2 orphan zero |

---

## 8. Rekomendacje architekturalne (kolejność)

| Priorytet | Rekomendacja |
|-----------|--------------|
| P0 | Owner GO → IMPLEMENT **H0 only** najpierw |
| P0 | Utrzymać D5 (zero Protected Core) |
| P1 | Po H0: H4 → H2 (największy ROI vs ryzyko) |
| P1 | H3-A only w pierwszym release harnessa |
| P2 | Później: manifest suite + opcjonalny nightly manual |
| P2 | Nie automatyzować w CI GitHub bez osobnego sekretu/ops gate |

---

## 9. Open questions (nie blokują DF; blokują poszczególną fazę)

| # | Pytanie | Blokuje |
|---|---------|---------|
| Q1 | Czy sandbox tender tworzymy od zera UI, czy pin ID istniejącego? | H1 |
| Q2 | Czy `harnessSandbox` boolean wchodzi do modelu domeny (wymaga sync awareness) czy tylko prefix? | H0/H2 — **DF preferuje prefix-only** aby uniknąć CORE |
| Q3 | H3-B kiedykolwiek na live? | H3-B |
| Q4 | Czy H1 ma używać aktywnego katalogu (P0.1) w assercie klasyfikacji? | H1 assert hardness |

**Architektura recommended default:** Q2 = **prefix-only** (bez nowego pola w domenie).

---

## 10. Podsumowanie dla Ownera

Production Sandbox Harness (marked entities) jest **poprawną** odpowiedzią na lukę coverage ze stability sweep **bez** psucia TI-B2.1 Preview First.

| Dokument | Status |
|----------|--------|
| RCA | COMPLETE |
| PLAN | COMPLETE |
| DESIGN FREEZE | READY · NOT STARTED |
| ARCHITECTURE REVIEW | APPROVE DESIGN · BLOCK IMPLEMENT |

**Czekam na Owner GO** (sugerowany pierwszy krok: `IMPLEMENT TEST-HARNESS-01 H0`).
