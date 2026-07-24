# WGDOM-HARDENING-01D — PLAN (Monitor-Only)

> **ID:** WGDOM-HARDENING-01D  
> **STATUS:** PLAN COMPLETE  
> **Data:** 2026-07-24  
> **Owner GO:** APPROVED (PLAN only)  
> **Wariant:** **M2-A monitor-only** = **D-V1 (must)** + **D-V2 (must)** + **D-V3 (optional DF)**  
> **Wejście:** [`WGDOM-HARDENING-01D-AUDIT.md`](./WGDOM-HARDENING-01D-AUDIT.md) · [`WGDOM-HARDENING-01D-RCA.md`](./WGDOM-HARDENING-01D-RCA.md) · [`WGDOM-HARDENING-01-PLAN.md`](./WGDOM-HARDENING-01-PLAN.md) EPIC D  
> **Poza zakresem tej fazy:** DESIGN FREEZE · ARCH REVIEW · implementacja · commit · push  
> **Production Baseline:** UI **2.65.40** · feature **`23d7723`** · docs tip **`82e4532`** · EPIC A **CLOSED** · **STABILIZATION WINDOW ACTIVE**

```text
══════════════════════════════════════
WGDOM-HARDENING-01D PLAN COMPLETE

Mode:     monitor-only (tooling/docs)
Runtime:  ZERO changes
OUT:      retry 546 · Cloud Sync · Edge chunk
══════════════════════════════════════
```

---

## 0. Zasady planu (frozen for PLAN 01D)

| Zasada | Implikacja |
|--------|------------|
| **SSOT FIRST** | Baseline = Final Audit JSON; post-A = AUDIT 01D JSON; tip = `docs/AI/09`; risk = `docs/AI/07` M-EDGE-546 |
| **REUSE FIRST** | Jeden harness Network: pochodna `.tmp/final-prod-audit-multi.mjs` — **zakaz** drugiego smoke z inną logiką liczenia |
| **ZERO DUPLICATE LOGIC** | Monitor tylko agreguje `response.status` + pipe counters; **zero** nowych ścieżek persist/retry/Edge |
| **MOBILE FIRST** | Alerty łączą **546** i **pipeSet** (egress proxy) — nie tylko HTTP error |
| **Sync Storm P0 intact** | Każdy raport: `anyThrash` + `any522` muszą pozostać false/0 jako guard |
| **STABILIZATION** | On-demand smoke; **zakaz** ciągłego pollingu / watchera prod |
| **Mixed WT** | IMPLEMENT stage tylko pliki 01D (scripts/docs) — nie `src/`, nie Edge WIP |

### Potwierdzenie twardych zakazów (PLAN)

| Zakaz | Potwierdzenie |
|-------|---------------|
| Zmiany runtime (`src/**`, SPA bundle) | **BRAK** w zakresie 01D |
| Zmiany Cloud Sync (`cloud-sync.ts`, batch retry classifier) | **BRAK** |
| Retry / swallow HTTP 546 | **BRAK** |
| Edge chunk / fat-key split / `kv-mset-chunk` | **BRAK** (M2-C OUT) |
| Zakres deliverable | **tooling/docs only** |

**M2-B** (redukcja load) = już dostarczone przez **EPIC A CLOSED** — nie jest work itemem 01D.  
**M2-C** = osobny gated epic — poza PLAN 01D.

---

## 1. Cel EPIC 01D

Uczynić Edge **546** (`WORKER_RESOURCE_LIMIT`) oraz korelację z **pipeSet** **mierzalnym, powtarzalnym sygnałem Stabilization Window**:

1. Uruchamialny smoke + **progi alarmowe** (D-V1).  
2. **Trend ledger** SSOT w dokumentacji (D-V2).  
3. Opcjonalnie **per-URL attribution** 546 w tym samym smoke (D-V3) — bez runtime.

**Nie-cele:** naprawa 546, zmniejszenie limitu platformy, zmiana persist, zamknięcie H-FAT-PIPELINE.

---

## 2. D-V1 — Smoke + progi alarmowe (**MUST**)

### 2.1 Cel

Utrwalić REUSE multi-tender smoke jako **gate obserwacyjny**: jeden run → JSON + werdykt względem progów (546, pipeSet, 522/thrash).

### 2.2 Zakres

| IN | OUT |
|----|-----|
| Promocja/wrapper harnessu z `.tmp/final-prod-audit-multi.mjs` → np. `scripts/smoke-wgdom-hardening-01d-edge-546.mjs` (REUSE logiki; ścieżki output pod `.tmp/hardening-01d-*.json`) | Zmiany `src/**` |
| Runbook: jak uruchomić, co zbierać, jak interpretować progi | CI obowiązkowy na każdy PR (opcjonalnie później — poza must) |
| Progi alarmowe (propozycja poniżej — **zamrożenie w DF**) | Retry 546 · cloud-sync · Edge |
| Exit code ≠0 przy FAIL progu (dla Operatora) | Continuous watcher / cron bez Owner GO |

**Propozycja progów (do DF — nie implementować w PLAN):**

| Sygnał | WARN | FAIL (escalate Owner) |
|--------|------|------------------------|
| `status["546"]` (sesja 11 open) | ≥1 | ≥3 **lub** `546_rate` > 2% Edge responses |
| `pipeSet` vs post-A baseline (13) | > 18 (+~40%) | > 22 (powrót do pre-A) |
| `maxPipeSet` / open | ≥3 | ≥4 |
| `any522` | — | **any true = FAIL** |
| `anyThrash` | — | **any true = FAIL** (Sync Storm class) |

Baseline SSOT do porównań:

| Label | Artefakt | 546 | pipeSet |
|-------|----------|-----|---------|
| Pre-A | `.tmp/final-prod-audit-multi-tender-baseline-2.65.39.json` | 2 | 22 |
| Post-A | `.tmp/hardening-01d-audit-multi-tender-2.65.40.json` | 0 | 13 |

### 2.3 Analiza ryzyka

| Ryzyko | Sev | Mitygacja |
|--------|-----|-----------|
| False WARN przy top-set drift | LOW | Log id set + scores; DF: WARN≠automatyczny rollback |
| Operator myli WARN 546 z Sync Storm | HIGH | Guard 522/thrash w tym samym raporcie |
| Skrypt w `scripts/` rozjeżdża się z `.tmp` | MEDIUM | REUSE: jeden plik źródłowy lub jawny „canonical copy” w DF |
| Agent loop / polling | LOW | Runbook: on-demand only |
| Secrets w smoke (admin/SR) | MEDIUM | Tylko lokalnie/Owner; nie commitować `.env` |

### 2.4 Wpływ na Production

| Obszar | Wpływ |
|--------|--------|
| Runtime app / Edge function | **Zero** |
| Cloud Sync / Payroll | **Zero** |
| Mobile users | **Zero** bezpośredni; pośredni = wcześniejszy sygnał regresji egress |
| Ops load | Niski — ręczny smoke Stabilization |

### 2.5 Plan testów

| ID | Test | Gate |
|----|------|------|
| **D-T1** | Skrypt raportuje `546`, `pipeSet`, `maxPipeSet`, `any522`, `anyThrash` | Must |
| **D-T2** | Porównanie do baseline pre-A / post-A udokumentowane w output lub runbook | Must |
| **D-T3** | Na tipie GREEN: `any522=false`, `anyThrash=false` | Must |
| **D-T4** | Symulacja progów (fixture JSON lub dry-check): 546=0→PASS; 546=2→WARN; 546=3→FAIL | Must (logika progów) |
| **D-T5** | `git diff` IMPLEMENT: **0** plików `src/**`, `supabase/**`, `cloud-sync*` | Must (scope) |

### 2.6 Rollback

- Usunąć/wyłączyć skrypt + runbook.  
- **Zero** wpływu na prod app / tip UI.  
- Artefakty `.tmp/*` mogą zostać jako evidence history.

### 2.7 Definition of Done (D-V1)

- [ ] Harness w repo (scripts lub udokumentowany canonical path) uruchamialny on-demand  
- [ ] Progi WARN/FAIL zamrożone w DF i zaimplementowane w raporcie/exit  
- [ ] D-T1…D-T5 PASS  
- [ ] Runbook Operatora (komenda, artefakty, interpretacja)  
- [ ] Brak diff w runtime / Cloud Sync / Edge

### 2.8 Wymagany Design Freeze

**TAK — obowiązkowy:** [`WGDOM-HARDENING-01D-DESIGN-FREEZE.md`](./WGDOM-HARDENING-01D-DESIGN-FREEZE.md) (lekki)

DF musi zamrozić: ścieżkę skryptu, format JSON, progi WARN/FAIL, zakazy OUT, politykę on-demand, listę metryk obowiązkowych.

---

## 3. D-V2 — Trend ledger w dokumentacji (**MUST**)

### 3.1 Cel

Jedna SSOT tabela trendów 546/pipeSet w czasie Stabilization — bez zależności od CI i bez runtime.

### 3.2 Zakres

| IN | OUT |
|----|-----|
| Nowy lub sekcja w docs: np. `docs/architecture/WGDOM-HARDENING-01D-TREND-LEDGER.md` (lub sekcja w CLOSEOUT po IMPLEMENT) | Automatyczny cron |
| Kolumny: data · tip version/commit · 546 · pipeSet · maxPipeSet · allSet · any522 · anyThrash · werdykt · link JSON | Zmiana `docs/AI/09` tip feature bez Owner (09 tylko przy CLOSE jeśli potrzeba) |
| Procedura: po każdym smoke Operator **dopisuje wiersz** | Runtime / Edge |
| Opcjonalnie cross-link z `docs/AI/07` M-EDGE-546 → ledger | Retry / chunk docs jako „fix” |

**Minimalny seed (już znany z AUDIT):**

| Data (UTC) | Tip | 546 | pipeSet | maxPipeSet | any522 | anyThrash | Werdykt |
|------------|-----|-----|---------|------------|--------|-----------|---------|
| 2026-07-24T00:45Z | 2.65.39 / pre-A | 2 | 22 | 3 | false | false | Baseline WARN-class |
| 2026-07-24T02:43Z | 2.65.40 / post-A | 0 | 13 | 2 | false | false | PASS vs post-A |

### 3.3 Analiza ryzyka

| Ryzyko | Sev | Mitygacja |
|--------|-----|-----------|
| Ledger nieaktualny (process drift) | MEDIUM | DoD: wpis obowiązkowy przy każdym D-V1 run używanym do decyzji |
| Duplikacja SSOT vs AI/07 | LOW | 07 = status MONITOR + link; ledger = liczby |
| Wrażliwe dane tender titles w docs | LOW | W ledgerze tylko metryki + ścieżka JSON (tytuły zostają w `.tmp`) |

### 3.4 Wpływ na Production

**Zero** — wyłącznie dokumentacja.

### 3.5 Plan testów

| ID | Test | Gate |
|----|------|------|
| **D-T6** | Ledger istnieje; seed pre-A + post-A zgodny z AUDIT JSON | Must |
| **D-T7** | Runbook D-V1 wskazuje „dopisz wiersz do ledger” | Must |
| **D-T8** | Brak sprzeczności z `docs/AI/07` M-EDGE-546 (nadal MONITOR) | Must |

### 3.6 Rollback

- Usunąć plik/sekcję ledger — zero wpływu app.  
- Zachować JSON evidence w `.tmp` jeśli potrzebne historycznie.

### 3.7 Definition of Done (D-V2)

- [ ] Plik/sekcja ledger w `docs/architecture/`  
- [ ] Seed 2 wiersze (pre-A, post-A)  
- [ ] Procedura wpisu w runbooku  
- [ ] D-T6…D-T8 PASS  
- [ ] Link z runbooka 01D / (opcjonalnie) AI/07

### 3.8 Wymagany Design Freeze

**TAK — w tym samym DF 01D** (nie osobny DF): nazwa pliku ledger, schemat kolumn, reguła „każdy smoke decyzyjny = nowy wiersz”.

---

## 4. D-V3 — Per-URL attribution w smoke (**OPTIONAL**)

### 4.1 Cel

Wzmocnić kauzalność / diagnostykę: które pathname Edge (`/batch-set`, `/batch-get`, inne) generują 546 — **bez** zmian runtime app.

### 4.2 Zakres

| IN | OUT |
|----|-----|
| Rozszerzenie **tego samego** response listenera: `statusByPath[pathname][code]++` | Nowy równoległy harness |
| Opcjonalnie: capture `sb-error-code` header / body code gdy status=546 | Zmiana Edge function · cloud-sync |
| Pola w JSON output: `netTotals.statusByPath` (lub równoważne) | Retry · payload mutation · src/** |
| Dokumentacja interpretacji w runbooku | Wymóg PAT Dashboard (opcjonalny plus, nie must D-V3) |

**DF gate:** D-V3 wchodzi do IMPLEMENT **tylko jeśli** DF ustawi `includeAttribution: true`. Domyślna rekomendacja PLAN: **włączyć w DF** (niski koszt, wysoka wartość diagnostyczna), ale Owner może DEFER.

### 4.3 Analiza ryzyka

| Ryzyko | Sev | Mitygacja |
|--------|-----|-----------|
| Złożoność skryptu / regresja liczników pipe | MEDIUM | Test: pipeSet/546 totals **identyczne** jak bez attribution (D-T9) |
| PII w URL query | LOW | Agregacja po pathname bez query string |
| Scope creep „skoro widzimy batch-set → dodajmy retry” | HIGH | Zakaz w DF; attribution ≠ fix |

### 4.4 Wpływ na Production

**Zero** runtime. Jedynie bogatszy artefakt `.tmp` przy smoke.

### 4.5 Plan testów

| ID | Test | Gate |
|----|------|------|
| **D-T9** | Totals `status["546"]` i `pipeSet` zgodne z runem bez attribution (same session counters) | Must jeśli D-V3 ON |
| **D-T10** | Przy 546>0 (fixture lub history baseline replay): raport wskazuje pathname bucket | Must jeśli D-V3 ON |
| **D-T11** | Diff nadal zero `src/**` / supabase / cloud-sync | Must |

### 4.6 Rollback

- Revert commit skryptu do wersji D-V1-only.  
- Ledger D-V2 pozostaje ważny.

### 4.7 Definition of Done (D-V3)

- [ ] DF: `includeAttribution=true` **lub** jawny DEFER w DF  
- [ ] Jeśli ON: D-T9…D-T11 PASS + pole w JSON + runbook  
- [ ] Jeśli DEFER: ticket/follow-up w CLOSEOUT — nie blokuje CLOSE D-V1+D-V2  

### 4.8 Wymagany Design Freeze

**TAK — flaga w DF 01D** (`includeAttribution: true|false`). Brak osobnego DF.

---

## 5. Kolejność realizacji

```text
1) DESIGN FREEZE 01D
      — progi, format JSON, ledger schema, includeAttribution, zakazy OUT
2) ARCH REVIEW 01D
      — oczekiwany FEATURE PASS (zero CORE / zero src)
3) Owner GO IMPLEMENT
4) IMPLEMENT D-V1 (harness + progi + runbook)
5) IMPLEMENT D-V2 (trend ledger + seed)
6) IMPLEMENT D-V3 (tylko jeśli DF includeAttribution=true)
7) TEST D-T* → OV (smoke na tipie lub dry progów) → COMMIT/PUSH (GO) → CLOSE
```

**Równoległość:** D-V1 i D-V2 w jednym bundle docs+scripts. D-V3 = ten sam commit lub follow-up docs/scripts — nigdy mieszany z runtime WIP.

---

## 6. Zależności

| Zależy od | Status | Blokuje |
|-----------|--------|---------|
| AUDIT 01D COMPLETE | ✔ | — |
| RCA 01D COMPLETE | ✔ | — |
| EPIC A CLOSED @ 2.65.40 | ✔ | sens post-A baseline |
| Artefakty `.tmp/*multi-tender*` | ✔ | seed ledger / progi |
| Sync Storm P0 tip GREEN | ✔ | guard 522/thrash |
| Owner GO DESIGN FREEZE | **oczekuje** | DF → ARCH → IMPLEMENT |
| PAT / Dashboard logs | **NIE wymagane** do D-V1/V2 | kauzalność wzmocniona (RCA M2) — opcjonalnie później |
| EPIC B / C / E | Nie blokuje | — |
| Edge chunk / Cloud Sync changes | **Zakazane** | — |

---

## 7. Kryteria akceptacji (EPIC 01D)

### 7.1 Must (CLOSE ready)

| # | Kryterium |
|---|-----------|
| A1 | Deliverable = **wyłącznie** tooling/docs (D-T5) |
| A2 | D-V1: smoke uruchamialny + progi WARN/FAIL + runbook |
| A3 | D-V2: trend ledger z seed pre-A / post-A |
| A4 | D-T1…D-T3, D-T6…D-T8 PASS |
| A5 | Raport zawsze zawiera guard `any522` + `anyThrash` |
| A6 | Dokumentalne potwierdzenie zakazów: no runtime · no Cloud Sync · no retry 546 · no Edge chunk |
| A7 | `docs/AI/07` M-EDGE-546 pozostaje **MONITOR** (nie „FIXED”) |
| A8 | H-FAT-PIPELINE nie oznaczony CLOSED przez 01D |

### 7.2 Optional

| # | Kryterium |
|---|-----------|
| O1 | D-V3 attribution ON + D-T9…D-T11 PASS **lub** jawny DEFER w DF/CLOSEOUT |
| O2 | Drugi live smoke N≥2 w Stabilization (wzmacnia trend; nie blokuje CLOSE monitor-epic jeśli seed+harness OK) |

### 7.3 Fail / STOP

| Warunek | Akcja |
|---------|--------|
| Diff w `src/**` lub `cloud-sync` lub Edge | **STOP** — poza scope |
| Próba retry 546 | **STOP** |
| `any522` lub thrash true na tipie GREEN podczas OV | **STOP** → Sync Storm / incident path (nie „fix 546”) |

---

## 8. Wpływ zbiorczy na Production

| Warstwa | Wpływ 01D |
|---------|-----------|
| UI / runtime | **Brak** |
| Edge function code | **Brak** |
| Cloud Sync | **Brak** |
| Mobile egress | **Brak bezpośredni**; monitoring chroni przed regresją |
| Tip version | Bez zmiany semantyki app; możliwy docs tip po commit docs/scripts |
| Stabilization | **Tak** — mierzalny sygnał 546 + pipeSet |

---

## 9. Rollback strategy (EPIC)

1. Revert commit(s) scripts/docs 01D.  
2. Prod app **nie wymaga** rollbacku (nie dotknięta).  
3. Ledger history można zachować w git history.

---

## 10. Wymagany Design Freeze (zbiorczo)

| Artefakt | Wymagany? |
|----------|-----------|
| `WGDOM-HARDENING-01D-DESIGN-FREEZE.md` | **TAK (jeden DF dla D-V1+V2+V3 flag)** |
| Osobny DF per wariant | **NIE** |
| Sync Storm P0 contract amendment | **NIE** (brak zmian heavy/persist) |
| CORE Owner GO | **NIE** (jeśli diff = tooling/docs only) |

**DF musi zawierać minimum:**

1. Canonical script path + output paths  
2. Progi WARN/FAIL (tabela)  
3. Ledger path + schema  
4. `includeAttribution` true/false  
5. Explicit OUT list (runtime, cloud-sync, retry 546, Edge chunk)  
6. On-demand only (no watcher)  
7. Test IDs D-T1…D-T11 mapping  

---

## 11. Boundary / ARCH (projekcja)

| | |
|--|--|
| Dominująca klasa | **FEATURE / PLATFORM tooling** |
| CORE Sync | **Nie** (przy zachowaniu zakazów) |
| Oczekiwany ARCH | **PASS** lub **PASS WITH CONSTRAINTS** (C: zero src, zero retry) |
| #CORE-013 mixed WT | Stage **tylko** allowlist 01D |

---

## 12. Owner Readiness do DESIGN FREEZE

| Kryterium | Stan |
|-----------|------|
| Cel / zakres D-V1·V2·V3 | ✔ |
| Progi (propozycja) | ✔ — do zamrożenia w DF |
| Testy / DoD / rollback | ✔ |
| Kolejność + zależności | ✔ |
| Zakazy runtime/Cloud Sync/retry/chunk | ✔ potwierdzone |
| Implementacja / commit / push | Nie wykonane (zgodne z GO) |

```text
OWNER READINESS: READY FOR DESIGN FREEZE (01D)

Next allowed step: Owner GO → WGDOM-HARDENING-01D DESIGN FREEZE
Forbidden without GO: ARCH · IMPLEMENT · commit · push
```

---

## 13. Raport końcowy (Owner card)

### 1. Kolejność realizacji

```text
DF 01D → ARCH → Owner GO IMPLEMENT
  → D-V1 (smoke+progi+runbook)
  → D-V2 (trend ledger+seed)
  → D-V3 (tylko jeśli DF includeAttribution=true)
  → TEST → OV → COMMIT/PUSH (GO) → CLOSE
```

### 2. Zależności

AUDIT✓ · RCA✓ · EPIC A CLOSED · baseline JSON✓ · tip GREEN · **Owner GO DF** (blocker) · PAT nie wymagany.

### 3. Kryteria akceptacji

Tooling/docs only · D-V1+D-V2 must · D-V3 opt · D-T* · guards 522/thrash · M-EDGE-546 pozostaje MONITOR · zero runtime/Cloud Sync/retry/chunk.

### 4. Owner Readiness do DESIGN FREEZE

**READY**
