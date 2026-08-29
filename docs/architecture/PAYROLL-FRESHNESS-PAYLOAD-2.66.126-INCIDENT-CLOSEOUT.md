# PAYROLL — Freshness Gate + Canonical Payload Hardening

> **ID:** PAYROLL-FRESHNESS-PAYLOAD-2.66.126  
> **STATUS:** **CLOSED** · **PRODUCTION GREEN** · **REQUIRED REPAIRS COMPLETE**  
> **Production:** UI **2.66.126** · commit **`c7337a2a67fc40ccb5d190f7b66395af70f17502`** (`c7337a2`)  
> **Live tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Payroll SSOT:** [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md)  
> **Regression:** [`../AI/PAYROLL_REGRESSION_HISTORY.md`](../AI/PAYROLL_REGRESSION_HISTORY.md) §9  
> **Zakaz:** nie traktuj Freshness Gate jako jedynej ochrony payloadu · nie otwieraj rollover/archive hardening bez Owner GO

```text
Freshness ≠ canonical payload.
Freshness = write cannot proceed from unconfirmed stale state.
Canonical rebuild = outgoing = Cloud ⊕ only verified local intents.
P0/P2 = field protection. CAS = revision/race. Edge = second line.
```

---

## 1. Incident summary

| Pole | Wartość |
|------|---------|
| **Nazwa** | Payroll multi-device / cloud synchronization — freshness + stale payload risk |
| **Klasa** | Architectural gap (nie „pojedynczy bug godzin”) |
| **Impact** | Stara sesja urządzenia mogła trzymać stale local / closed-over payroll payload, podczas gdy Cloud miał nowszy stan |
| **Canonical example** | Device A = **100h** · Cloud/B = **120h** · A wraca po dniach |
| **Wymaganie** | A nie może ślepo zapisać 100h · freshness przed write · outgoing z Cloud · tylko verified intent zmienia baseline · silent hours-down = BLOCK · CAS chroni concurrency |
| **Detection** | Call-graph audit + production bundle + regression suites (READ-ONLY) |
| **Resolution** | **2.66.125** Cloud Freshness Gate · **2.66.126** canonical payload hardening + `extraCosts` baseline |
| **Closure** | GLOBAL_PAYROLL_SYNC_CONDITIONAL_GREEN — MAINTENANCE · REQUIRED FIXES COMPLETE · ACTIVE BLOCKER/GAP **NONE** |

---

## 2. RCA (Root Cause Analysis)

### 2.1 Nie było „tylko buga godzin”

Problem ujawniony w audycie:

```text
stale local / closed-over payload A
  → ensureCloudFreshBeforeWrite()   // Cloud B / UI B
  → pierwotny argument funkcji nadal mógł reprezentować A
  → samo Freshness NIE gwarantowało jeszcze canonical outgoing
```

### 2.2 Root causes (rozdzielone)

| # | RC | Opis |
|---|-----|------|
| **RC-1** | Freshness incomplete | Brak / niepełne wymuszenie świeżości Cloud przed outbound write (resume, storage, barrier) |
| **RC-2** | Stale closed-over argument | Po ensure argument `weekEmployees` / closure mógł nadal być snapshotem A |
| **RC-3** | Nierówna field-level protection | Hours/rate/settlement miały mocniejsze kontrakty niż część pól |
| **RC-4** | `extraCosts` bez cloud baseline | `before → after` mogło przejść bez `before ≡ cloud` → ryzyko stale overwrite |

### 2.3 Warstwy ochrony (obowiązkowy rozdział)

| Warstwa | Rola | Co NIE robi |
|---------|------|-------------|
| **Freshness Gate** | Write nie startuje ze stanu unconfirmed/stale bez pull+reconcile | Nie buduje sama outgoing payloadu |
| **Canonical rebuild** | `rebuildPayrollOutgoingAfterFreshness` = Cloud B ⊕ verified intents | Nie zastępuje P0/P2/CAS |
| **P0 hours-down** | Silent hours-down vs Cloud bez scoped intent → BLOCK / fail-loud | Nie jest jedyną ochroną rate/settlement |
| **P2 field-intent** | Rate / settlement / early / MA / extraCosts / hours vs baseline Cloud | Nie zastępuje Freshness |
| **CAS** | `payrollWeekCas` + `expectedRevision` / `rosterRevision` · 409 rebase | Nie buduje intents |
| **Edge** | Druga linia (union, hours-down, shrink, CAS) | Nie zastępuje klienta |

**Zasada:** *„Freshness does not equal canonical payload.”*  
**Reguła:** *Freshness guarantees that the write cannot proceed from an unconfirmed stale state; canonical rebuild guarantees that the outgoing payload is based on fresh Cloud state plus only verified local intent.*

---

## 3. Repair record

### 3.1 2.66.125 — Cloud Freshness Gate

| Element | Status |
|---------|--------|
| `CloudFreshnessBlockedError` / gate state machine | LANDED |
| `ensureCloudFreshBeforeWrite` write barrier | LANDED |
| Mandatory pull + `bypassThrottle` (15s throttle nie omija bariery) | LANDED |
| Resume: visibility / focus / pageshow / native Capacitor | LANDED |
| `storage` → freshness unknown | LANDED |
| Offline / unconfirmed → write blocked | LANDED |
| `writeOnly` runCloudSync → zawsze apply UI po reconcile | LANDED |
| Domain / payroll writes przez `pushKeysToCloud` / `pwrPush` | LANDED |
| Commit (history) | `03a0802c3bbd512943dca0d5b9294591baf5373b` |

### 3.2 2.66.126 — Canonical payload hardening

| Element | Status |
|---------|--------|
| `rebuildPayrollOutgoingAfterFreshness` | LANDED |
| Outgoing = Cloud ⊕ verified intents (nie ślepy arg A) | LANDED |
| `extraCosts` baseline: `before ≡ cloud` → after; else Cloud wins | LANDED |
| P0 / P2 / CAS pozostają drugą linią (nie osłabione) | LANDED |
| Silent hours-down bez intents → fail-loud path (P0) | LANDED |
| Commit | **`c7337a2a67fc40ccb5d190f7b66395af70f17502`** |

### 3.3 Pliki (potwierdzone w repo / release)

| Plik | Rola |
|------|------|
| `src/lib/cloud-freshness-gate.ts` | Gate · ensure · resume marks |
| `src/lib/cloud-sync.ts` | `pushKeysToCloud` barrier · `rebuildPayrollOutgoingAfterFreshness` · push week employees · RS exclude |
| `src/lib/payroll-field-intent.ts` | P2 + `extraCosts` baseline |
| `src/lib/payroll-week-roster-bundle.ts` | `pwrPush` / Add / Remove facade (write path; unchanged in 2.66.126 commit) |
| `src/app/App.tsx` | Resume · domain push · writeOnly apply (2.66.125) |
| `src/app/CloudLoader.tsx` | Bootstrap · intentional `skipCloudFreshnessGate` po merge (2.66.125) |
| `src/app/WorkerPhotoView.tsx` | Worker `pwrPush` + resume parity (2.66.125) |
| `src/app/hooks/useLocalStorage.ts` | storage → freshness unknown (2.66.125) |
| `scripts/test-cloud-freshness-gate.mjs` | Freshness gate suite (2.66.125) |
| `scripts/test-payroll-freshness-payload-hardening.mjs` | H1–H16 (2.66.126) |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | UI 2.66.125 / 2.66.126 |

---

## 4. Final LIVE PAYROLL WRITE contract

```text
UI / domain intent
  → freshness gate (ensureCloudFreshBeforeWrite)
  → Cloud canonical fetch
  → rebuildPayrollOutgoingAfterFreshness
  → Cloud ⊕ verified intents
  → membership / tombstone reconciliation
  → P0 hours-down
  → P2 field-intent (second pass in guard)
  → CAS / expectedRevision / rosterRevision
  → Edge batch-set
  → 409 rebase if required (pwrPush)
  → UI reconciliation
```

**Jedyny live roster write path:** Domain Push → `pwrPush` → `pushWeekEmployeesToCloud` (nie RS).  
**Jedyny HTTP `batch-set` w app:** `cloud-sync.pushKeysToCloud` (po gate, poza intentional bootstrap/internal skip).

---

## 5. Field safety matrix

| Field | Source of truth | Verified intent | Baseline (`before ≡ cloud`) | P0/P2 | CAS/rebase | Stale behavior |
|-------|-----------------|-----------------|----------------------------|-------|------------|----------------|
| **hours** | Cloud ⊕ scoped / local hours intent | YES | YES | P0 + P2 | YES | Silent down → BLOCK / Cloud |
| **rate** | Cloud ⊕ intent | YES | YES | P2 | YES | Cloud wins if baseline fail |
| **settlement** / **payrollSettlement** | Cloud ⊕ atomic intent | YES | YES | P2 | YES | Cloud wins |
| **early payout** | Cloud ⊕ tx intent | YES | YES | P2 | YES | Cloud wins |
| **manualAdjustment** | Cloud ⊕ intent | YES | YES | P2 | YES | Cloud wins |
| **extraCosts** | Cloud ⊕ intent | YES | **YES (2.66.126)** | P2 | YES | `before ≠ cloud` → **Cloud wins**; `before ≡ cloud` → after allowed |
| **carryForward** | Cloud (copied) | N/A | N/A | — | YES | Cloud preserved |
| **membership** | sanitize + tombstones | YES (rosterBefore) | — | P1/P2 | YES | Ghosts dropped |

---

## 6. Verification evidence (closeout session)

| Suite | Result |
|-------|--------|
| cloud-freshness-gate | **36 PASS** |
| freshness-payload-hardening | **25 PASS** |
| P0 hours-down | **37 PASS** |
| P2 field-intent | **36 PASS** |
| settlement metadata | **51 PASS** |
| early payout biweekly | **64 PASS** |
| manual adjustment | **38 PASS** |
| week-roster invariant | **12 PASS** |
| P1 stale cross-device | **24 PASS** |
| settled persistence S5 | **16 PASS** |
| settled merge Fix A | **PASS** |
| guard fail-loud | **6 PASS** |
| cloud-sync-mutation-guard | **10 PASS** |
| `npm run build` | **PASS** |
| Production `version.json` | **2.66.126** / `c7337a2` |
| Prod bundle markers | `rebuildPayrollOutgoingAfterFreshness` · `CloudFreshnessBlockedError` · `canonical_intent` · `ensureCloudFreshBeforeWrite` |

**Worker O1/O2:** EXIT 1 · **PRE-EXISTING** fixture `{hours}` bez `from`/`to` · **nie** regresja 2.66.126 · **nie** naprawiać bez osobnego Owner GO.

---

## 7. Timeline (tylko potwierdzone kamienie)

| Kamień | Wersja / commit | Uwaga |
|--------|-----------------|--------|
| Hours-wipe / Domain Push / PWRB / RS exclude | 2.63.x–2.65.x | Prior CLOSED epics (SSOT §5 / Regression History) |
| Cloud Freshness Gate | **2.66.125** · `03a0802c` | Write barrier + resume/storage |
| Global multi-device / payload GAP audit | post-2.66.125 | Wykrycie stale closed-over arg |
| Canonical payload + extraCosts baseline | **2.66.126** · `c7337a2a` | Hardening |
| Production verification | 2.66.126 live | Bundle + version.json GREEN |
| Global closure + residual audit | docs | CONDITIONAL_GREEN — non-blocking residuals |
| Maintenance + Final closure | docs | REQUIRED FIXES COMPLETE · PAYROLL CLOSED / MAINTENANCE |

---

## 8. Known residuals — NON-BLOCKING (nie „niedokończone naprawy”)

| Residual | Charakter | Status |
|----------|-----------|--------|
| Rollover: snapshot / `expectedRevision` przed ensure; brak dedykowanego 409 rebase | Optional hardening | **NON-BLOCKING** |
| Archive: LWW `savedAt`; Edge union przy suspicious shrink | Inny kontrakt niż live P2 | **NON-BLOCKING** |
| Bootstrap: `skipCloudFreshnessGate` tylko po udanym merge | Intentional exception | **NON-BLOCKING** |
| Worker O1/O2 fixture | PRE-EXISTING test | **NON-BLOCKING** |
| Brak live dual-device KV mutation na prod | Celowy zakaz KV | **NOT PROVEN live** · semantyka z kodu/testów |

**Nie otwierać** rollover/archive hardening bez nowego Owner GO + Design Freeze.

---

## 9. PAYROLL REGRESSION WATCH / MAINTENANCE CONTRACT

Payroll **nie** jest „naprawiony i zapomniany”. Przy **każdej** przyszłej zmianie w:

`App.tsx` · `CloudLoader` · `WorkerPhotoView` · `cloud-sync` · `payroll-field-intent` · `payroll-week-roster-bundle` · `cloud-freshness-gate` · Edge payroll merge · KV payroll keys · `runCloudSync` · rollover · archive · settlement · early · MA · hours · membership  

**obowiązkowo sprawdzić:**

1. Freshness nadal mandatory?  
2. Brak nowego direct `batch-set` bypass?  
3. RS nadal wyklucza payroll?  
4. Domain Push = jedyny live roster write?  
5. Stale closed-over payload nie wrócił?  
6. Canonical rebuild nadal działa?  
7. P0 hours-down?  
8. P2 field-intent?  
9. `extraCosts` nadal wymaga `before ≡ cloud`?  
10. CAS / 409 rebase?  
11. storage/resume → freshness unknown?  
12. offline/unconfirmed blokuje write?  
13. mobile/PWA/Capacitor/Worker ta sama semantyka?  
14. rollover/archive nie wciągnięte w live-week field semantics przypadkiem?  
15. Nowy write path?  
16. Mixed FEATURE + Payroll CORE?  
17. Testy Payroll PASS?

### Minimal regression gate (przed Payroll / cloud-sync / Edge merge change)

```text
□ test-cloud-freshness-gate.mjs
□ test-payroll-freshness-payload-hardening.mjs
□ test-payroll-p0-hours-down-protection.mjs
□ test-payroll-p2-field-intent.mjs
□ test-payroll-settlement-metadata.mjs
□ test-payroll-early-payout-biweekly.mjs
□ test-payroll-manual-adjustment.mjs
□ test-payroll-week-roster-invariant-01.mjs
□ test-payroll-p1-stale-cross-device.mjs
□ mutation guard suite (cloud-sync-mutation-guard)
□ npm run build
(+ Worker/mobile / rollover/archive suites gdy scope)
```

**FAIL → STOP.** Nie oznaczać Payroll GREEN przy FAIL bez Owner review.

---

## 10. AI / Cursor guardrail (Payroll task)

```text
1. Czytaj: SSOT → Regression History → Guard Rails → 09 tip → ten closeout
2. READ-ONLY audit przed IMPLEMENT
3. Bez Owner GO — bez IMPLEMENT CORE
4. Bez Architecture Review — bez nowej logiki merge/write
5. Nie usuwaj guardów „bo testy przechodzą”
6. Nie traktuj Cloud Freshness jako jedynej ochrony
7. Nie przywracaj direct write / batch-set z UI
8. Nie przywracaj Payroll do RS
9. Nie osłabiaj P0 / P2 / CAS
10. Freshness ≠ canonical payload
```

---

## 11. Production baseline (Payroll)

| Pole | Wartość |
|------|---------|
| UI / version.json | **2.66.126** |
| Commit | **`c7337a2a67fc40ccb5d190f7b66395af70f17502`** |
| Status | **PRODUCTION GREEN** |
| Required fixes | **COMPLETE** |
| Active BLOCKER | **NONE** |
| Active GAP | **NONE** |
| Maintenance | **CLOSED** · **REGRESSION WATCH ACTIVE** |

---

## 12. Related docs

| Doc | Rola |
|-----|------|
| [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) | SSOT · §1A write contract amendment |
| [`../AI/PAYROLL_GUARD_RAILS.md`](../AI/PAYROLL_GUARD_RAILS.md) | Zakazy P16+ · regression checklists |
| [`../AI/PAYROLL_REGRESSION_HISTORY.md`](../AI/PAYROLL_REGRESSION_HISTORY.md) | §9 skrót |
| [`../AI/PAYROLL_INCIDENT_INDEX.md`](../AI/PAYROLL_INCIDENT_INDEX.md) | Indeks |
| [`../AI/PAYROLL_RCA_INDEX.md`](../AI/PAYROLL_RCA_INDEX.md) | Indeks RCA |
| [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) | Tip prod |
| Prior hours-wipe | [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) |
