# TEST-HARNESS-01 H4 — ARCHITECTURE REVIEW

> **Program:** TEST-HARNESS-01 · Slice **H4** · Cloud Production Sandbox  
> **Etap:** ARCH REVIEW COMPLETE  
> **Data:** 2026-07-20  
> **Owner GO ARCH REVIEW:** ✅  
> **Wejście:** [`TEST-HARNESS-01-H4-AUDIT.md`](TEST-HARNESS-01-H4-AUDIT.md) · [`TEST-HARNESS-01-H4-RCA.md`](TEST-HARNESS-01-H4-RCA.md) · [`TEST-HARNESS-01-H4-PLAN.md`](TEST-HARNESS-01-H4-PLAN.md) · [`TEST-HARNESS-01-H4-DESIGN-FREEZE.md`](TEST-HARNESS-01-H4-DESIGN-FREEZE.md)  
> **Parent DF:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H4 Cloud AC  
> **Fundament:** H0–H3-A **RELEASED** · `kv-client.mjs` · `tender-helpers.mjs` (H1)  
> **Baseline prod:** UI **2.65.35** · app **`fce7b78`** · **GREEN**  
> **IMPLEMENT:** **BLOCKED** do Owner GO IMPLEMENT

---

## 1. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Zgodność z SSOT (Parent DF § H4 + łańcuch AUDIT→DF)? | **TAK** |
| D5 ZERO Core? | **TAK** — Path A test-infra only |
| REUSE FIRST (H0/H1/`kv-client`)? | **TAK** — z bindingiem implementacyjnym §3.3 |
| Payroll Resurrection Fence? | **NIE naruszony** (FORBIDDEN + zero fence import) |
| Nowe KV / nowe zależności Core? | **NIE** |
| Dual-writer risk? | **KONTROLOWANY** — zakaz N2; raw Edge single-writer harness |
| Przepływ `kv-client` → Edge → nested `psb-*`? | **SPÓJNY** |
| D-H4-01…22 / #H4-001…014? | **ZGODNE** |
| Gotowość architektury do IMPLEMENT bez zmiany DF? | **TAK** |
| Czy wolno IMPLEMENT teraz? | **NIE** — czekaj Owner GO IMPLEMENT |

```text
══════════════════════════════════════
ARCH REVIEW DECISION

        ARCH APPROVED

        BLOCK IMPLEMENT
        (until Owner GO IMPLEMENT)
══════════════════════════════════════
```

**ARCH CHANGES REQUIRED:** **NIE**.

---

## 2. Zakres przeglądu

Przegląd formalny zamrożonego projektu H4 **bez** kodu i bez zmian repo. Kryteria = lista Ownera §1–9 + DF §0–13.

---

## 3. Checklist weryfikacji (1–9)

### 3.1 Zgodność z SSOT — **PASS**

| SSOT | Status |
|------|--------|
| Parent DF § H4 AC (get / set sandbox / retry observe / metrics) | Spełnione: set+get primary; metrics soft; retry = observe not force |
| RCA: Wariant A primary · B soft only | Zachowane w DF |
| PLAN scope / DoD / FORBIDDEN | Zachowane |
| H0 principles D1/D4/D5/D8/PSB-001 | Dziedziczone §0 DF |
| N1 CLOSED observe-only | DF #H4-004/006 · brak dual-writer |

### 3.2 D5 ZERO Core — **PASS**

| Obszar | Werdykt |
|--------|---------|
| `cloud-sync.ts` / merge / PWRB | Poza zakresem plików IN |
| `cloud-batch-set-retry.ts` | Zakaz fork retry w harness |
| Edge function | Brak zmian |
| Payroll fence / Theme / App version | Brak zmian |
| Jedyna warstwa zmian | `test-infra/prod-sandbox/**` + manifest + thin script |

### 3.3 REUSE FIRST — **PASS** (z bindingiem)

| Komponent | Review |
|-----------|--------|
| `kv-client.mjs` | **MUST reuse** — jedyny Edge client |
| `markers` / `mutate-guard` / `cleanup` / `report` | **MUST reuse** |
| `tender-helpers.mjs` | **MUST prefer** `seedSandboxTender` / `cleanupSandboxTender` / `buildSandboxTenderItem` (lub cienkie wywołania tych API) |
| Drugi KV client / druga pętla merge | **FAIL review jeśli powstałby** — zakaz |
| Opcjonalny `cloud-helpers.mjs` | Tylko gdy H1 helpers nie da się wywołać bez UI; **nie** duplikować `batchGet/Set` |

**Binding implementacyjny (nie zmienia DF):**  
D-H4-07 „minimal `{id,title}`” = **dolne minimum pól**. **APPROVED** jest reuse `buildSandboxTenderItem` (szerszy kształt H1) — zapewnia kompatybilność pipeline i unika drugiej schematu encji. Nie wolno tworzyć konkurencyjnego „ultra-minimal” buildera, który omija H1 helpers.

### 3.4 Payroll Resurrection Fence — **PASS**

| Kontrola | Status |
|----------|--------|
| FORBIDDEN payroll keys | Zamrożone DF §6.1 |
| Zero import fence | DF §6.2 |
| Zero hydrate `kw-week-*` | DF §6.2 |
| H3-A jedyny PSB payroll path | Potwierdzone |

### 3.5 Brak nowych zależności i nowych KV — **PASS**

| | |
|--|--|
| Nowy KV | **ZAKAZ** D-H4-17 / D4 |
| Nowe npm deps Core | Nie wymagane |
| Nowe zależności UI/Playwright | **NIE** (KV-only D-H4-05) |

### 3.6 Dual-writer — **PASS**

| | |
|--|--|
| Celowy 2-tab / deadlock | **ZAKAZ** D-H4-16 |
| H4 write path | Pojedynczy proces harness → Edge |
| Residual | Równoległa sesja admina w przeglądarce może race (jak H1) — **akceptowalne** przy KV-only; mitygacja = krótki run + cleanup finally · **nie** otwiera N2 |

### 3.7 Przepływ `kv-client` → Edge → nested `psb-*` — **PASS**

```text
runner → h4-cloud
       → kv-client.batchGet/batchSet
       → Edge /batch-get|/batch-set
       → kw-tenders-pipeline (± kw-tenders-deleted-ids @ cleanup)
       → encja psb-* nested only
```

Spójne z istniejącym H1 (`PIPELINE_KEY` / `DELETED_IDS_KEY` w `kv-client.mjs` + `tender-helpers.mjs`). Soft metrics **poza** krytyczną ścieżką PASS.

### 3.8 Zgodność D-H4-01…22 oraz #H4-001…014 — **PASS**

Próbka krytyczna:

| ID / # | Review |
|--------|--------|
| D-H4-01 Nested A | OK |
| D-H4-02/03 pipeline + deleted-ids | OK · zgodne H1 |
| D-H4-04 `kw-jobs` OUT | OK · scope lock |
| D-H4-05 KV-only | OK |
| D-H4-08/09/10 merge + preservacja | OK · P0 wipe control |
| D-H4-13/14/15 metrics soft | OK · retries=0 ≠ FAIL |
| D-H4-16…18 dual-writer / KV / Core | OK |
| D-H4-22 scope lock | OK |
| #H4-001…014 | Spójne z decyzjami; brak sprzeczności z Parent #PSB-* |

### 3.9 Gotowość do IMPLEMENT bez zmiany architektury — **PASS**

Architektura jest **wystarczająco zamknięta** do implementacji tooling-only:

- lista plików IN/OUT zamrożona  
- AC PASS/WARNING/FAIL zamrożone  
- exit codes dziedziczone  
- reuse path do H1 helpers istnieje w kodzie już dziś  

**Warunek startu kodu:** wyłącznie jawne **Owner GO IMPLEMENT** — nie ten dokument.

---

## 4. Residual risks (akceptowalne — nie blokują ARCH APPROVED)

| Ryzyko | P | Status |
|--------|---|--------|
| Race z żywą sesją UI na tym samym koncie | P1 | Akceptowane (KV-only); cleanup finally |
| Raw Edge omija N1 retry loop | P2 | Świadome (RCA RC-4); metrics soft |
| Brak H0.x Persist Ledger cross-run | P2 | Poza H4 |
| Agent złamie REUSE i skopiuje merge | P0 ops | Gate: ARCH REVIEW binding §3.3 + Owner Verification |

---

## 5. Threat model (skrót)

| Threat | Kontrola DF |
|--------|-------------|
| Wipe pipeline | Read→merge-append→preservacja assert · reuse H1 seed |
| Payroll corruption | FORBIDDEN keys |
| Core regression | D5 file ban |
| Flaky metrics | WARNING only |
| Deadlock storm | No dual-writer |
| Orphan `psb-*` | PSB-001 + deleted-ids |

---

## 6. Pytania ARCH — zamknięte

| # | Pytanie | Decyzja review |
|---|---------|----------------|
| Q-AR-1 | Czy minimal `{id,title}` przeczy H1 builder? | **NIE** — minimum; **reuse H1 builder APPROVED** |
| Q-AR-2 | Czy brak Playwright = luka anti-wipe? | **Akceptowalne** dla Cloud transport slice; residual race udokumentowany |
| Q-AR-3 | Czy metrics appendix wymaga DF zmiany? | **NIE** — soft / optional |

---

## 7. Warunki wejścia do IMPLEMENT (Owner)

Po **Owner GO IMPLEMENT** wykonawca:

1. Trzyma się DF + tego ARCH REVIEW (zwłaszcza §3.3 reuse binding).  
2. Nie otwiera Core / Edge / Payroll / Theme / nowy KV / Playwright / `kw-jobs`.  
3. Rejestruje `h4-cloud` · dry-run · allow-prod · report · manifest.  
4. Kończy Owner Verification **przed** commit/push (osobne GO).  

---

## 8. Stop gate

```text
ARCH REVIEW COMPLETE
  DECISION: ARCH APPROVED
  IMPLEMENT: BLOCKED

Czekaj OWNER GO:
  „IMPLEMENT TEST-HARNESS-01 H4”
  lub równoważne jawne GO IMPLEMENT

Bez GO: zero kodu / commit / push / bump wersji / Production change.
```

---

## 9. Podpis review

| Pole | Wartość |
|------|---------|
| Reviewer | Agent ARCH REVIEW (WGDOM workflow) |
| Decyzja | **ARCH APPROVED** |
| Zmiany architektury wymagane | **NIE** |
| Następny etap | Owner GO → **IMPLEMENT** |

**Koniec ARCHITECTURE REVIEW H4**
