# WGDOM-HARDENING-01B0 — PLAN (H3-C Monitor-Only)

> **ID:** WGDOM-HARDENING-01B0  
> **STATUS:** PLAN COMPLETE  
> **Data:** 2026-07-24  
> **Owner GO:** APPROVED (PLAN only)  
> **Wariant:** **H3-C monitor-only** = smoke + progi + ledger + runbook (wzorzec **HARDENING-01D**)  
> **Wejście:** [`WGDOM-HARDENING-01B0-AUDIT.md`](./WGDOM-HARDENING-01B0-AUDIT.md) · [`WGDOM-HARDENING-01B0-RCA.md`](./WGDOM-HARDENING-01B0-RCA.md) · [`WGDOM-HARDENING-01-PLAN.md`](./WGDOM-HARDENING-01-PLAN.md) EPIC B · [`WGDOM-HARDENING-01D-PLAN.md`](./WGDOM-HARDENING-01D-PLAN.md) (REUSE wzorca)  
> **Poza zakresem tej fazy:** DESIGN FREEZE · ARCH REVIEW · implementacja · commit · push  
> **Production Baseline:** UI **2.65.40** · feature **`23d7723`** · docs tip **`e349506`** · EPIC A/D **CLOSED** · **STABILIZATION WINDOW ACTIVE**

```text
══════════════════════════════════════
WGDOM-HARDENING-01B0 PLAN COMPLETE

Mode:     H3-C monitor-only (tooling/docs)
Runtime:  ZERO semantics change (breaker / deps / builtAt)
OUT:      B1 · limits · HEAVY_E_RUN_DEP_KEYS · CORE
REUSE:    wzorzec 01D + Sync Storm T3/T8
══════════════════════════════════════
```

---

## 0. Zasady planu (frozen for PLAN 01B0)

| Zasada | Implikacja |
|--------|------------|
| **SSOT FIRST** | Breaker = jedna Map `heavyRunAttempts`; FP = `buildHeavyParseDocumentFingerprint`; tip/`09`; risk **H-FP-CHURN** |
| **REUSE FIRST** | Wzorzec deliverable 01D (smoke + progi + ledger + runbook + self-test); Sync Storm P0 suite (T3/T8) jako kontrakt; **nie** klonować logiki breakera |
| **ZERO DUPLICATE LOGIC** | Zakaz drugiej Map attempts / drugiego E-RUN / nowego limitu; monitor **odczytuje / symuluje FP** i raportuje |
| **MOBILE FIRST** | Progi na churn FP + guard thrash — proxy kosztu re-parse na telefonie |
| **Sync Storm P0 intact** | Każdy raport: `anyThrash` false; T3/T8 must PASS; deps/`builtAt` nietknięte |
| **STABILIZATION** | On-demand only; zakaz watchera/cron bez GO |
| **Mixed WT** | Stage tylko allowlist 01B0 (scripts/docs) |

### Potwierdzenie twardych zakazów (PLAN)

| Zakaz | Potwierdzenie |
|-------|---------------|
| Zmiana Circuit Breakera / scope klucza | **BRAK** |
| Zmiana `HEAVY_MAX_RUNS_PER_KEY` / limitów | **BRAK** |
| Zmiana `HEAVY_E_RUN_DEP_KEYS` | **BRAK** |
| `builtAt` w E-RUN / Heavy FP deps | **BRAK** |
| B1 (H3-A/B global cap / cooldown) | **OUT** |
| CORE Sync / N2 / Cloud Sync / Edge chunk | **OUT** |
| Zakres deliverable | **tooling/docs only** (prefer pure scripts; DF zdecyduje o ewentualnym KEEP DEBUG read-only — default **OFF / unikaj `src/**`**) |

---

## 1. Cel EPIC 01B0

Uczynić **H-FP-CHURN** mierzalnym sygnałem Stabilization Window:

1. Metryki **M1–M5** (RCA) w powtarzalnym raporcie.  
2. Smoke harness + **PASS/WARN/FAIL**.  
3. **Trend Ledger** + **Runbook** (REUSE 01D).  
4. Guard: Sync Storm class (`anyThrash`) + kontrakt T3/T8.

**Nie-cele:** zmiana breakera, „naprawa” churn limitem, B1, Autonomous FP (EPIC E), zamknięcie H-FP-CHURN jako FIXED forever.

---

## 2. Zakres PLAN (deliverable slices)

| Slice | Opis | Priorytet |
|-------|------|-----------|
| **B0-V1** | Canonical smoke / harness + `evaluateThresholds` + `--self-test` | **MUST** |
| **B0-V2** | Trend ledger SSOT + seed | **MUST** |
| **B0-V3** | Runbook Operatora | **MUST** |
| **B0-V4** | Opcjonalnie M6 (E-RUN duration) | **DEFER** (jak D-V3) — flaga DF |

**Canonical paths (projekcja → DF):**

| Artefakt | Path |
|----------|------|
| Smoke | `scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs` |
| Ledger | `docs/architecture/WGDOM-HARDENING-01B0-TREND-LEDGER.md` |
| Runbook | `docs/architecture/WGDOM-HARDENING-01B0-RUNBOOK.md` |
| Output | `.tmp/hardening-01b0-smoke-<ISO>.json` + `…-latest.json` |

**REUSE 01D:** ten sam kształt JSON (`id`, `at`, `tip`, `derived`, `thresholds.verdict/triggers`, exit 0=PASS|WARN, 1=FAIL); osobne metryki (nie mieszać z 546/`pipeSet` Network).

---

## 3. Metryki M1–M5

| ID | Metryka | Definicja operacyjna (PLAN) | Źródło (REUSE) |
|----|---------|------------------------------|----------------|
| **M1** | `uniqueGateFingerprintCount` | Liczba unikalnych FP heavy per `itemId` w oknie pomiaru (sesja smoke / N opens) | Offline: `buildHeavyParseDocumentFingerprint` na snapshotach itemu **lub** próbki LS w czasie (DF wybierze); **nie** druga implementacja FP |
| **M2** | `maxHeavyRunAttempts` | Max wartość attempts na dowolnym `heavyRunKey` w oknie | Test Map via istniejące `getHeavyRunAttemptsForTest` / harness vite-node **lub** odczyt po instrumentacji DF (prefer test harness) |
| **M3** | `breakerTripCount` | Ile razy attempts osiągnęło `HEAVY_MAX_RUNS_PER_KEY` (2) w oknie | Jak M2 / UX fail path — count trip events w harnessie |
| **M4** | `discoveryGrowthProxy` | Δ `externalDocDiscovery.files.length` + Δ `bzpDocuments.length` (i/lub upload present) skorelowane z M1 | Snapshot item before/after observe window |
| **M5** | Sync Storm guard | `anyThrash` (uniqueBuiltAt≥4) + kontrakt T3/T8 | REUSE 01D multi-tender thrash **lub** Final Audit policy; `node scripts/test-tenders-sync-storm-p0.mjs` |

**M6 (DEFER):** E-RUN wall time ms — tylko jeśli DF `includeM6=true`.

### 3.1 Jak zbierać bez zmiany breakera (projekcja IMPLEMENT)

| Warstwa | Podejście preferowane |
|---------|----------------------|
| **A — Contract** | Uruchom Sync Storm P0 (T3/T8) w self-test / CI-on-demand |
| **B — FP churn proxy** | Dla listy tender IDs: policz FP ze state pipeline (batch-get / fixture) przy T0 i T1; M1 = |set(FP)| |
| **C — Attempts Map** | Harness `vite-node` importujący **tylko** test getters / `resetDossierHeavyLazyForTests` — symulacja bump (nie prod UI) |
| **D — Live thrash** | Opcjonalnie REUSE fragmentu 01D observe `uniqueBuiltAt` (M5) bez liczenia 546 |

**Zakaz:** nowa Map w `src/`; zmiana `HEAVY_MAX_RUNS_PER_KEY`; logika „if churn then skip heavy”.

---

## 4. Kryteria PASS / WARN / FAIL

> Propozycja do **zamrożenia w DF** (liczby mogą być skorygowane wyłącznie DF amendment).

### 4.1 Progi (sesja referencyjna: jak 01D — do 11 open / lub N itemów w harnessie)

| Sygnał | PASS | WARN | FAIL |
|--------|------|------|------|
| **M5** `anyThrash` | false | — | **true → FAIL** (Sync Storm class) |
| **M5** Sync Storm T3/T8 | PASS | — | suite FAIL → **FAIL** |
| **M1** max unique FP / item w oknie | ≤2 | 3–4 | ≥5 |
| **M2** `maxHeavyRunAttempts` | ≤2 (kontrakt) | — | **>2 → FAIL** (naruszenie limitu P0 — regresja) |
| **M3** `breakerTripCount` / sesja | 0 | ≥1 | ≥3 **lub** trip bez towarzyszącego M4 growth |
| **M4** discoveryGrowthProxy (sum Δ files) | dowolny przy M1 PASS | M1 WARN + Δ≥1 (spójne) | M1 FAIL **bez** Δ docs (podejrzenie churn nie-discovery) |

**Reguła werdyktu (jak 01D):**

```text
if any FAIL  → verdict = FAIL  (exit 1)
else if any WARN → verdict = WARN (exit 0)
else             → verdict = PASS (exit 0)
```

**Interpretacja:**

| Verdict | Znaczenie |
|---------|-----------|
| **PASS** | Brak sygnału churn poza kontraktem; thrash=false; T3/T8 OK |
| **WARN** | Bounded churn widoczny (M1/M3) — odnotuj; **nie** włączaj B1 |
| **FAIL** | Thrash / T3/T8 broken / attempts>2 / anomalia M1 bez growth → Owner escalate (tor Sync Storm lub bug monitora — **nie** „fix limitu” w 01B0) |

**WARN ≠ rollback app. FAIL thrash ≠ „podnieś limit breakera”.**

---

## 5. Smoke harness / JSON (projekcja)

### 5.1 Minimalny raport JSON

```json
{
  "id": "WGDOM-HARDENING-01B0",
  "at": "<ISO-8601>",
  "tip": { "version": null, "commit": null },
  "derived": {
    "M1_maxUniqueFpPerItem": 0,
    "M2_maxHeavyRunAttempts": 0,
    "M3_breakerTripCount": 0,
    "M4_discoveryGrowthSum": 0,
    "M5_anyThrash": false,
    "M5_syncStormT3T8": "PASS"
  },
  "thresholds": {
    "verdict": "PASS|WARN|FAIL",
    "triggers": []
  },
  "results": [],
  "notes": "H3-C monitor-only; breaker semantics unchanged"
}
```

### 5.2 Self-test

Pure `evaluateThresholdsB0(derived) → { verdict, triggers }` + fixtures (jak D-T4) — **B0-T4**.

---

## 6. Trend Ledger (B0-V2)

| Element | PLAN |
|---------|------|
| Path | `WGDOM-HARDENING-01B0-TREND-LEDGER.md` |
| Kolumny | at · version · commit · M1 · M2 · M3 · M4 · M5_thrash · M5_T3T8 · verdict · artifact · notes |
| Seed | 1 wiersz „pre-monitor”: Final Audit / tip GREEN — thrash=false · T3/T8 PASS · M1–M4 = N/E (gap) |
| Reguła | Każdy decision-grade smoke → nowy wiersz |
| PII | Bez tytułów przetargów |

---

## 7. Runbook (B0-V3)

Treść zamrożona w DF (jak 01D §7): kiedy · komendy (`--self-test`, live/harness) · po runie dopisz ledger · interpretacja PASS/WARN/FAIL · **zakazy:** B1, zmiana limitu/deps/`builtAt`, mylenie z 01D 546, mylenie z Autonomous FP.

---

## 8. Test Matrix

| ID | Test | Gate |
|----|------|------|
| **B0-T1** | Raport zawiera M1–M5 + verdict | Must |
| **B0-T2** | Sync Storm P0 suite (T3/T8) PASS w torze monitora | Must |
| **B0-T3** | Tip GREEN: `anyThrash=false` (live lub ostatni artefakt) | Must |
| **B0-T4** | Self-test progów: thrash→FAIL; attempts>2→FAIL; M1=3→WARN; all clear→PASS | Must |
| **B0-T5** | `git diff` IMPLEMENT: **0** `src/**` zmieniających breaker/deps (prefer 0 `src/**` w ogóle) | Must |
| **B0-T6** | Ledger + seed istnieje | Must |
| **B0-T7** | Runbook: komenda + interpretacja + dopisz ledger + zakazy B1 | Must |
| **B0-T8** | AI/07 **H-FP-CHURN** nadal MONITOR/MITIGATED (nie FIXED) | Must |
| **B0-T9** | Zero importów cloud-sync / Edge chunk / Autonomous FP change | Must |
| **B0-T10** | (Jeśli M6 ON) duration field present | Must jeśli DF includeM6 |

---

## 9. Analiza ryzyka (PLAN)

| Ryzyko | Sev | Mitygacja |
|--------|-----|-----------|
| Scope creep B1 | CRITICAL | OUT list + DF + B0-T5 |
| False WARN M1 (data drift) | LOW | notes ledger; WARN≠FAIL |
| Mylenie z Sync Storm | HIGH | M5 FAIL path + runbook |
| Mylenie z 01D 546 | MEDIUM | Osobny script/ledger id `01B0` |
| Duplikacja FP logic | HIGH | Import SSOT `buildHeavyParseDocumentFingerprint` — nie kopiować algorytmu |
| Secrets w live smoke | MEDIUM | C3-style env-only (REUSE 01D) |

### Wpływ na Production

| Obszar | Wpływ |
|--------|--------|
| Runtime breaker / Persist / Cloud Sync | **Zero** |
| Mobile | Zero bezpośredni; alert churn |
| Tip UI 2.65.40 | Bez zmiany semantyki |

---

## 10. Acceptance criteria / Definition of Done

### 10.1 Acceptance (EPIC)

| # | Kryterium |
|---|-----------|
| A1 | Deliverable = tooling/docs (B0-T5/T9) |
| A2 | M1–M5 raportowane; progi PASS/WARN/FAIL działają |
| A3 | Ledger + runbook + seed |
| A4 | B0-T1…B0-T9 PASS |
| A5 | B1 / limits / deps / `builtAt` **nie** zmienione |
| A6 | H-FP-CHURN pozostaje **MONITOR** |
| A7 | Sync Storm T3/T8 PASS |

### 10.2 Definition of Done

- [ ] PLAN ✓ (ten dokument)  
- [ ] DF 01B0 · ARCH · Owner GO IMPLEMENT  
- [ ] B0-V1…V3 w repo  
- [ ] B0-T* PASS · OV  
- [ ] COMMIT/PUSH tylko po GO · scope-only  
- [ ] PV · CLOSEOUT · Decision Log jeśli potrzeba (monitor-only = D-xx opcjonalnie)  
- [ ] H-FP-CHURN nie oznaczony FIXED  

### 10.3 Rollback

Usunąć scripts/docs 01B0 — **zero** wpływu app (breaker nietknięty).

---

## 11. Kolejność realizacji

```text
DF 01B0 → ARCH → Owner GO IMPLEMENT
  → B0-V1 (smoke + evaluateThresholds + self-test)
  → B0-V2 (ledger + seed)
  → B0-V3 (runbook)
  → B0-T* → OV → COMMIT/PUSH (GO) → PV → CLOSE
```

---

## 12. Zależności

| Zależy od | Status |
|-----------|--------|
| AUDIT + RCA 01B0 | ✔ |
| EPIC A CLOSED | ✔ |
| Sync Storm P0 tip GREEN | ✔ |
| Wzorzec 01D CLOSED | ✔ (REUSE procesu) |
| Owner GO DF | **blocker** |
| EPIC E / C / B1 | Nie wymagane |

---

## 13. Wymagany Design Freeze

**TAK — `WGDOM-HARDENING-01B0-DESIGN-FREEZE.md`**

Minimum DF:
1. Canonical paths  
2. Definicje M1–M5 + progi tabeli §4  
3. `includeM6` true/false (default **false**)  
4. Zakaz B1 / limits / deps / `builtAt` / `src` breaker  
5. On-demand only · allowlist  
6. Mapowanie B0-T1…T10  

---

## 14. Owner Readiness do DESIGN FREEZE

| Kryterium | Stan |
|-----------|------|
| Zakres H3-C / B0-V* | ✔ |
| M1–M5 | ✔ |
| PASS/WARN/FAIL | ✔ |
| Test matrix | ✔ |
| DoD | ✔ |
| Zakazy | ✔ |
| Implementacja / commit / push | Nie |

```text
OWNER READINESS: READY FOR DESIGN FREEZE (01B0)

Next allowed step: Owner GO → WGDOM-HARDENING-01B0 DESIGN FREEZE
Forbidden without GO: ARCH · IMPLEMENT · commit · push
```

---

## 15. Raport końcowy (Owner card)

### 1. Zakres PLAN
H3-C monitor-only: B0-V1 smoke+progi · B0-V2 ledger · B0-V3 runbook · M6 DEFER · **zero** zmiany breakera/deps/`builtAt`/B1

### 2. Metryki M1–M5
M1 unique FP · M2 max attempts · M3 breaker trips · M4 discovery Δ · M5 thrash + T3/T8

### 3. Kryteria PASS/WARN/FAIL
§4 — thrash/T3/T8/attempts>2 → FAIL; M1 3–4 → WARN; M1≥5 → FAIL; WARN exit 0

### 4. Test Matrix
B0-T1…B0-T9 (T10 jeśli M6)

### 5. Definition of Done
§10.2 — DF→ARCH→IMPLEMENT→T*→OV→COMMIT(GO)→CLOSE; H-FP-CHURN MONITOR

### 6. Owner Readiness do DESIGN FREEZE
**READY**
