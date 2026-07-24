# PAYROLL-DESIGN-FREEZE-01 — DESIGN FREEZE

> **ID:** PAYROLL-DESIGN-FREEZE-01  
> **STATUS:** DESIGN FREEZE FINAL + ERRATA ACK · **P0**  
> **Data:** 2026-07-24  
> **Owner GO:** DESIGN FREEZE + [`PAYROLL-DESIGN-AMENDMENT-01`](./PAYROLL-DESIGN-AMENDMENT-01.md) ACK  
> **Wejście:** [`PAYROLL-RCA-01-ROOT-CAUSE-AND-DESIGN-PLAN.md`](./PAYROLL-RCA-01-ROOT-CAUSE-AND-DESIGN-PLAN.md) · [`PAYROLL-ARCH-REVIEW-01.md`](./PAYROLL-ARCH-REVIEW-01.md) · REPRO / RUNTIME / FORENSICS / REGRESSION / INCIDENT-01/02  
> **Poza zakresem:** implementacja · commit · push  
> **Production Baseline:** UI **2.65.40** · feature **`23d7723`** · Domain Push Payroll **ACTIVE** · **STABILIZATION WINDOW ACTIVE**  
> **Errata wiążąca:** C1–C6 w AMENDMENT-01 (D1–D6 IN **bez zmian zestawu**)

```text
════════════════════════════════════════════════════════
PAYROLL-DESIGN-FREEZE-01 (FINAL + ERRATA)

IN (FROZEN):
  D1 Telemetry write-path — 100% passive (C6)
  D2 Confirmation = Domain Gate + UI Dialog (C2) · PRIMARY (C4)
  D3 skipPayrollGuard only + intentionalHoursClear (C1) · SECONDARY (C4)
  D4 Recovery Banner (-prev helper ≠ archive) (C3)
  D5 Soft Restore overlay · weekEmployeeFromDir PURE (C5)
  D6 SSOT: Domain Push remains sole hours write

OUT / ZAKAZ ZMIANY SEMANTYKI PIPELINE:
  Replace W1/W2 paths · move payroll into RS · Edge CORS
  Rewrite Cloud Sync merge core · disable domain push

NEXT: Owner GO IMPLEMENT (po ACK erraty — DONE)
════════════════════════════════════════════════════════
```

---

## 0. Design Decisions (zamrożone)

| ID | Decyzja | Wartość **FROZEN** |
|----|---------|---------------------|
| **D1** | Telemetry write-path | **IN** — stały ślad forensic; **100% passive** (C6) |
| **D2** | Confirmation | **IN** — **Domain Gate + UI Dialog** (C2); **PRIMARY** ochrona (C4); tylko destrukcja (§2.2) |
| **D3** | `skipPayrollGuard` | **IN** — wyłącznie z **`intentionalHoursClear: true`** po D2 (C1); **SECONDARY** (C4) |
| **D4** | Recovery Banner | **IN** — helper **`-prev`** + REUSE `payrollMetrics` (C3); ≠ archive banner |
| **D5** | Soft Restore | **IN** — overlay przed push; `weekEmployeeFromDir` **PURE** (C5) |
| **D6** | SSOT | **IN** — Domain Push = **jedyna** droga zapisu godzin do Cloud |
| **D7** | W1 / W2 entry points | **RETAIN** — nie usuwać, nie zastępować innym funnel |
| **D8** | RS full-bundle payroll | **ZAKAZ** powrotu (SYNC-ARCH-01 S1-1 zostaje) |
| **D9** | Resurrection fence | **ZAKAZ USUWANIA** |
| **D10** | Heuristic partial-roster block (RCA D4) | **OUT / DEFER** — poza tym DF |
| **D11** | Immutable audit KV log (RCA D9) | **DEFER** — po D1 stabilizacji |
| **D12** | Feature flags | **IN** — kill-switches per warstwa (§5) |
| **D13** | Implement order | **D1 → D2+D3 → D4 → D5** (D6 = constraint ciągły) |
| **D14** | Threshold clear | `prevTotalHours ≥ 4` **OR** `prevActiveDays ≥ 2` (FROZEN default; tunable flag) |

**Mapowanie RCA → DF:**  
RCA D8→**D1** · RCA D1+D3→**D2** · RCA D2→**D3** · RCA D7→**D4** · RCA D5/D6→**D5** · RCA zasada SSOT→**D6**

---

## 1. Frozen Architecture

```text
                    ┌─────────────────────────────────────┐
                    │  UI Lista Płac (W1 / W2 UNCHANGED)  │
                    └──────────────────┬──────────────────┘
                                       │ mutate roster
                                       ▼
                         ┌─────────────────────────┐
                         │ D2 Domain Gate + UI     │
                         │ (PRIMARY · destructive) │
                         └────────────┬────────────┘
                              cancel │ │ OK → intentionalHoursClear
                                     │ ▼
                         ┌─────────────────────────┐
                         │ D5 Soft Restore overlay │
                         │ (W2 · factory stays PURE)│
                         └────────────┬────────────┘
                                       ▼
                         ┌─────────────────────────┐
                         │ Domain Push (D6 SSOT)   │
                         │ schedule / pwrPush      │
                         │ D3: skip ⇔ intentionalHoursClear (SECONDARY)
                         │ D1: emit only (passive) │
                         └────────────┬────────────┘
                                       ▼
                              batch-set Cloud KV
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
              live roster                          *-prev rotation
                    │                                     │
                    └──── D4 Prev Recovery Banner (≠ archive) ──┘
```

**Zamrożone niezmienniki pipeline:**

| Element | DF |
|---------|-----|
| `commitLivePayrollRosterEdit` → debounce → `pwrPush` | **zostaje** (W1) |
| `addFromDirectory` / `weekEmployeeFromDir` | **zostaje** (W2); factory **PURE**; D5 = overlay przed push |
| `pushWeekEmployeesToCloud` / `replaceWeekEmployeesKeys` | **zostaje** |
| `runCloudSync` bez payroll set | **zostaje** |
| Semantyka `defaultDay()` / factory | **bez zmiany kształtu**; D2/D5 chronią *użycie* |
| Cloud Sync merge / finalize / fence | **bez redesignu** w tym EPIC |

---

## 2. Elementy D1–D6 (szczegóły zamrożone)

### D1 — Telemetry write-path

| | **FROZEN** |
|--|--|
| **Cel** | Stały ślad forensic: kto/co wypchnęło hours Δ (W1/W2), bez polegania na opt-in console |
| **Odpowiedzialność** | Emit przy `schedulePayrollDomainPush` flush / `pwrPush` / `pwrRemove`: `source`, `directoryId`/`empId`, `hoursBefore`, `hoursAfter`, `intentionalHoursClear`, `weekFrom/To`, `deviceLabel` |
| **UX** | **Neutral** — brak dialogów; brak spam console na prod (ring in-memory / session; dump via istniejące `__WG_*` / flag) |
| **SSOT** | **Brak wpływu** na treść Cloud |
| **Passive (C6)** | **100%** — zero early-return, zero mutacji roster, zero ustawiania guard / skip |
| **Ryzyka** | PII w ring — **minimalizować** (id, nie pełne notatki); perf — ring bounded (REUSE limity trace) |
| **Kompatybilność** | REUSE `payrollTraceEmit` / write-trace; **nie** wracać do Incident-23.07 `AUTO_ENABLE=true` — ring always · console **opt-in** |

### D2 — Confirmation (Domain Gate + UI · PRIMARY)

| | **FROZEN** |
|--|--|
| **Cel** | Zatrzymać nieświadome wypchnięcie wipe godzin (**primary** — C4) |
| **Odpowiedzialność** | **Domain Gate** (predikat + block push bez ACK) **+** UI Dialog (C2). Wyzwalacze gdy dla ≥1 istniejącego emp (nie czysty CREATED bez prev hours): `(prevHours > 0 ∧ nextHours === 0)` **OR** days ≡ `defaultDay()` fingerprint **OR** pełne `active=false` przy `prevActiveDays ≥ 1` — próg **D14** |
| **UX** | Friction **tylko** przy destrukcji; Cancel = **brak** Cloud write |
| **SSOT** | Po OK → domain push + `intentionalHoursClear`; **FROZEN prefer:** Cancel = mutacja nie wchodzi do push / UI rollback |
| **Ryzyka** | Confirm fatigue — D14; false positive CREATED — wykluczyć |
| **Kompatybilność** | PR-PAY-S3 legal clear: **dozwolony** po Confirm + `intentionalHoursClear` |

**Wyzwalacze D2 (FROZEN allowlist):**

```text
SHOW confirm IFF emp existed in pre-edit roster AND D14 threshold AND (
  totalHours: prev > 0 → next === 0
  OR daysFingerprint ≡ defaultDay() for all Pn–So
  OR all days active=false when prev had any active=true
)
```

### D3 — `skipPayrollGuard` + `intentionalHoursClear` (SECONDARY)

| | **FROZEN** |
|--|--|
| **Cel** | Defense-in-depth (C4): shrink guard na domain push; świadomy hours-clear omija go tylko jawnie |
| **Odpowiedzialność** | `skipPayrollGuard: true` **wyłącznie** gdy `options.intentionalHoursClear === true` (po D2 OK). Bez flagi → guard aktywny. **Zakaz** używania `isIntentionalPayrollWeekClear` do tej semantyki (C1) |
| **UX** | Flaga niewidoczna; block guarda → toast → ponów z D2 |
| **SSOT** | Cloud shrink hours **tylko** po świadomej ścieżce D2 |
| **Ryzyka** | Sam D3 **nie** łapie partial wipe &lt;50% — dlatego D2 = primary |
| **Kompatybilność** | REUSE `applyPayrollGuardBeforePush` / `wouldBlockPayrollShrink`; rollover/empty-week zostaje na istniejącym week-clear helper (IC-7) |

### D4 — Recovery Banner (`-prev`, ≠ archive)

| | **FROZEN** |
|--|--|
| **Cel** | MTTR z **`-prev`** |
| **Odpowiedzialność** | Nowy helper (np. `shouldShowPayrollPrevRecoveryBanner`); REUSE `payrollMetrics` / richer-than; live≪prev dla overlapping `directoryId`; CTA → domain push. **Zakaz** reuse `shouldShowPayrollRestoreBanner` (C3) |
| **UX** | Osobny copy ≠ baner archiwum |
| **SSOT** | Restore = **domain push** (D6); nie local-only |
| **Ryzyka** | `-prev` nadpisany wipe’em — best-effort; P0 = **-prev only** |
| **Kompatybilność** | Archive week snapshots / istniejący RB — **bez zmian semantyki** |

### D5 — Soft Restore (overlay · factory PURE)

| | **FROZEN** |
|--|--|
| **Cel** | W2: remove→add nie zeruje godzin automatycznie |
| **Odpowiedzialność** | `weekEmployeeFromDir` **PURE** (C5). Overlay w add/PWRB **przed** Domain Push: snapshot session / tombstone / `-prev` → days. Default przywróć; „Dodaj puste” → D2 jeśli D14 |
| **UX** | Default **przywróć** gdy snapshot dostępny |
| **SSOT** | Wynik → domain push (D6) |
| **Ryzyka** | Tombstone revoke — REUSE RC-B; okno: do rollover / koniec week session |
| **Kompatybilność** | Factory nadal może emitować `defaultDays`; Soft Restore **nakłada** przed push |

### D6 — SSOT Domain Push

| | **FROZEN** |
|--|--|
| **Cel** | Jedna droga zapisu godzin do Cloud |
| **Odpowiedzialność** | Zakaz przywracania payroll do `runCloudSync` RS set; Worker path W10 extraCosts: poza scope hours-clear (bez zmiany w tym DF) lub osobny follow-up |
| **UX** | Bez zmian modelu sync użytkownika |
| **SSOT** | Cloud KV live = SSOT hours |
| **Ryzyka** | Brak — utrzymanie status quo architektury |
| **Kompatybilność** | SYNC-ARCH-01 S1/S2 **FROZEN RETAIN** |

---

## 3. Rejected Alternatives

| Alternatywa | Status | Powód odrzucenia |
|-------------|--------|------------------|
| Wyłączenie domain push / powrót payroll do RS | **REJECTED** | Łamie D6 / S1-1; regresja multi-device |
| Usunięcie W1 checkbox / W2 add | **REJECTED** | Potrzebne operacyjnie; chronić, nie usuwać |
| Auto-block wszystkich 0h bez confirm | **REJECTED** | Łamie PR-PAY-S3 legal clear |
| Heurystyka „2 z 14 → block” jako P0 | **DEFER/OUT** | False positives; D10 |
| Revert tip 2.65.38–40 jako „fix Payroll” | **REJECTED** | REGRESSION: zero write-path change |
| Live wipe repro na `dir-1` | **REJECTED** | H3-A / bezpieczeństwo |
| `AUTO_ENABLE` wszystkich diag na prod | **REJECTED** | Incident 23.07 |
| Zmiana Edge CORS jako ochrona hours | **REJECTED** | INCIDENT-02 |
| Soft Restore bez domain push (local only) | **REJECTED** | Łamie D6 |

---

## 4. Risk Matrix

| Ryzyko | P | Impact | Mitigacja (FROZEN) |
|--------|---|--------|---------------------|
| Confirm fatigue | M | UX | D14 threshold; tylko destrukcja |
| Guard blokuje legal sync | M | Ops | `intentionalHoursClear` + flag kill-switch D3 |
| Soft Restore wskrzesza usunięte świadomie | M | Data | Dialog + tombstone window; „Dodaj puste” |
| `-prev` bezużyteczny po rotacji wipe | H (post-facto) | Recovery | D1 forensics; D4 best-effort; backup follow-up |
| Telemetry PII | L | Compliance | ids only; bounded ring |
| Implement rozjeżdża merge core | M | Sync | **ZAKAZ** zmian finalize/merge poza flagą skip; ARCH REVIEW gate |
| Flag OFF na prod „dla wygody” | M | Safety | Default ON po PV; OFF wymaga Owner |

---

## 5. Migration Order

```text
M0  DF + ARCH + ERRATA ACK — DONE (AMENDMENT-01)
M1  IMPLEMENT D1 (telemetry passive) — zero semantyki hours
M2  IMPLEMENT D2 + D3 (domain gate + intentionalHoursClear) — jeden bundle
M3  IMPLEMENT D4 (prev recovery banner ≠ archive)
M4  IMPLEMENT D5 (soft restore overlay · factory pure)
M5  Class regression tests (REPRO automat · partial wipe) w gate
M6  PV + Stabilization observe Lista Płac 48–72h
```

**Feature flags (FROZEN names):**

| Flag | Default po PV |
|------|----------------|
| `payrollWritePathTelemetry` | **ON** (ring); console opt-in |
| `payrollHoursCollapseConfirm` | **ON** |
| `payrollDomainPushGuardStrict` | **ON** |
| `payrollRecoveryBannerPrev` | **ON** |
| `payrollSoftRestoreOnReadd` | **ON** |

Kill-switch: dowolna flaga **OFF** bez revert Edge / bez wyłączania domain push.

---

## 6. Acceptance Criteria

| ID | Kryterium | Faza |
|----|-----------|------|
| **AC-D1-1** | Każdy `pwrPush` / domain flush emituje event z hoursBefore/After + source | M1 |
| **AC-D1-2** | Prod console nie flooduje bez opt-in | M1 |
| **AC-D2-1** | Przejście hours>0→0h (D14) **bez** Confirm **nie** wypycha Cloud | M2 |
| **AC-D1-3** | Telemetry nie zmienia wyniku push / guard (passive) | M1 |
| **AC-D2-2** | Confirm OK → push z **`intentionalHoursClear`** | M2 |
| **AC-D2-3** | Nowy emp CREATED (pierwszy add) **bez** prev hours → **bez** Confirm | M2 |
| **AC-D2-4** | Domain gate blokuje push bez ACK nawet jeśli UI pominięte | M2 |
| **AC-D3-1** | `skipPayrollGuard` absent gdy brak **`intentionalHoursClear`** | M2 |
| **AC-D3-2** | Suspicious shrink bez flagi → block lub wymuszenie D2 | M2 |
| **AC-D3-3** | PR-PAY-S3 intentional hours clear nadal PASS | M2 |
| **AC-D3-4** | Partial wipe (np. 2/14) chroniony przez D2, nie tylko D3 | M2 |
| **AC-D4-1** | Gdy live≪**`-prev`** (overlapping ids) → banner widoczny (≠ archive RB) | M3 |
| **AC-D4-2** | Restore CTA → domain push bogatszego stanu | M3 |
| **AC-D5-1** | remove→re-add z snapshot hours → hours **nie** giną domyślnie | M4 |
| **AC-D5-2** | Świadome „Dodaj puste” → 0h + D2 jeśli D14 | M4 |
| **AC-D5-3** | `weekEmployeeFromDir` bez mutacji ciała (overlay poza factory) | M4 |
| **AC-D6-1** | RS `runCloudSync` nadal **bez** payroll set | all |
| **AC-D6-2** | W1/W2 nadal jedyne Admin hours writers (owinięte, nie zastąpione) | all |
| **AC-R-1** | Class repro W1/W2 fingerprint test w CI/gate | M5 |
| **AC-R-2** | Zero zmian resurrection fence | all |

---

## 7. Definition of Done

```text
DoD DESIGN FREEZE:
  [x] D1–D6 zapisane i zamrożone
  [x] Rejected alternatives
  [x] Risk + migration + AC
  [x] Owner ACK DF
  [x] ARCH REVIEW PASS WITH CORRECTIONS
  [x] ERRATA C1–C6 ACK (AMENDMENT-01)
  [ ] IMPLEMENT dopiero po Owner GO IMPLEMENT

DoD IMPLEMENT (przyszły — nie teraz):
  AC-D1…D6 + AC-R PASS (w tym intentionalHoursClear, partial wipe)
  PR-PAY-S3 + add-from-directory regression PASS
  PV tip + Stabilization note
  Brak powrotu payroll do RS · factory pure · telemetry passive
```

---

## 8. Owner Readiness

```text
OWNER READINESS: DESIGN FREEZE FINAL + ERRATA ACK

Frozen: D1 Telemetry (passive) · D2 Domain Gate+UI (primary)
        D3 intentionalHoursClear (secondary) · D4 -prev banner
        D5 Soft Restore overlay · D6 Domain Push SSOT

Errata: C1–C6 ACCEPTED · see PAYROLL-DESIGN-AMENDMENT-01

Next (Owner GO only):
  A) GO IMPLEMENT — start D1
  B) Hold further DF change

Forbidden this step: implement · commit · push
```

---

## 9. Raport końcowy (Owner card)

1. **Design Decisions** — §0 (D1–D14) + AMENDMENT-01  
2. **Frozen Architecture** — §1 (post-errata)  
3. **Rejected Alternatives** — §3  
4. **Risk Matrix** — §4  
5. **Migration Order** — M0–M6 + flags §5  
6. **Acceptance Criteria** — §6 (updated)  
7. **Definition of Done** — §7  
8. **Owner Readiness** — FINAL + ERRATA ACK · czekaj GO IMPLEMENT  

**BEZ IMPLEMENTACJI · BEZ COMMIT · BEZ PUSH**
