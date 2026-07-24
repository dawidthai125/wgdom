# CI GATE B REMEDIATION — TENDERS (pozostałe czerwone po CI-1…CI-3)

> **Status:** **AUDIT + RCA + PLAN COMPLETE** · **DESIGN FREEZE** — czekaj Owner GO  
> **Data:** 2026-07-24  
> **Tip audytu:** `c5044da` · CI run [#30129094651](https://github.com/dawidthai125/wgdom/actions/runs/30129094651) · job tenders `89599480758`  
> **Zamknięte wcześniej:** CI-1 TEUX-7d · CI-2 GUARD-FAIL-LOUD · CI-3 P11-BOOTSTRAP  
> **Zakaz IMPLEMENT bez Owner GO:** Tenders UI · Payroll · Cloud Sync · Theme · prod app

---

## 1. AUDIT — Gate B scope=tenders @ `c5044da`

### 1.1 Werdykt skrót

| | |
|--|--|
| **Potwierdzony FAIL (1)** | `LIB-TENDER-MOBILE-TEUX4` |
| **Potwierdzony PASS (10)** | NG10-01 · TEUX7C · TEUX7B · TEUX7D · TEUX1 · TEUX6 · TEUX7A · TEUX7F · TEUX3 · TEUX5 |
| **Nieuruchomione (fail-fast)** | m.in. TEUX2 · TEUX7E · GROUPED-DOCS · SMOKE-TEUX-NG06 · SMOKE-TENDERS-NG01-04 (+ audit jeśli w zakresie) |
| **Payroll Gate B** | **zielony** (CI-2 + CI-3) — poza tym raportem |

Orchestrator: `continueOnFail: false` (domyślnie) → po pierwszym **blocking** FAIL przerywa kolejkę (`test-infra-orchestrator.mjs` ~L376).

### 1.2 Tabela wyników CI (wykonane)

| # | TestId | Wynik | Uwagi |
|---|--------|-------|--------|
| 1 | `LIB-NG10-01` | PASS | |
| 2 | `LIB-TENDER-A11Y-TEUX7C` | PASS | |
| 3 | `LIB-TENDER-COMMAND-TEUX7B` | PASS | |
| 4 | `LIB-TENDER-COPY-TEUX7D` | PASS | **CI-1 CLOSED** |
| 5 | `LIB-TENDER-DETAIL-NAV-TEUX1` | PASS | |
| 6 | `LIB-TENDER-EMPTY-STATES-TEUX6` | PASS | |
| 7 | `LIB-TENDER-FILTERS-TEUX7A` | PASS | |
| 8 | `LIB-TENDER-HOSTED-DEPRECATION-TEUX7F` | PASS | |
| 9 | `LIB-TENDER-LIST-CARDS-TEUX3` | PASS | |
| 10 | `LIB-TENDER-LOADING-TEUX5` | PASS | |
| 11 | **`LIB-TENDER-MOBILE-TEUX4`** | **FAIL** | jedyny czerwony w logu |
| — | `LIB-TENDER-STRATEGY-TEUX7E` | **NOT RUN** | po fail-fast |
| — | `LIB-TENDER-UX-TOKENS-TEUX2` | **NOT RUN** | po fail-fast |
| — | `LIB-TENDERS-GROUPED-DOCS` | **NOT RUN** | po fail-fast |
| — | `SMOKE-TEUX-NG06` | **NOT RUN** | po fail-fast |
| — | `SMOKE-TENDERS-NG01-04` | **NOT RUN** | po fail-fast |

**TOTAL orchestrator:** `10 PASS / 1 FAIL / 11`

---

## 2. RCA — jedyny potwierdzony czerwony

### `LIB-TENDER-MOBILE-TEUX4` → `scripts/test-tender-mobile-teux4.mjs`

| Pole | Treść |
|------|--------|
| **Objaw CI** | `FAIL density max-[390px] pass` · suite `26 PASS / 1 FAIL` |
| **Miejsce awarii** | Asercja L51: `command.includes("max-[390px]")` na `src/app/TenderDetailCommandLayer.tsx` |
| **Fakt w tip** | Command Layer używa **`max-[430px]`** (nie `390`) — header comment: *density pass ≤430px (M-03)* |
| **Przyczyna** | Drift test↔kod po **M-03** (`0f8a165` — *mobile re-cert breakpoint cliff 392px*): produkcja świadomie zmieniła breakpoint 390→430; test TEUX-4 **nie został zaktualizowany** (ostatni commit testu: `d965311` TEUX-4 feature) |
| **Klasyfikacja** | **test bug** (stale string assert) · częściowo **false positive** względem celowej decyzji M-03 |
| **production bug?** | **NIE** — density jest obecna (`max-[430px]:*`); regresja UI nie wynika z braku klasy, tylko z nieaktualnej asercji |
| **env bug?** | **NIE** |
| **Wpływ na prod** | **ZERO** na Hours-wipe / sync / payroll · **niski** na UX (M-03 już na tip/prod path) · **blokuje** Gate B tenders + Gate C (skipped) |

**Dowód ścieżki:**

```text
TEUX-4 release (d965311): max-[390px] + test asserts "max-[390px]"
M-03 (0f8a165): CommandLayer 390 → 430  (test TEUX-4 nie ruszony)
CI tip c5044da: test nadal szuka "max-[390px]" → FAIL
```

Pozostałe asercje TEUX-4 na CI: **PASS** (sheet, tab shadow, safe-area, tokens frozen, protected core).

---

## 3. Nieuruchomione — status ryzyka (nie „czerwone”)

Po naprawie TEUX-4 należy **przepuścić pełne Gate B tenders** (`--continue` lub re-run) zanim uzna się Gate B za zielony.

| TestId | Wstępna ocena ryzyka (bez wykonania na CI) |
|--------|--------------------------------------------|
| `LIB-TENDER-UX-TOKENS-TEUX2` | **UWAGA lokalnie:** WIP `tender-ux-tokens.ts` (scrollable accordion) — na tipie CI bez WIP prawdopodobnie PASS; lokalny dirty tree może failować osobno |
| `LIB-TENDER-STRATEGY-TEUX7E` | Historycznie PASS w tej serii — niski |
| `LIB-TENDERS-GROUPED-DOCS` | Niski (brak sygnału fail) |
| `SMOKE-TEUX-NG06` | Niski–średni (smoke agregat) |
| `SMOKE-TENDERS-NG01-04` | Niski–średni (NG-01–04) |

**Nie klasyfikować ich jako production/test bug bez świeżego logu PASS/FAIL.**

---

## 4. Wpływ na produkcję

| Obszar | Wpływ |
|--------|--------|
| Runtime Przetargi / Command Layer | **Brak** nowego P0 — M-03 już wdrożył 430px |
| Payroll / Cloud Sync | **Brak** |
| Gate B / Gate C CI | **Blokada** (tenders red → Gate C skipped) |
| False confidence | **Średnie** — czerwony Gate B wygląda jak regresja mobile, a jest stale assert |

---

## 5. PLAN — kolejność napraw (P0–P3)

| Priorytet | Ticket | Akcja | Zakres plików (orient.) | Klasyfikacja |
|-----------|--------|--------|-------------------------|--------------|
| **P0** | **CI-4 / TEUX4-ASSERT** | Zaktualizować asercję density: `max-[390px]` → `max-[430px]` (lub akceptuj obie / assert obecności `max-[430px]` zgodnej z M-03) + 1 linia komentarza TEUX-4↔M-03 | **tylko** `scripts/test-tender-mobile-teux4.mjs` (+ docs RCA) | test bug |
| **P1** | **RE-RUN Gate B tenders** | Po P0: pełny Gate B `--scope tenders` (ew. `--continue`) — potwierdzić PASS pozostałych | CI only | verify |
| **P2** | **WIP hygiene** | Przed kolejnymi remediacjami: nie mieszać lokalnego WIP `TenderPrzetargWorkspace` / `tender-ux-tokens` z CI remediacją | working tree | process |
| **P3** | Legacy E2E / Mobile smoke workflows | Poza Gate B — osobny AUDIT (wcześniejszy CI audit THEME) | poza tym raportem | backlog |

**OUT dla P0 (zalecane):** nie zmieniać `TenderDetailCommandLayer.tsx` z powrotem na 390 (cofnęłoby M-03); nie ruszać Payroll/Theme/UI poza testem.

---

## 6. DESIGN FREEZE — szkic (PROPOSED, Owner GO)

| Reguła | Treść |
|--------|--------|
| **IN** | `scripts/test-tender-mobile-teux4.mjs` — asercja density ↔ M-03 `max-[430px]` |
| **OUT** | Przywracanie `max-[390px]` w Command Layer · Payroll · Cloud Sync · Theme · commit WIP accordion |
| **DoD** | CI Gate B tenders: `LIB-TENDER-MOBILE-TEUX4` PASS · pełna lista tenders bez fail-fast FAIL · Gate C może wystartować |

---

## 7. Next

Czekaj **Owner GO → DESIGN FREEZE + IMPLEMENT P0 (CI-4 TEUX4 assert)**.  
Nie startuj P3 legacy E2E w tym samym GO bez osobnej decyzji.
