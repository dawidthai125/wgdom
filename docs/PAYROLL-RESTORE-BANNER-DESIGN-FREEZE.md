# PAYROLL — Restore Banner False Positive · DESIGN FREEZE

> **Status:** **DESIGN FREEZE DRAFT** — czeka na akceptację właściciela repo · **IMPLEMENT: NO GO**  
> **Data freeze:** 2026-07-01 · **wersja dokumentu:** v1.0  
> **Baseline prod:** **v2.63.23** (`d670892`) · **STABILIZATION WINDOW:** ACTIVE  
> **Audyt źródłowy:** [`PAYROLL-RESTORE-BANNER-FALSE-POSITIVE-AUDIT.md`](PAYROLL-RESTORE-BANNER-FALSE-POSITIVE-AUDIT.md) — **zatwierdzony**  
> **Powiązane (CLOSED):** [`PAYROLL-CLOUD-RECOVERY-B5-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B5-CLOSEOUT.md) · [`PAYROLL-CLOUD-RECOVERY-B6-RELEASE-REPORT.md`](PAYROLL-CLOUD-RECOVERY-B6-RELEASE-REPORT.md)

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Bundle** | **RB** — Restore Banner False Positive |
| **Epic** | PAYROLL UX (poza Etap 2 B1–B6) |
| **Principles** | **Brak nowych** — #001–#013 bez zmian |
| **Nowe pole KV** | **Brak** |
| **Zmiana merge/sync** | **Brak** — wyłącznie warunek UI banera + copy |
| **Deploy** | **Vercel** (frontend only) |
| **IMPLEMENT** | **Zabroniony** do akceptacji tego dokumentu |

```text
AUDIT RB:        COMPLETE
DESIGN FREEZE:   DRAFT — oczekuje akceptacji właściciela repo
IMPLEMENT:       NO GO
```

---

## 1. Goal

**Problem:** Baner „W archiwum jest pełniejsza wersja tego tygodnia” pozostaje widoczny mimo zgodnych sum w Liście Płac, po czyszczeniu danych testowych, ponownym zapisie tygodnia i nadpisaniu archiwum — **false positive**.

**Cel RB:** Baner ma sygnalizować **rzeczywistą stratę danych payroll** (dni aktywne / godziny) między live `kw-week-employees` a `kw-archive[].weekEmployees` dla **tego samego** `weekFrom|weekTo`, a nie różnicę heurystyki strukturalnej `weekEmployeesListRichness`.

**Sukces biznesowy:** Administrator widzi CTA „Przywróć z archiwum” **tylko** gdy archiwum ma więcej godzin lub więcej dni aktywnych niż bieżąca lista operacyjna; znikają mylące banery przy zgodnych wypłatach.

---

## 2. RCA summary

| Warstwa | As-is | Root cause |
|---------|-------|------------|
| **Warunek banera** | `weekEmployeesListRichness(arch) > richness(live) + 1` | Metryka **strukturalna**, nie payroll |
| **Dwa magazyny** | `kw-week-employees` vs `kw-archive[].weekEmployees` | Sync scala osobno — mogą się rozjeżdżać |
| **Copy UI** | „Brakuje godzin Sob.pr.…” | Obiecuje godziny; kod **nie** używa `payrollMetrics` |
| **Próg `+ 1`** | 2 punkty richness wystarczą | Zbyt czuły (np. `active:true` → `active:false`) |

**Nie jest root cause RB:** B3 Guard, B4 `finalizePayrollBundleMerge`, B5 closed week UI, B6 Edge parity, `workEntries`, smoke CI (chyba że zostawiły dane w prod KV — baner po fixie oceni je metrykami godzin).

**Scenariusz referencyjny (audyt E1):**

```text
Live i archiwum: te same totalHours / netto w LP
Archiwum: stare active:true + notes na dniach
Live: active:false, from/to bez zmian
richness(arch) > richness(live) + 1 → baner ON (false positive)
payrollMetrics equal → baner OFF (target RB)
```

---

## 3. Current banner algorithm

**Plik:** `src/app/PayrollView.tsx` (L594, L714–721)

```text
archivedForWeek = savedWeeks.find(w => w.weekFrom === weekFrom && w.weekTo === weekTo)

archiveRichness = weekEmployeesListRichness(archivedForWeek.weekEmployees)
currentRichness = weekEmployeesListRichness(weekEmployees)

showRestoreBanner =
  !isClosedWeek
  AND onRestoreFromArchive
  AND archivedForWeek?.weekEmployees?.length > 0
  AND archiveRichness > currentRichness + 1
```

**`weekEmployeesListRichness`** (`cloud-sync.ts`): suma punktów `dayRichness` (active, from/to, extraHours, notes, zaliczka), `prevSaturday`, `extraCosts.length × 3` — **bez** `payrollMetrics`.

**CTA:** `restoreWeekFromArchive` (App.tsx) — kopiuje `snap.weekEmployees` → live; bez zmian w RB.

**B5 gate (zachować):** `!isClosedWeek` — bez zmian.

---

## 4. Proposed payrollMetrics-based algorithm

**FREEZE DECISION:** **PRIMARY SSOT** warunku banera = `payrollMetrics` z `cloud-sync.ts` (już używane przez `wouldBlockPayrollShrink`).

### 4.1 Metryki

```text
archiveM = payrollMetrics(archivedForWeek.weekEmployees)
liveM    = payrollMetrics(weekEmployees)

// payrollMetrics: { activeDays, totalHours }
// totalHours — Pn–Pt + Sob.pr., zaokrąglone 0.1 (istniejąca implementacja)
```

### 4.2 Warunek „archiwum bogatsze” (PRIMARY)

```text
EPS_HOURS = 0.05   // tolerancja float remisu godzin

archivePayrollRicher =
  archiveM.activeDays > liveM.activeDays
  OR archiveM.totalHours > liveM.totalHours + EPS_HOURS
```

**Uzasadnienie:** Spójne z semantyką guardu payroll (metryki operacyjne, nie struktura JSON). Remis godzin ±0.05 h → brak banera.

### 4.3 Warunek banera (target)

```text
showRestoreBanner =
  !isClosedWeek
  AND onRestoreFromArchive
  AND archivedForWeek?.weekEmployees?.length > 0
  AND archivePayrollRicher
```

**Usunięte z triggera:** `archiveRichness > currentRichness + 1` jako **jedyny** warunek (zastąpione §4.2).

### 4.4 Helper (opcjonalny, MIN)

Wydzielenie czystej funkcji (lokalnie w `PayrollView` lub `cloud-sync.ts`):

```text
shouldShowPayrollRestoreBanner(
  weekEmployees,
  archivedWeekEmployees,
  opts?: { epsHours?: number }
): boolean
```

Bez side effects; ułatwia test RB bez mountu React.

---

## 5. Richness secondary signal

**FREEZE DECISION:** `weekEmployeesListRichness` **nie wyzwala** banera **samodzielnie** w zakresie MIN.

| Rola | Zachowanie |
|------|------------|
| **PRIMARY** | `payrollMetrics` — §4 |
| **SECONDARY (richness)** | **Wyłączone z triggera UI** w RB MIN |
| **Pozostaje w codebase** | P11, `bootstrapMergedShouldPush`, Edge `weekEmployeesRichness`, guard shrink — **bez zmian** |

**Uzasadnienie:** Richness jako drugi sygnał przy `payrollMetrics` równych przywraca false positive E1 (audyt). Jeśli w przyszłości potrzeba wykrycia „same extraCosts w archiwum” — **osobny bundle** (nie RB).

**Opcjonalny follow-up (poza MIN, nie implementować w RB):**

```text
// RB.2 — ODRZUCONE w tym freeze
archivePayrollRicher OR (
  metricsEqualWithin(EPS) AND richness(arch) > richness(live) + 8
)
```

---

## 6. Banner copy alignment (RB-3)

**FREEZE DECISION:** Tekst banera musi opisywać **warunek z §4** (dni aktywne / godziny), nie ogólną „pełniejszą wersję” ani wyłącznie Sob.pr.

### 6.1 As-is (v2.63.23)

| Element | Tekst |
|---------|--------|
| Tytuł | „W archiwum jest pełniejsza wersja tego tygodnia” |
| Opis | „Brakuje godzin Sob.pr. lub dodatkowych wpisów? Przywróć z zapisanego archiwum.” |
| CTA | „Przywróć z archiwum” |

### 6.2 Target (po IMPLEMENT)

| Element | Tekst (propozycja freeze) |
|---------|---------------------------|
| Tytuł | „W archiwum jest więcej zapisanych godzin niż na bieżącej liście” |
| Opis | „Zapisany tydzień ma więcej dni roboczych lub łącznie więcej godzin (w tym Sob.pr.). Przywróć skład i godziny z archiwum, jeśli coś zniknęło po syncu lub edycji.” |
| CTA | **Bez zmian** — „Przywróć z archiwum” |

**Zasada RB-3:** Copy **nie** obiecuje extraCosts, workEntries ani „pełniejszej wersji” bez metryk; **nie** wspomina richness.

---

## 7. Scope

### 7.1 Bundle RB — zakres IMPLEMENT (plan)

| ID | Element | Opis |
|----|---------|------|
| **RB-1** | Warunek `showRestoreBanner` | `payrollMetrics` PRIMARY — §4 |
| **RB-2** | Helper `shouldShowPayrollRestoreBanner` | Pure function — testowalność |
| **RB-3** | Copy banera | §6.2 — tytuł + opis |
| **RB-4** | Test `scripts/test-payroll-restore-banner-false-positive.mjs` | **NOWY** |
| **RB-5** | Docs release | `changelog-data.ts`, `CHANGELOG.md` — jedna linia |

### 7.2 Pliki objęte IMPLEMENT

| Plik | Zmiana |
|------|--------|
| `src/app/PayrollView.tsx` | Warunek banera + copy RB-3 |
| `src/lib/cloud-sync.ts` | **OPCJONALNY** — export helper jeśli nie inline w PayrollView |
| `scripts/test-payroll-restore-banner-false-positive.mjs` | **NOWY** |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | po IMPLEMENT |

### 7.3 Bez zmian (explicit)

| Warstwa | Powód |
|---------|--------|
| `restoreWeekFromArchive` (App.tsx) | Semantyka CTA OK |
| `refreshSavedActiveWeekSnapshot` | Już wyrównuje archiwum z live przy edycjach operacyjnych |
| `mergeArchive` / `finalizePayrollBundleMerge` | Poza RCA banera |
| B3 / B4 / B5 / B6 | CLOSED — regresja tylko testami |
| Edge `make-server-0afb8820` | Brak zmian serwerowych |

---

## 8. Out of scope

| Element | Powód |
|---------|--------|
| Auto-clamp `kw-archive` do live po `runCloudSync` | Ryzyko utraty danych z innej karty (audyt RB-4) |
| Zmiana `mergeArchive` / union archiwum | Osobny epic sync |
| Baner na `workEntries` / `employees` summary | Nowy model decyzji |
| Richness jako trigger (solo lub z niskim progiem) | Źródło false positive |
| Porównanie kwot netto / gross w banerze | Inna metryka niż RCA; UI LP już pokazuje sumy |
| Automatyczne przywracanie bez kliknięcia | UX / bezpieczeństwo |
| Zmiana `isClosedWeek` / B5 `displayEmployees` | B5 CLOSED |
| Nowe KV / Principles #014+ | Zakaz |
| `TEST-INFRA-001` Playwright | Osobny epic |

---

## 9. Acceptance Criteria

| ID | Kryterium | Weryfikacja |
|----|-----------|-------------|
| **RB-AC1** | `payrollMetrics` live == archive (activeDays + totalHours w EPS) → baner **OFF** | test T1 |
| **RB-AC2** | Archive `totalHours` > live + EPS → baner **ON** (operacyjny tydzień, archiwum istnieje) | test T2 |
| **RB-AC3** | Archive `activeDays` > live (godziny remis) → baner **ON** | test T3 |
| **RB-AC4** | Ten sam payroll metrics, różny `weekEmployeesListRichness` → baner **OFF** | test T4 (false positive fix) |
| **RB-AC5** | `isClosedWeek` → baner **OFF** (B5) | test T5 + regresja B5 |
| **RB-AC6** | Brak `archivedForWeek.weekEmployees` → baner **OFF** | test T6 |
| **RB-AC7** | Copy zgodne z §6.2 (code review) | manual |
| **RB-AC8** | Regresja B3/B4/B5/B6 testów PASS | gate §10.2 |
| **RB-AC9** | `npm run build` PASS | BUILD gate |
| **RB-AC10** | Brak nowych KV / Principles | code review |

---

## 10. Test plan

### 10.1 Nowy — `scripts/test-payroll-restore-banner-false-positive.mjs`

**Uruchomienie:** `npx vite-node scripts/test-payroll-restore-banner-false-positive.mjs`

Import: `payrollMetrics`, `weekEmployeesListRichness`, `shouldShowPayrollRestoreBanner` (po IMPLEMENT).

| ID | Scenariusz | Oczekiwane |
|----|------------|------------|
| **T1** | Identyczne dni/godziny live vs archiwum | `false` |
| **T2** | Archiwum +8h na jednym dniu | `true` |
| **T3** | Archiwum +1 activeDay, godziny remis w EPS | `true` |
| **T4** | Te same metrics; arch `active:true`, live `active:false` (richness różne) | `false` |
| **T5** | Helper wywołany z flagą symulującą closed — lub test statyczny gate w PayrollView | B5 gate obecny |
| **T6** | `archivedWeekEmployees` null / `[]` | `false` |

### 10.2 Gate regresji (obowiązkowe przed release)

```bash
npx vite-node scripts/test-payroll-restore-banner-false-positive.mjs
npx vite-node scripts/test-payroll-closed-week-ui-rca2.mjs
npx vite-node scripts/test-payroll-roster-guard-phase2.mjs
npx vite-node scripts/test-payroll-bootstrap-runtime-parity-b4.mjs
npx vite-node scripts/test-payroll-edge-parity-b6.mjs
npm run build
```

### 10.3 Smoke manualny (opcjonalny)

| Kroki | Oczekiwane |
|-------|------------|
| Tydzień operacyjny, zapisany archiwum = live po „Nadpisz” | Brak banera |
| Celowo usuń godziny z live (nie zapisuj archiwum) | Baner ON |
| „Przywróć z archiwum” | Live odzyskuje godziny; po przywróceniu baner OFF |

---

## 11. Files affected

### 11.1 IMPLEMENT (kod)

| Plik | Typ |
|------|-----|
| `src/app/PayrollView.tsx` | **PRIMARY** |
| `src/lib/cloud-sync.ts` | **OPTIONAL** — helper export |
| `scripts/test-payroll-restore-banner-false-positive.mjs` | **NEW** |

### 11.2 Release docs (po IMPLEMENT)

| Plik |
|------|
| `src/app/changelog-data.ts` |
| `CHANGELOG.md` |
| `docs/PAYROLL-RESTORE-BANNER-DESIGN-FREEZE.md` (status → APPROVED) |
| `docs/PAYROLL-RESTORE-BANNER-CLOSEOUT.md` (po VERIFY) |

### 11.3 Read-only reference

| Plik |
|------|
| `docs/PAYROLL-RESTORE-BANNER-FALSE-POSITIVE-AUDIT.md` |
| `src/app/App.tsx` — `restoreWeekFromArchive`, `refreshSavedActiveWeekSnapshot` |

---

## 12. Rollback

| Krok | Akcja |
|------|--------|
| **1** | Revert commit RB na `main` |
| **2** | Redeploy Vercel → **v2.63.23** (`d670892`) |
| **3** | KV / Edge — **brak migracji**; przywrócony stary warunek richness |
| **4** | Użytkownik: false positive może wrócić; true positive (realna strata godzin) nadal wykrywany przez stary próg richness (często wcześniej) |

**Wersja docelowa:** **2.63.24** (patch) — rekomendacja freeze.

---

## GO / NO GO

| Etap | Status |
|------|--------|
| **AUDIT RB** | **COMPLETE** |
| **DESIGN FREEZE** | **DRAFT** — oczekuje akceptacji właściciela repo |
| **IMPLEMENT** | **NO GO** |

---

*SSOT freeze RB: ten plik · bez implementacji do DESIGN FREEZE GO.*
