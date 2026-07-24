# PAYROLL-REPRO-01 — SANDBOX REPRODUCTION

> **ID:** PAYROLL-REPRO-01  
> **STATUS:** AUDIT COMPLETE · **P0**  
> **Owner GO:** AUDIT ONLY  
> **Data:** 2026-07-24  
> **Wejście:** RUNTIME-01 · FORENSICS-01 · REGRESSION-01 · INCIDENT-01  
> **Poza zakresem:** implementacja produktowa · commit · push · **prod `batch-set` payroll**  

```text
════════════════════════════════════════════════════════
PAYROLL-REPRO-01 — VERDICT

CLASS reproduction (payload W1/W2 ≡ INCIDENT-01):  PASS
LIVE Cloud / dual-client UI on prod SSOT:           NOT EXECUTED
  reason: H3-A read-only · PSB FORBIDDEN kw-week-employees
          · ryzyko powtórzenia incydentu na live

Incydent klasowo: UDOWODNIONY (obie ścieżki).
Incydent E2E Cloud 1:1 na sandbox write:            BRAK H3-B (niezaimplementowany)
════════════════════════════════════════════════════════
```

---

## 0. Gate bezpieczeństwa (dlaczego nie full Cloud write)

| Warstwa | Stan |
|---------|------|
| TEST-HARNESS-01 **H3-A** | **Read-only** — `writes===0` · never `batch-set` payroll · never „Zapisz tydzień” |
| PSB `FORBIDDEN` | `kw-week-employees` (+ week/archive/tombstones) — hard-deny w H4/H5 |
| H3-B/C (save) | **Not implemented** — wymaga osobnego Owner GO |
| Ten AUDIT | **Świadomie nie** wypycha inactive roster na live SSOT |

**Wykonano:**

1. `npm run test:prod-sandbox -- --scenario h3-payroll --dry-run` → **PASS** · `h3.ro-gate writes=0`  
2. Class repro: `.tmp/payroll-repro-01-class.mjs` → **`CLASS_REPRO_PASS`**  
3. Existing: `test-payroll-zero-hours-persistence-pr-pay-s3.mjs` → **14 PASS / 0 FAIL**  
4. Existing: `test-payroll-add-from-directory-merge-p0.mjs` → **16 PASS / 0 FAIL**

Evidence: `.tmp/payroll-repro-01-class.mjs` · H3 report `.tmp/prod-sandbox-out/h3-payroll-*/report.json`

---

## 1. Reproduction Matrix

| Scenariusz | Co uruchomiono | React | Payload | batch-set | Cloud live | Reload / 2. klient | Wynik |
|------------|----------------|-------|---------|-----------|------------|--------------------|-------|
| **W1 class** | Deactivate Pn–So (`active:false`, times 07–16) + stamp | symulowany | ≡ INCIDENT-01 | mock only | **nie** | mock pull ≡ payload | **PASS** |
| **W2 class** | `weekEmployeeFromDir` | factory | ≡ INCIDENT-01 + **nowy UUID** | mock only | **nie** | mock pull ≡ payload | **PASS** |
| **W1 live UI** | — | — | — | — | — | — | **NOT RUN** (H3-A) |
| **W2 live UI** | — | — | — | — | — | — | **NOT RUN** (H3-A) |
| **F5 / autosync alone** | (RUNTIME + REGRESSION) | — | — | payroll set **nie** | — | — | **FAIL as cause** (nie generuje) |
| **Odśwież skład** | (RUNTIME) | all `defaultDays` | — | — | — | — | **EXCLUDED** (14/14) |
| H3 dry-run RO | harness | — | RO get plan | writes=0 | — | — | **PASS gate** |

### Zarejestrowane kroki (class W1)

```text
1. User actions (mapped): open LP detail → checkbox active OFF ×6
2. React (equiv): weekEmployee.days[*].active=false; dataUpdatedAt bumped
3. Payload: days = { Pn…So: { active:false, from:07:00, to:16:00 } }; hours=0
4. batch-set: WOULD call domain push after 1s debounce (not fired to prod)
5. Cloud: WOULD store identical JSON (not written)
6. Reload / client2: pull WOULD show 0h (simulated clone PASS)
```

### Zarejestrowane kroki (class W2)

```text
1. User actions: remove (opt) → add from directory
2. React: weekEmployeeFromDir → defaultDays()
3. Payload: exact defaultDay() ×6 · 0h · NEW id
4. batch-set: WOULD pwrPush immediately (not fired to prod)
5–6. Cloud / reload: same fingerprint (simulated PASS)
```

### Fingerprint vs INCIDENT-01

| Pole | INCIDENT-01 | W1 class | W2 class |
|------|-------------|----------|----------|
| `active` | false ×6 | **match** | **match** |
| `from`/`to` | 07:00–16:00 | **match** | **match** |
| hours | 0 | **match** | **match** |
| `defaultDay()` factory | wygląd | equiv (checkbox) | **exact factory** |
| emp `id` | `ddb67d99-…` (po wipe) | **same UUID kept** | **new UUID** |

`defaultDay()` runtime: `{ active:false, from:"07:00", to:"16:00", zaliczka:"" }` — **factoryMatchesIncidentDay: true**

---

## 2. Successful Scenario

**SUCCESS = class reproduction obu ścieżek.**

```text
W1 CLASS_REPRO_PASS — payload ≡ INCIDENT-01 · same UUID possible
W2 CLASS_REPRO_PASS — payload ≡ INCIDENT-01 · new UUID
Supporting: PR-PAY-S3 cleared hours survive merge (14/0)
Supporting: add-from-directory + weekEmployeeFromDir (16/0)
```

**Successful Scenario (Owner card):**  
Możliwość wytworzenia Cloud-shaped payloadu `active=false` / `defaultDay` / `0h` jest **udowodniona** dla **W1 i W2** bez zmiany kodu produktu.

---

## 3. Failed / Not-run Scenarios

| ID | Status | Powód |
|----|--------|-------|
| Live W1 E2E → prod Cloud | **NOT RUN** | H3-A RO · brak H3-B · ryzyko live wipe |
| Live W2 E2E → prod Cloud | **NOT RUN** | j.w. |
| Dual-client Playwright sync | **NOT RUN** | wymaga write surface |
| Autosync-only wipe | **FAILED as RC** | nie generuje inactive days (RUNTIME) |
| Bootstrap-only wipe | **FAILED as RC** | REGRESSION: write path unchanged; pull ≠ set |

---

## 4. Odpowiedzi Ownera

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Czy incydent udało się odtworzyć? | **Klasowo: TAK.** **Live Cloud E2E: NIE URUCHOMIONO** (gate). |
| 2 | Która ścieżka? | **W1 i W2** — obie generują zgodny fingerprint |
| 3 | Payload ≡ INCIDENT-01? | **TAK** (class) |
| 4 | Czy wymaga dwóch klientów? | **NIE** do wygenerowania wipe. **TAK** tylko do obserwacji propagacji |
| 5 | Konkretna kolejność? | **W1:** odznacz dni → czekaj ≥1s debounce. **W2:** remove→add (lub add jeśli brak). Sync/reload **po** write, nie zamiast |
| 6 | Automatyczny test regresyjny? | **TAK** — class unit (payload + UUID discriminator) możliwy **bez** prod write; E2E H3-B dopiero po Owner GO |

---

## 5. Root Cause Confidence

| Warstwa | Confidence |
|---------|------------|
| Payload *może* powstać z W1/W2 | **VERY HIGH** (class PASS) |
| Live 24.07 był W1 lub W2 | **HIGH** (FORENSICS+RUNTIME; brak UUID morning → W1≈W2) |
| Regresja kodu piątek | **NONE** (REGRESSION-01) |
| Pełna 1:1 historyczna E2E | **N/A** — nieodtwarzalna bez logów; klasowo wystarczająca |

```text
ROOT CAUSE CONFIDENCE (mechanism): HIGH
ROOT CAUSE CONFIDENCE (exact click 24.07): MEDIUM (W1 vs W2 open)
```

---

## 6. Plan automatu regresyjnego (bez implementacji teraz)

**Minimal (zalecany, zero prod write):**

1. Assert `defaultDay()` / `weekEmployeeFromDir().days` ≡ incident fingerprint  
2. Assert W1 deactivate-all → 0h + same `id`  
3. Assert W2 → new `id` + fingerprint  
4. Assert merge: cleared newer ts nie wskrzesza (reuse PR-PAY-S3)

**Opcjonalny H3-B (osobny GO):** Playwright na **izolowanym** emp `psb-*` + cleanup PSB-001 — **nigdy** na `dir-1` / produkcji godzin.

---

## 7. Owner Readiness

```text
OWNER READINESS: REPRO AUDIT COMPLETE

Proven:   class W1 + W2 payload ≡ INCIDENT-01
Blocked:  live payroll batch-set (H3-A / FORBIDDEN)
Next GO options:
  A) Accept class repro as sufficient · close REPRO chain
  B) Owner GO → H3-B design (sandbox write + cleanup) — osobny EPIC
  C) Operator UUID discriminator (RUNTIME) bez kodu

Forbidden: implement · commit · push · live wipe repro
```

---

## 8. Raport końcowy (Owner card)

1. **Reproduction Matrix** — §1  
2. **Successful Scenario** — class W1 + W2 **PASS**  
3. **Failed / Not-run** — live E2E blocked; autosync-only fail-as-cause  
4. **Root Cause Confidence** — mechanism **HIGH**  
5. **Owner Readiness** — COMPLETE · AUDIT ONLY  
