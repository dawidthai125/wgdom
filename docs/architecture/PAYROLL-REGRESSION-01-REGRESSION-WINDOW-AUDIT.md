# PAYROLL-REGRESSION-01 — REGRESSION WINDOW AUDIT

> **ID:** PAYROLL-REGRESSION-01  
> **STATUS:** AUDIT COMPLETE · **P0**  
> **Owner GO:** AUDIT ONLY  
> **Data:** 2026-07-24  
> **Wejście:** [`PAYROLL-FORENSICS-01-DOMAIN-WRITE-PATH-AUDIT.md`](./PAYROLL-FORENSICS-01-DOMAIN-WRITE-PATH-AUDIT.md) · [`PAYROLL-INCIDENT-01-AUDIT.md`](./PAYROLL-INCIDENT-01-AUDIT.md)  
> **Poza zakresem:** implementacja · poprawki · commit · push  

```text
════════════════════════════════════════════════════════
PAYROLL-REGRESSION-01 — VERDICT

Regression Window: fce7b78 (2.65.35, Mon) → 23d7723 (2.65.40, Fri)
  (+ docs tip fcf66b0; feature SSOT = 23d7723)

W1 / W2 / W10 write-path blobs: IDENTICAL across window
RED commits in window: ZERO
Single commit that introduced incident: NIE

Nie ma regresji kodu ścieżek zapisu Payroll
w oknie Poniedziałek→Piątek.
════════════════════════════════════════════════════════
```

---

## 1. Regression Window

| Granica | Wartość | Uzasadnienie |
|---------|---------|--------------|
| **Last known good (app)** | **`fce7b78`** · UI **2.65.35** · 2026-07-20 ~00:30 CEST | PAYROLL-CLOUD-RESURRECTION-01 CLOSED; Owner: Pon–Czw godziny OK |
| **Stable stretch** | **2026-07-20 … 2026-07-23** | Brak feature deploy Payroll; tylko test-infra / docs |
| **First UI deploys w piątek (przed incydentem)** | **`838e8e2`** 00:15 · **`f9d922a`** 00:34 · **`23d7723`** 03:56 CEST | Tenders / diag / HARDENING-01A |
| **Incident stamp (Cloud)** | **`2026-07-24T09:29:17.795Z`** ≈ **11:29 CEST** | Po live **2.65.40** (~7.5 h po `23d7723`) |
| **Docs tip po incydencie** | **`fcf66b0`** 09:33 CEST | Docs/tooling only — **nie** zmienia app write path |
| **Feature baseline prod** | **`23d7723`** / **2.65.40** | `09_PRODUCTION_BASELINE.md` |

**Formalne okno regresji (app semantyka):**

```text
fce7b78 (2.65.35)  ──Mon–Thu stable──►  23d7723 (2.65.40)  ──►  incident ~09:29Z
```

**Poza oknem (świadomie wykluczone jako „Friday regression”):**

| Commit | Kiedy | Uwaga |
|--------|-------|-------|
| `e38610a` rollover ALIGN | Nd 19.07 | Żył Pon–Czw **bez** incydentu → nie tłumaczy „pierwszy raz w piątek” |
| `fce7b78` resurrection fence | Pn 20.07 00:30 | **Baseline** okna (start good), nie kandydat regresji piątkowej |

**Supabase / Edge w oknie `fce7b78..23d7723`:** brak commitów `supabase/` (zgodne z INCIDENT-02: Edge ≠ RC payloadu).

---

## 2. Timeline commitów w oknie

| # | SHA | Czas (CEST) | Temat | Klasa |
|---|-----|-------------|-------|-------|
| 0 | `fce7b78` | 20.07 00:30 | RESURRECTION-01 fence **2.65.35** | **BASELINE** (good) |
| 1 | `5d6e798` | 20.07 00:35 | docs closeout resurrection | **GREEN** |
| 2 | `b59e66e` | 20.07 07:55 | docs continuity | **GREEN** |
| 3 | `1addd97` | 20.07 15:55 | test-infra H4 sandbox | **GREEN** |
| 4 | `3356349` | 21.07 08:28 | test-infra H5 | **GREEN** |
| 5 | `ef882d3` | 21.07 17:20 | test-infra H0.x ledger | **GREEN** |
| 6 | `838e8e2` | 24.07 00:15 | Tenders Sync Storm P0 **2.65.38** | **GREEN** (tenders only) |
| 7 | `0fc56cb` | 24.07 00:25 | docs Sync Storm release | **GREEN** |
| 8 | `f9d922a` | 24.07 00:34 | diag auto-enable OFF **2.65.39** | **YELLOW** |
| 9 | `e666443` | 24.07 00:37 | docs cleanup smoke | **GREEN** |
| 10 | `23d7723` | 24.07 03:56 | HARDENING-01A Persist SSOT **2.65.40** | **GREEN** (tenders persist) |
| 11 | `82e4532` | 24.07 04:28 | docs 01A closeout | **GREEN** |
| 12 | `96d44d0` | 24.07 05:13 | docs/tooling 01D | **GREEN** |
| 13 | `e349506` | 24.07 05:25 | docs 01D closeout | **GREEN** |
| — | **incident** | **24.07 ~11:29** | Cloud 0h / defaultDay | — |
| 14 | `fcf66b0` | 24.07 09:33* | docs/tooling 01B0 | **GREEN** (*commit przed stampem UTC; deploy docs tip) |

\* `fcf66b0` 09:33 CEST ≈ 07:33Z — **przed** Cloud `dataUpdatedAt` 09:29Z; nadal **docs-only**, zero `src/**` payroll write.

**Ile commitów w oknie app (`fce7b78..23d7723` exclusive tip):** **10**  
**Z docs tip (`..fcf66b0`):** **14**  
**Feature deploys UI w piątek przed incydentem:** **3** (`838e8e2`, `f9d922a`, `23d7723`)

---

## 3. Lista RED / YELLOW / GREEN

### RED — bezpośrednia zmiana write path Payroll (W1/W2/W10 / pwrPush / batch-set roster)

**Żaden.**

### YELLOW — pośrednio Payroll (obserwowalność / App surface, bez semantyki zapisu)

| SHA | Co | Czy może wygenerować `active=false` / 0h / `defaultDay`? |
|-----|-----|----------------------------------------------------------|
| **`f9d922a`** | `PAYROLL_*_DIAG_AUTO_ENABLE = false`; runtime trace default OFF; `App.tsx` sync-metrics tylko DEV/`VITE_DEBUG_*` | **NIE** — tylko mniej logów |

### GREEN — nie dotyka Payroll write / albo poza domeną

Wszystkie pozostałe w §2 (tenders, test-infra, docs/tooling).

---

## 4. Diff najważniejszych zmian (przed → po)

### 4.1 Blob identity — W1 / W2 / W10 (krytyczne)

Porównanie `fce7b78` vs `23d7723` (identyczny SHA bloba = **zero diff**):

| Plik / rola | W | Identyczny? |
|-------------|---|-------------|
| `src/lib/payroll-domain-sync.ts` (`schedulePayrollDomainPush`) | W1 | **TAK** |
| `src/lib/payroll-week-roster-bundle.ts` (`pwrPush`, add/remove) | W1/W2 | **TAK** |
| `src/app/app-domain.ts` (`defaultDay`, `weekEmployeeFromDir`) | W2 | **TAK** |
| `src/app/WorkerPhotoView.tsx` (`syncWeekEmployees` → `pushKeysToCloudSafe`) | W10 | **TAK** |
| `src/lib/cloud-sync.ts` (`pushWeekEmployeesToCloud`, merge/strip, guard) | W1/W9 | **TAK** |
| `src/app/CloudLoader.tsx` (bootstrap push) | W9 | **TAK** (ostatnia zmiana = sam baseline `fce7b78`) |
| `src/app/WeekEmployeeDetail.tsx` | W1 UI | bez zmian od 2026-07-01 |

**Wniosek:** kolejność, guard, condition, merge, replace, mutate, normalize, `defaultDay` dla W1/W2/W10 — **bez zmian w oknie regresji.**

Ostatnie historyczne zmiany tych plików (przed oknem):

| Plik | Ostatni commit | Data |
|------|----------------|------|
| domain-sync / roster-bundle | `e819124` SYNC-ARCH-01 S2 | 10.07 |
| WorkerPhotoView / app-domain | `d8f2d99` jobs tombstones | 12.07 |
| cloud-sync / CloudLoader | `fce7b78` resurrection | 20.07 (= start okna) |

### 4.2 Jedyne `src` Payroll-adjacent w oknie

**`f9d922a` (2.65.39)** — diag OFF:

```text
PAYROLL_BOOT_PATH_DIAG_AUTO_ENABLE: true → false
PAYROLL_STORAGE_TRACE_DIAG_AUTO_ENABLE: true → false
PAYROLL_WRITE_TRACE_DIAG_AUTO_ENABLE: true → false
isPayrollTraceEnabled(): default true → default false (opt-in)
App.tsx: sync-metrics console gated
```

**`838e8e2` / `23d7723`:** wyłącznie tenders pipeline / persist coalesce / bootstrap local — **zero** trafień na symbole:
`schedulePayrollDomainPush`, `persistPayrollRoster`, `weekEmployeeFromDir`, `defaultDay`, `pwrPush`, `pushKeysToCloudSafe`, `commitLivePayrollRosterEdit`, `replaceWeekEmployees*`.

### 4.3 Przed / po W1 · W2 · W10

| Path | Przed (`fce7b78`) | Po (`23d7723`) | Zmiana? |
|------|-------------------|----------------|---------|
| **W1** field edit → domain push | bez zmian | bez zmian | **NIE** |
| **W2** `weekEmployeeFromDir` → `pwrPush` | bez zmian | bez zmian | **NIE** |
| **W10** Worker `pushKeysToCloudSafe` | bez zmian | bez zmian | **NIE** |

---

## 5. Ranking podejrzanych commitów (w oknie)

| Rank | SHA | P vs incident | Komentarz |
|------|-----|---------------|-----------|
| — | *(brak RED)* | — | Brak kandydata „wprowadził bug write path” |
| 1 | `f9d922a` | **VERY LOW** | Jedyny YELLOW; **utrudnia** forensics, nie generuje 0h |
| 2 | `23d7723` | **NONE (write)** | Tenders Persist SSOT; korelacja czasowa (live rano), **nie** causal W1/W2/W10 |
| 3 | `838e8e2` | **NONE** | Sync Storm tenders |
| — | docs / test-infra | **NONE** | Brak runtime payroll |

---

## 6. Hipoteza Regression RC

### Werdykt

**NIE istnieje pojedynczy commit w Regression Window, który wprowadził incydent poprzez zmianę W1/W2/W10.**

**Hipoteza Regression RC:**

```text
NIE JEST TO REGRESJA KODU WRITE PATH W OKNIE PON–PT.

Kod ścieżek W1/W2/W10 na tipie piątkowym = kod z tipu poniedziałkowego (2.65.35).

Incydent 24.07 = użycie już istniejącej ścieżki domenowej
(FORENSICS: W1 lub W2 ± W10) + udany batch-set,
nie nowa semantyka wprowadzona piątkowymi deployami.
```

**Korelacja czasowa ≠ przyczynowość:**  
Live był już na **2.65.40** od ~03:56; Cloud write @ ~11:29. To nie dowodzi, że `23d7723` zmienił Payroll — diff tego zaprzecza.

**Diag OFF (`f9d922a`):** możliwy wpływ tylko na **brak śladów** wokół incydentu, nie na payload `active=false`.

---

## 7. Odpowiedzi Ownera

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Regression Window? | **`fce7b78` (2.65.35) → `23d7723` (2.65.40)**; incident po live 2.65.40 |
| 2 | Ile commitów w oknie? | **10** do feature tip; **14** z docs tip; **3** feature UI w piątek |
| 3 | Najbardziej podejrzany? | **Brak RED.** Najbliższy YELLOW: **`f9d922a`** (diag) — **nie** RC 0h |
| 4 | Czy którykolwiek dotyka W1/W2/W10? | **Nie semantyki zapisu.** Bloby W1/W2/W10 **identyczne**. YELLOW tylko trace flags |
| 5 | Pojedynczy commit, który mógł wprowadzić incydent? | **NIE** |
| 6 | Jeżeli NIE — jednoznacznie | **NIE — żaden commit w oknie nie zmienił write path W1/W2/W10; regresja kodu tych ścieżek nie jest Root Cause.** |

---

## 8. Owner Readiness

```text
OWNER READINESS: REGRESSION AUDIT COMPLETE

Verdict: NO WRITE-PATH CODE REGRESSION in Mon→Fri window
Next (Owner GO):
  A) Treat INCIDENT-01 as latent-path / operator-runtime (FORENSICS W1/W2)
  B) Optional: expand historical RCA beyond this window only if new evidence
     (e.g. Mon-Thu was NOT actually on 2.65.35 — contradict baseline)
  C) Do NOT revert 2.65.38–40 as Payroll fix (wrong lever)

Forbidden: implement · fix · commit · push
```

---

## 9. Raport końcowy (Owner card)

1. **Regression Window:** `fce7b78` → `23d7723` (stable Mon–Thu → Friday feature tip)  
2. **Timeline:** §2  
3. **RED / YELLOW / GREEN:** **0 RED** · **1 YELLOW** (`f9d922a`) · reszta **GREEN**  
4. **Diff:** W1/W2/W10 **identical**; Friday src = tenders + diag OFF  
5. **Ranking:** brak commit-RC; `f9d922a` tylko observability  
6. **Hypothesis:** **not a Friday code regression of Payroll writes**  
7. **Owner Readiness:** COMPLETE · AUDIT ONLY  
