# WGDOM-HARDENING-01D — ARCHITECTURE REVIEW

> **ID:** WGDOM-HARDENING-01D  
> **STATUS:** ARCHITECTURE REVIEW COMPLETE  
> **Data:** 2026-07-24  
> **Owner GO:** APPROVED (ARCH REVIEW only)  
> **Wejście:** [`WGDOM-HARDENING-01D-DESIGN-FREEZE.md`](./WGDOM-HARDENING-01D-DESIGN-FREEZE.md) · [`WGDOM-HARDENING-01D-PLAN.md`](./WGDOM-HARDENING-01D-PLAN.md) · RCA · AUDIT · Sync Storm P0 / Final Audit  
> **Poza zakresem:** implementacja · commit · push  
> **Production Baseline:** UI **2.65.40** · feature **`23d7723`** · docs tip **`82e4532`** · EPIC A **CLOSED** · **STABILIZATION WINDOW ACTIVE**

```text
══════════════════════════════════════
WGDOM-HARDENING-01D ARCHITECTURE REVIEW

VERDICT:  PASS WITH BINDING CONSTRAINTS
Owner IMPLEMENT readiness: YES — po akceptacji C1–C6
══════════════════════════════════════
```

---

## 1. Zakres przeglądu

| Obszar | Wynik |
|--------|-------|
| Zgodność z Design Freeze (D1–D16) | **PASS** |
| Tooling/docs only | **PASS** (+ C1) |
| Brak `src/**` | **PASS** (+ C1) |
| Brak Cloud Sync | **PASS** |
| Brak retry HTTP 546 | **PASS** |
| Brak Edge chunk | **PASS** |
| Brak zmian semantyki aplikacji | **PASS** |
| SSOT FIRST | **PASS** |
| REUSE FIRST | **PASS** (+ C2) |
| ZERO DUPLICATE LOGIC | **PASS** (+ C2) |
| Smoke harness architecture | **PASS** (+ C2, C3, C5) |
| Trend ledger | **PASS** |
| Runbook | **PASS** |
| JSON schema | **PASS** (+ C4) |
| Progi WARN/FAIL | **PASS** (+ C5) |
| Allowlist / denylist | **PASS** (+ C1) |
| Plan testów D-T1…D-T8 | **PASS** (+ C5, C6) |
| Sync Storm P0 intact | **PASS** |
| D-V3 DEFER | **PASS** (+ C4) |

---

## 2. Werdykt końcowy

### **PASS WITH BINDING CONSTRAINTS**

DF 01D jest **architektonicznie poprawny** jako EPIC monitor-only (M2-A): nie narusza Sync Storm P0, nie wymaga CORE Sync, nie wprowadza drugiej ścieżki persist/retry, a deliverable miesci się w tooling/docs.

Implementacja może startować **tylko** przy przestrzeganiu wiążących constraintów **C1–C6** (nie zmieniają D1–D16; precyzują egzekucję REUSE, sekretów, allowlisty i testowalności progów).

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy DF narusza P0 / semantyki app? | **NIE** |
| Czy wprowadza duplicate Network/persist logic? | **NIE** (przy C2) |
| Czy Boundary FEATURE/tooling PASS? | **TAK** (projekcja; zero `src` / Edge / cloud-sync) |
| Owner Ready → IMPLEMENT? | **TAK** — po akceptacji C1–C6 |

**FAIL byłby wymagany gdyby:** DF wymuszał zmiany `src/**` / retry 546 / Edge chunk / Cloud Sync / ciche włączenie D-V3. **Nie stwierdzono.**

---

## 3. Checklist zgodności z Design Freeze

| DF | Treść | ARCH |
|----|-------|------|
| D1 | M2-A monitor-only | **OK** |
| D2–D3 | D-V1 + D-V2 IN | **OK** |
| D4 / D16 | D-V3 DEFER · `includeAttribution=false` | **OK** (+ C4) |
| D5–D9 | Zakazy runtime / Cloud Sync / retry / chunk / semantyka | **OK** (+ C1) |
| D10–D11 | Brak CI-must / brak watchera | **OK** |
| D12–D14 | Script / ledger / runbook paths | **OK** |
| D15 | PLATFORM tooling · zero CORE | **OK** |
| §3.2 | Progi WARN/FAIL | **OK** (+ C5) |
| §3.3 | JSON schema · `statusByPath: null` | **OK** (+ C4) |
| §5 | D-T1…D-T8 | **OK** (+ C5, C6) |
| §7 | Runbook treść | **OK** |

**Potwierdzenie zgodności z Design Freeze: TAK** (z binding C1–C6 jako precyzja IMPLEMENT, nie zmiana DF).

---

## 4. Zasady architektoniczne

### 4.1 SSOT FIRST — PASS

| SSOT | Ocena |
|------|--------|
| Empiria baseline / post-A | Artefakty AUDIT + seed ledger |
| Tip / residual risk | `docs/AI/09` · `docs/AI/07` M-EDGE-546 = MONITOR |
| Progi / werdykt | Jedyna definicja w DF §3.2 — skrypt **musi** je implementować 1:1 |
| Ledger | Jedyny trend SSOT pod D13 |

Brak konkurencyjnych definicji progów w PLAN vs DF po zamrożeniu — IMPLEMENT czyta **tylko DF**.

### 4.2 REUSE FIRST — PASS (+ C2)

Źródło: `.tmp/final-prod-audit-multi.mjs` (Final Audit / AUDIT 01D).  
Canonical: `scripts/smoke-wgdom-hardening-01d-edge-546.mjs`.

**C2 (BINDING) — jeden harness, zero dual-maintenance:**

| Zakaz | Wymaganie IMPLEMENT |
|-------|---------------------|
| Dwa żywe skrypty o rozjeżdżającej się logice liczenia | **C2-A (prefer):** skopiować logikę Network/open do `scripts/…`, dodać progi+JSON DF; w nagłówku skryptu: „canonical; `.tmp/final-prod-audit-multi.mjs` = legacy evidence-only / nie rozwijać” |
| Import app / cloud-sync | **Zakaz** |
| Nowy równoległy Playwright smoke „01d-v2” | **Zakaz** |

Bez C2 → naruszenie REUSE / ZERO DUPLICATE w czasie.

### 4.3 ZERO DUPLICATE LOGIC — PASS (+ C2)

- Monitor = agregacja `response.status` + pipe counters (istniejący model Final Audit).  
- **Zakaz** nowego writer’a, retry helpera, Edge route, persist mode.  
- Progi = pure evaluation na już zebranych licznikach (C5) — nie druga ścieżka telemetrii w SPA.

---

## 5. Ocena komponentów

### 5.1 Smoke harness — PASS (+ C2, C3, C5)

| Aspekt | Ocena |
|--------|-------|
| Target / 11 open / ~25s | Zgodne z empirią AUDIT — **OK** |
| Liczniki pipe get/set + status map | REUSE — **OK** |
| Guards thrash / 522 | Obowiązkowe — **OK** |
| On-demand only | Zgodne D10–D11 — **OK** |
| Sekrety | **C3 BINDING** (patrz §6) |
| Testowalność progów bez live | **C5 BINDING** |

Architektura harnessu jako **obserwator Network** (nie mutator stanu domeny) jest poprawna dla MOBILE FIRST monitoringu egress.

### 5.2 Trend ledger — PASS

| Aspekt | Ocena |
|--------|-------|
| Path D13 | **OK** |
| Schema kolumn | Kompletna do Stabilization — **OK** |
| Seed pre-A / post-A | Wymagany — **OK** |
| PII (bez tytułów) | **OK** |
| Process drift | Mitygowany D-T7 — **OK** |

Ledger jest docs SSOT — nie runtime. Brak potrzeby bazy/CI.

### 5.3 Runbook — PASS

Treść DF §7 jest wystarczająca operacyjnie: kiedy · komenda · po runie · zakazy Operatora (retry/chunk/flag/H-FAT).  
IMPLEMENT: osobny plik D14 **bez zmiany semantyki** progów.

### 5.4 JSON schema — PASS (+ C4)

Minimum DF §3.3 jest spójne z harnessem Final Audit + warstwą `derived`/`thresholds`.  

**C4 (BINDING) — D-V3 pozostaje wyłączone:**

- Pole `statusByPath` **musi** być `null` (lub nieobecne + runbook: „always null in 01D”).  
- **Zakaz** cichego dodania attribution „przy okazji” IMPLEMENT.  
- Re-open tylko DF amendment + Owner GO.

### 5.5 Progi WARN/FAIL — PASS (+ C5)

| Próg | Arch ocena |
|------|------------|
| 546 WARN≥1 / FAIL≥3 lub rate>2% | Sensowny względem baseline 2/414 ≈ 0.48% — **OK** |
| pipeSet WARN>18 / FAIL>22 | Kotwica post-A=13 / pre-A=22 — **OK** |
| maxPipeSet WARN≥3 / FAIL≥4 | Zgodne z empirią max 3→2 — **OK** |
| any522 / anyThrash → FAIL | Oddziela Sync Storm — **OK** |
| WARN → exit 0 | Unika false incident — **OK** |

**C5 (BINDING) — pure threshold function:**

- Wydzielić (w tym samym pliku skryptu) funkcję np. `evaluateThresholds(netTotals, derived) → { verdict, triggers }`  
- D-T4 uruchamialne **bez** Playwright/prod (fixture / `--self-test`)  
- Liczby progów **tylko** z DF (stałe nazwane; zakaz „magic tweak” bez amendment)

### 5.6 Allowlist / denylist — PASS (+ C1)

**C1 (BINDING) — egzekucja scope przy COMMIT:**

Allowlist (jedyna):

```text
scripts/smoke-wgdom-hardening-01d-edge-546.mjs
docs/architecture/WGDOM-HARDENING-01D-TREND-LEDGER.md
docs/architecture/WGDOM-HARDENING-01D-RUNBOOK.md
docs/architecture/WGDOM-HARDENING-01D-IMPLEMENTATION-REPORT.md
docs/architecture/WGDOM-HARDENING-01D-ARCHITECTURE-REVIEW.md   (ten plik — docs)
docs/architecture/WGDOM-HARDENING-01D-*.md                     (AUDIT/RCA/PLAN/DF/CLOSEOUT gdy powstają)
docs/AI/07_KNOWN_RISKS.md                                      (opcjonalnie ≤ link MONITOR)
```

Denylist (twardy STOP):

```text
src/**
supabase/**
**/cloud-sync*
**/kv-mset-chunk*
storage / TEUX / ARCH-02F WIP
```

D-T5 = must przed każdym commit GO.

### 5.7 Plan testów D-T1…D-T8 — PASS (+ C5, C6)

| ID | Arch ocena |
|----|------------|
| D-T1…D-T3 | Pokrywają output + tip guards — **OK** |
| D-T4 | Wymaga C5 (self-test) — **OK z C5** |
| D-T5 | Egzekwuje C1 — **OK** |
| D-T6…D-T8 | Ledger + runbook + AI/07 MONITOR — **OK** |

**C6 (BINDING) — detekcja `any522`:**

Źródłowy smoke liczy `statusDelta522` per open z `net.status["522"]`. Canonical skrypt **musi**:

1. Utrzymać per-open `statusDelta522` **oraz**  
2. Ustawić `derived.any522 = results.some(r => r.statusDelta522 > 0) || (net.status["522"] > 0)`  
3. Nie mylić nieobecności klucza `"522"` z zerem (traktować absent = 0)

Bez C6 → ryzyko false PASS na guardzie Sync Storm.

---

## 6. Binding constraints (C1–C6) — lista wiążąca

| ID | Constraint | Dlaczego |
|----|------------|----------|
| **C1** | COMMIT tylko allowlist; D-T5 must; zero `src/**` / supabase / cloud-sync | Mixed WT + #CORE-013 |
| **C2** | Jeden canonical harness w `scripts/`; nie rozwijać równolegle `.tmp/final-prod-audit-multi.mjs` | REUSE / ZERO DUPLICATE |
| **C3** | **Brak hardcoded credentials** w `scripts/` — tylko `process.env` / `loadEnv`; brak default password w repo | Security; źródłowy `.tmp` ma default pass — **nie kopiować dosłownie** |
| **C4** | `statusByPath === null`; D-V3 DEFER bez cichego ON | DF D4/D16 |
| **C5** | Pure `evaluateThresholds` + `--self-test` / fixture dla D-T4 | Testowalność bez live; zgodność progów DF |
| **C6** | `any522` / thrash guards jak wyżej; FAIL → exit 1 | Sync Storm P0 intact |

**C3 szczegóły:** IMPLEMENT może czytać `WGDOM_ADMIN_PASS` z env; jeśli brak — **fail fast** z komunikatem (nie fallback do hasła w źródle). SR/anon — wyłącznie z env.

---

## 7. Zidentyfikowane ryzyka (ARCH)

| ID | Ryzyko | Sev | Mitygacja |
|----|--------|-----|-----------|
| **A1** | Skopiowanie default password z `.tmp` do `scripts/` | HIGH | **C3** |
| **A2** | Dual harness drift | MEDIUM | **C2** |
| **A3** | Scope creep retry/chunk/D-V3 przy „szybkim” WARN | HIGH | C1 + C4 + runbook zakazy |
| **A4** | False WARN (set drift) | LOW | WARN≠FAIL; notes ledger |
| **A5** | Mylenie FAIL 546 z Sync Storm | HIGH | C6 + runbook torów |
| **A6** | Fałszywe CLOSED H-FAT / M-EDGE | MEDIUM | D-T8 MONITOR |
| **A7** | Secrets w logach CI jeśli ktoś włączy CI mimo D10 | LOW | D10 OUT; nie commit secrets |

Residual epicki: **MEDIUM MONITOR** — zgodny z RCA; nie blokuje tip GREEN.

---

## 8. Potwierdzenie zakazów (hard)

| Zakaz | ARCH |
|-------|------|
| Zmiany runtime / `src/**` | **POTWIERDZONE** — poza scope (+ C1) |
| Cloud Sync | **POTWIERDZONE** |
| Retry HTTP 546 | **POTWIERDZONE** |
| Edge chunk | **POTWIERDZONE** |
| Zmiana semantyki aplikacji | **POTWIERDZONE** |
| Tooling/docs only | **POTWIERDZONE** |

---

## 9. Boundary classification

| | |
|--|--|
| Klasa | **PLATFORM / FEATURE tooling** |
| CORE Sync Owner GO | **Nie wymagany** (przy C1) |
| Sync Storm P0 contract amendment | **Nie wymagany** |
| Mixed WT | Stage allowlist only (**C1**) |

---

## 10. Owner Readiness do IMPLEMENT

| Kryterium | Stan |
|-----------|------|
| Werdykt ARCH | **PASS WITH BINDING CONSTRAINTS** |
| C1–C6 sformułowane | ✔ |
| Zgodność z DF | ✔ |
| Zakazy hard | ✔ |
| Implementacja / commit / push | Nie (zgodne z GO) |

```text
OWNER READINESS: READY FOR IMPLEMENT (01D)

Next allowed step: Owner GO → WGDOM-HARDENING-01D IMPLEMENT
Binding: C1–C6 obowiązkowe
Forbidden without GO: commit · push
Forbidden always in 01D: src/** · cloud-sync · retry 546 · Edge chunk · D-V3 silent ON
```

---

## 11. Raport końcowy (Owner card)

### 1. Wynik
**PASS WITH BINDING CONSTRAINTS**

### 2. Wiążące ograniczenia architektoniczne
**C1** allowlist/D-T5 · **C2** jeden harness · **C3** no hardcoded secrets · **C4** `statusByPath=null` / D-V3 DEFER · **C5** pure thresholds + self-test · **C6** any522/thrash guards

### 3. Zidentyfikowane ryzyka
A1–A7 (§7) — najwyższe: secrets copy (A1), scope creep (A3), mylenie ze storm (A5)

### 4. Potwierdzenie zgodności z Design Freeze
**TAK** — D1–D16 i §3–§7 DF zachowane; C1–C6 = precyzja IMPLEMENT

### 5. Owner Readiness do IMPLEMENT
**READY** (po akceptacji C1–C6)
