# WGDOM-HARDENING-01B0 — DESIGN FREEZE (Circuit Breaker Telemetry)

> **ID:** WGDOM-HARDENING-01B0  
> **STATUS:** DESIGN FREEZE COMPLETE  
> **Data:** 2026-07-24  
> **Owner GO:** APPROVED (DF only)  
> **EPIC:** B0 — Circuit Breaker Telemetry · **H3-C monitor-only**  
> **Wejście:** [`WGDOM-HARDENING-01B0-PLAN.md`](./WGDOM-HARDENING-01B0-PLAN.md) · [`WGDOM-HARDENING-01B0-RCA.md`](./WGDOM-HARDENING-01B0-RCA.md) · [`WGDOM-HARDENING-01B0-AUDIT.md`](./WGDOM-HARDENING-01B0-AUDIT.md) · wzorzec [`WGDOM-HARDENING-01D-DESIGN-FREEZE.md`](./WGDOM-HARDENING-01D-DESIGN-FREEZE.md)  
> **Poza zakresem:** implementacja · ARCH REVIEW (następny) · commit · push  
> **Production Baseline:** UI **2.65.40** · feature **`23d7723`** · docs tip **`e349506`** · EPIC A/D **CLOSED** · **STABILIZATION WINDOW ACTIVE**

```text
══════════════════════════════════════
WGDOM-HARDENING-01B0 DESIGN FREEZE
IN:   B0-V1 smoke+progi · B0-V2 ledger · B0-V3 runbook
M6:   DEFER
OUT:  breaker semantics · limits · deps · builtAt · B1 · CORE · src/**
══════════════════════════════════════
```

---

## 0. Zamrożone decyzje (executive)

| # | Decyzja | Wartość **FROZEN** |
|---|--------|---------------------|
| **D1** | Wariant EPIC | **H3-C monitor-only** (tooling/docs) |
| **D2** | B0-V1 | **IN** — smoke harness + `evaluateThresholdsB0` + `--self-test` |
| **D3** | B0-V2 | **IN** — trend ledger + seed |
| **D4** | B0-V3 | **IN** — runbook Operatora (osobny plik) |
| **D5** | M6 (E-RUN duration) | **DEFER** · `includeM6 = false` |
| **D6** | Runtime `src/**` / SPA | **ZAKAZ** (zero zmian heavy/breaker/persist) |
| **D7** | Circuit Breaker semantics / key scope | **ZAKAZ ZMIAN** |
| **D8** | `HEAVY_MAX_RUNS_PER_KEY` / limity | **ZAKAZ ZMIAN** (pozostaje **2**) |
| **D9** | `HEAVY_E_RUN_DEP_KEYS` | **ZAKAZ ZMIAN** |
| **D10** | `builtAt` w E-RUN / Heavy FP memo deps | **ZAKAZ** |
| **D11** | B1 (H3-A/B global cap / cooldown) | **OUT** |
| **D12** | CORE / Cloud Sync / Edge chunk / Autonomous FP | **OUT** |
| **D13** | CI obowiązkowy na każdy PR | **OUT** (on-demand only) |
| **D14** | Continuous watcher / cron | **ZAKAZ** bez osobnego Owner GO |
| **D15** | Canonical script | `scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs` |
| **D16** | Ledger path | `docs/architecture/WGDOM-HARDENING-01B0-TREND-LEDGER.md` |
| **D17** | Runbook path | `docs/architecture/WGDOM-HARDENING-01B0-RUNBOOK.md` |
| **D18** | Bundle class | **PLATFORM / FEATURE tooling** · zero CORE Sync |
| **D19** | FP algorithm | **REUSE SSOT** `buildHeavyParseDocumentFingerprint` — **zakaz** skopiowanego algorytmu |
| **D20** | Attempts Map | **REUSE** istniejąca `heavyRunAttempts` + test getters — **zakaz** drugiej Map |
| **D21** | Exit codes | `0` = PASS\|WARN · `1` = FAIL · `2` = missing env (jeśli live) |

---

## 1. Cel (zamrożony)

1. Mierzalne **M1–M5** dla **H-FP-CHURN** w Stabilization Window.  
2. Progi **PASS/WARN/FAIL** + guard Sync Storm (M5).  
3. SSOT ledger + runbook (wzorzec 01D).  
4. **MOBILE FIRST:** alert churn bez blokowania legalnego re-parse i bez zmiany limitu 2/FP.  
5. **Zero** zmiany semantyki Production tip **2.65.40**.

**Nie-cele (FROZEN OUT):** B1 · „naprawa” churn · FIXED H-FP-CHURN · M6 · Autonomous FP · 546 Network (to 01D).

---

## 2. Decyzja M6 — **DEFER**

| | |
|--|--|
| **Status** | **DEFER** (`includeM6 = false`) |
| **Uzasadnienie** | (1) M1–M5 wystarczają do DoD monitor-epic. (2) Duration E-RUN nie blokuje CLOSE H3-C. (3) Unika scope creep przed B0-T1…T9. |
| **Re-open** | Owner GO + DF amendment `includeM6: true` + test B0-T10 |

---

## 3. Definicje M1–M5 (**FROZEN**)

| ID | Nazwa | Definicja FROZEN |
|----|-------|------------------|
| **M1** | `M1_maxUniqueFpPerItem` | Max liczby **unikalnych** wartości `buildHeavyParseDocumentFingerprint(item)` zaobserwowanych per `itemId` w oknie pomiaru |
| **M2** | `M2_maxHeavyRunAttempts` | Max `heavyRunAttempts.get(key)` dla dowolnego `itemId::fp::retryNonce` w oknie (harness / test Map) |
| **M3** | `M3_breakerTripCount` | Liczba zdarzeń `attempts >= HEAVY_MAX_RUNS_PER_KEY` (2) w oknie |
| **M4** | `M4_discoveryGrowthSum` | Sumaryczna Δ = Δ`bzpDocuments.length` + Δ`externalDocDiscovery.files.length` (+1 jeśli upload pojawił się) w oknie — proxy growth |
| **M5a** | `M5_anyThrash` | `true` jeśli `uniqueBuiltAt ≥ 4` (polityka Final Audit / 01D) |
| **M5b** | `M5_syncStormT3T8` | Wynik `scripts/test-tenders-sync-storm-p0.mjs` fokus T3+T8 (lub full suite) — **PASS/FAIL** |

**Zbieranie (FROZEN podejście IMPLEMENT):**

| Warstwa | Metoda |
|---------|--------|
| M1 / M4 | Offline lub harness: SSOT FP na snapshotach itemu (batch-get / fixture) — **import** funkcji FP, nie kopia |
| M2 / M3 | `vite-node` / node harness z **istniejącymi** `getHeavyRunAttemptsForTest` / `bump…` / `resetDossierHeavyLazyForTests` — symulacja kontraktu; **nie** zmieniać prod Map API |
| M5a | REUSE observe `uniqueBuiltAt` (wzorzec 01D) **lub** ostatni artefakt tip GREEN |
| M5b | Uruchom Sync Storm P0 suite |

---

## 4. PASS / WARN / FAIL (**FROZEN**)

| Sygnał | WARN | FAIL |
|--------|------|------|
| **M5a** `anyThrash` | — | **true** |
| **M5b** T3/T8 | — | suite **FAIL** |
| **M1** max unique FP / item | `3`–`4` | `≥ 5` |
| **M2** max attempts | — | **`> 2`** (naruszenie limitu P0) |
| **M3** trip count / sesja | `≥ 1` | `≥ 3` **OR** (`≥ 1` **AND** `M4_discoveryGrowthSum === 0`) |
| **M4** | informacyjny przy M1 WARN | użyty w regule M3 anomalia (wyżej) |

**Werdykt (FROZEN):**

```text
if any FAIL  → verdict = FAIL  (exit 1)
else if any WARN → verdict = WARN (exit 0)
else             → verdict = PASS (exit 0)
```

**WARN ≠ rollback app · FAIL thrash ≠ „podnieś limit breakera” · FAIL ≠ start B1.**

---

## 5. Smoke Harness (**FROZEN**)

| Element | FROZEN |
|---------|--------|
| Script | `scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs` |
| Tryby | `--self-test` · (opcjonalnie) live/harness full · `--evaluate-json` jeśli DF IMPLEMENT doda |
| Pure fn | `evaluateThresholdsB0(derived) → { verdict, triggers }` |
| Output | `.tmp/hardening-01b0-smoke-<ISO>.json` + `.tmp/hardening-01b0-smoke-latest.json` |
| Env (live) | Jak 01D C3: fail-fast, **brak** hardcoded secrets |
| PII | Bez tytułów w ledgerze; itemId może być skrócony/hash w raporcie |

### 5.1 JSON minimum (**FROZEN**)

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
  "includeM6": false,
  "notes": "H3-C monitor-only; breaker semantics unchanged"
}
```

---

## 6. Trend Ledger (**FROZEN**)

| Element | FROZEN |
|---------|--------|
| Path | `docs/architecture/WGDOM-HARDENING-01B0-TREND-LEDGER.md` |
| Seed | Wiersz baseline tip GREEN: M5 thrash=false · T3/T8 PASS · M1–M4 = N/E (pre-monitor gap) |
| Reguła | Decision-grade run → nowy wiersz |
| Kolumny | at · version · commit · M1 · M2 · M3 · M4 · M5_thrash · M5_T3T8 · verdict · artifact · notes |

---

## 7. Runbook (**FROZEN treść → plik przy IMPLEMENT**)

Canonical: `docs/architecture/WGDOM-HARDENING-01B0-RUNBOOK.md`

### 7.1 Kiedy
Po releasie heavy/tenders · Stabilization check · przed decyzją o B1 · **nie** w pętli agenta.

### 7.2 Komendy (projekcja)

```bash
node scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs --self-test
node scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs
# (+ Sync Storm suite jeśli nie wbudowane)
node scripts/test-tenders-sync-storm-p0.mjs
```

### 7.3 Po runie
1. Odczytaj verdict + triggers.  
2. Zachowaj JSON.  
3. **Dopisz wiersz** do ledger.  
4. PASS → nic · WARN → odnotuj, **nie** B1 · FAIL → Owner; jeśli thrash → tor Sync Storm; **nie** zmieniaj limitu w 01B0.

### 7.4 Zakazy Operatora
- ❌ B1 / global cap / cooldown  
- ❌ Zmiana `HEAVY_MAX_RUNS_PER_KEY` / deps / `builtAt`  
- ❌ Traktować PASS jako H-FP-CHURN FIXED  
- ❌ Mieszać z 01D 546 / Autonomous FP  
- ❌ Ciche `includeM6=true`

---

## 8. Acceptance Matrix (**FROZEN**)

| # | Kryterium | Gate |
|---|-----------|------|
| **A1** | Tooling/docs only · zero `src/**` breaker/deps | Must |
| **A2** | M1–M5 w raporcie + progi §4 | Must |
| **A3** | Ledger + seed + runbook | Must |
| **A4** | B0-T1…B0-T9 PASS | Must |
| **A5** | B1/limits/deps/`builtAt` nietknięte | Must |
| **A6** | H-FP-CHURN = MONITOR (nie FIXED) | Must |
| **A7** | M6 DEFER udokumentowany | Must |
| **A8** | Sync Storm T3/T8 PASS | Must |

---

## 9. Test Matrix B0-T1…B0-T9 (**FROZEN**)

| ID | Test | Gate |
|----|------|------|
| **B0-T1** | Raport: M1–M5 + verdict | Must |
| **B0-T2** | Sync Storm T3/T8 (suite) PASS | Must |
| **B0-T3** | Tip GREEN: `anyThrash=false` | Must |
| **B0-T4** | Self-test progów (thrash→FAIL; attempts>2→FAIL; M1=3→WARN; clear→PASS) | Must |
| **B0-T5** | Staged/diff: **0** plików `src/**` | Must |
| **B0-T6** | Ledger + seed | Must |
| **B0-T7** | Runbook: komenda · interpretacja · dopisz · zakazy B1 | Must |
| **B0-T8** | AI/07 H-FP-CHURN = MONITOR/MITIGATED | Must |
| **B0-T9** | Zero cloud-sync / Edge chunk / Autonomous FP changes | Must |

**B0-T10:** N/A (M6 DEFER).

---

## 10. Definition of Done (**FROZEN**)

- [ ] DF ✓ (ten dokument)  
- [ ] ARCH REVIEW PASS (oczekiwany tooling)  
- [ ] Owner GO IMPLEMENT  
- [ ] Allowlist pliki utworzone  
- [ ] B0-T1…B0-T9 PASS  
- [ ] OV  
- [ ] COMMIT/PUSH tylko po Owner GO · scope-only  
- [ ] PV · CLOSEOUT · M6 DEFER · H-FP-CHURN MONITOR  

---

## 11. Rollback (**FROZEN**)

| Poziom | Akcja |
|--------|-------|
| Scripts/docs | Revert commit(s) 01B0 |
| Prod app / breaker | **Brak potrzeby** — nietknięte |
| Evidence `.tmp` | Może zostać |

WARN/FAIL smoke **nie** triggeruje rollbacku aplikacji.

---

## 12. Risk Register (**FROZEN**)

| ID | Ryzyko | Sev | Mitygacja |
|----|--------|-----|-----------|
| **F1** | Scope creep B1 / limit change | CRITICAL | D7–D11 · B0-T5 · runbook |
| **F2** | Mylenie FAIL z Sync Storm „fix limitem” | HIGH | M5 + §7.3 |
| **F3** | Duplikacja FP algorithm | HIGH | D19 REUSE SSOT |
| **F4** | Druga Map attempts | HIGH | D20 |
| **F5** | False WARN M1 (drift) | LOW | notes; WARN≠FAIL |
| **F6** | Mylenie z 01D 546 | MEDIUM | osobne id `01B0` |
| **F7** | Mylenie z Autonomous `builtAt` FP | MEDIUM | D12 OUT |
| **F8** | Secrets leakage | MEDIUM | env fail-fast |
| **F9** | Agent loop / cron | LOW | D13–D14 |
| **F10** | Fałszywe FIXED H-FP-CHURN | MEDIUM | A6 · B0-T8 |

---

## 13. Allowlist / denylist (**FROZEN**)

**Allowlist IMPLEMENT:**

```text
scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs
docs/architecture/WGDOM-HARDENING-01B0-TREND-LEDGER.md
docs/architecture/WGDOM-HARDENING-01B0-RUNBOOK.md
docs/architecture/WGDOM-HARDENING-01B0-IMPLEMENTATION-REPORT.md
docs/architecture/WGDOM-HARDENING-01B0-*.md   (AUDIT/RCA/PLAN/DF/ARCH/OV/PV/CLOSE gdy stage)
docs/AI/07_KNOWN_RISKS.md                    (opcjonalnie link MONITOR)
```

**Deny:** `src/**` · `supabase/**` · `cloud-sync*` · kv-chunk · TEUX/ARCH-02F WIP · zmiana Sync Storm heavy semantics.

---

## 14. Boundary / ARCH (projekcja)

| | |
|--|--|
| Klasa | PLATFORM tooling / docs |
| CORE Sync GO | **Nie** |
| Sync Storm P0 amendment | **Nie wymagany** (brak zmiany G2/T3) |
| Oczekiwany ARCH | **PASS** lub **PASS WITH CONSTRAINTS** (C: zero src, M6 DEFER, REUSE FP) |

---

## 15. Owner Readiness do ARCH REVIEW

| Kryterium | Stan |
|-----------|------|
| Zakres H3-C zamrożony | ✔ |
| M1–M5 + M6 DEFER | ✔ |
| PASS/WARN/FAIL | ✔ |
| Smoke / ledger / runbook | ✔ |
| Acceptance + B0-T1…T9 | ✔ |
| DoD + Rollback + Risks | ✔ |
| Implementacja / commit / push | Nie |

```text
OWNER READINESS: READY FOR ARCH REVIEW (01B0)

Next allowed step: Owner GO → WGDOM-HARDENING-01B0 ARCHITECTURE REVIEW
Forbidden without GO: IMPLEMENT · commit · push
```

---

## 16. Raport końcowy (Owner card)

### 1. Zakres DESIGN FREEZE
H3-C monitor-only: B0-V1/V2/V3 · M1–M5 · M6 **DEFER** · tooling/docs · wzorzec 01D

### 2. Zamrożone decyzje
D1–D21 (§0) — zero breaker/limits/deps/`builtAt`/B1/CORE/`src`

### 3. Acceptance Criteria
A1–A8 (§8)

### 4. Risk Register
F1–F10 (§12) — najwyższe: B1 creep (F1), duplikacja FP/Map (F3/F4)

### 5. Definition of Done
§10 — DF→ARCH→GO IMPLEMENT→T*→OV→COMMIT(GO)→CLOSE

### 6. Owner Readiness do ARCH REVIEW
**READY**
