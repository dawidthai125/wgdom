# PAYROLL — F1 · Lost Update `extraCosts` · AUDIT + DESIGN FREEZE (propozycja)

> **Typ:** Audyt weryfikacyjny F1 z PAYROLL CERTIFICATION 2026 (`docs/PAYROLL-CERTIFICATION-2026-AUDIT.md`).
> **Data:** 2026-07-03 · **HEAD `main`:** `0cdbc54` · **Prod UI:** v2.63.27
> **Metoda:** Analiza statyczna klient + Edge. Bez zmian kodu, bez BUILD, bez COMMIT.
> **Werdykt:** ❌ **Lost Update POTWIERDZONY (REAL)** — bidirectional, cichy, finansowy.
> **Workflow:** AUDIT → RAPORT → STOP. DESIGN FREEZE = **PROPOZYCJA** (nie zaakceptowany, nie implementowany).
> **Zakaz:** nie łączyć z S7-5 (resurrection) ani S7-2 (batch-set 500) — osobny cel (One Bundle = One Goal).

---

## 0. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy Lost Update `extraCosts` jest realny? | ✅ **TAK** |
| Kierunek | **Dwukierunkowy** (A traci od B i B traci od A) |
| Wykrywalność dla użytkownika | ❌ **Cichy** (brak alertu, brak czerwonego statusu) |
| Waga | 🔴 **Finansowa** — premie/dodatki/koszty/bonusy/zwroty |
| Warunek wyzwolenia | Współbieżna edycja tego samego pracownika **zanim** pull rozpropaguje zmianę drugiego urządzenia (tło/offline/okno throttle 15s) |
| Objęty istniejącym bundlem? | ❌ **NIE** (poza S7-2/S7-4/S7-5) |

---

## 1. Model danych finansowych (co dokładnie jest zagrożone)

`WeekEmployee` (`src/app/app-domain.ts:95–115`) — pola finansowe i ich reguła merge:

| Pole | Typ | Nośnik | Reguła merge | Znacznik LWW | Bezpieczeństwo |
|------|-----|--------|--------------|--------------|----------------|
| `rate` | `string` | pole | `pickRateByTimestamps` | **własny** `rateUpdatedAt` | ✅ dekopling |
| `days[d].zaliczka` + godziny | w `days` | mapa dni | `pickDaysByTimestamps` — **per-klucz dnia** (spread) | `dataUpdatedAt` (wspólny) | ⚠️ per-dzień OK, ale wspólny znacznik |
| `prevSaturday` (Sob.pr.) | `DayData` | pole | `pickPrevSaturdayByTimestamps` | `dataUpdatedAt` (wspólny) | ⚠️ |
| **`extraCosts[]`** | `EmployeeExtraCost[]` | **tablica** | **całościowe LWW** | `dataUpdatedAt` (wspólny) | ❌ **F1** |
| `payrollCarryForward` | obiekt | pole | `pickPayrollCarryForward` (amount/createdAt) | częściowo własny | ⚠️ współdzieli `dataUpdatedAt` |
| `settled` | `boolean` | pole | `pickSettledByTimestamps` | **własny** `settledUpdatedAt` | ✅ dekopling (S5) |

**KLUCZOWE:** W modelu **nie istnieją** osobne pola „premia”, „dodatek”, „bonus”. Wszystkie pozapłacowe składniki finansowe (premie, dodatki, koszty do zwrotu, zwroty za paliwo/chemię/zakupy) są modelowane **wyłącznie** jako wpisy `EmployeeExtraCost` w **jednej tablicy** `extraCosts[]`.

`EmployeeExtraCost` (`app-domain.ts:82–92`): `{ id, description, amount, receiptUrl?, status?, rejectReason?, submittedAt?, submittedBy? }`.

Kwota wchodzi do wypłaty (`calcWeekEmployee`, `app-domain.ts:858,865`):
```
totalExtraCosts = Σ approvedExtraCostAmount(c)   // tylko status "approved"
netPay = grossPay − totalZaliczka + totalExtraCosts
```

➡️ **Cała domena „premie/dodatki/koszty/bonusy” dzieli jeden wektor podatny na Lost Update.** Utrata = bezpośredni błąd wypłaty netto.

> **Rozróżnienie:** `zaliczka` (potrącenie/zaliczka) NIE jest w `extraCosts` — leży w `days[d].zaliczka`, więc korzysta z per-dniowego mergu (bezpieczniejsza). Zagrożony jest wyłącznie `extraCosts[]`.

---

## 2. Dokładny przebieg merge

### 2.1 Ścieżka wywołania (runtime)

```
runCloudSync (App.tsx:724)
 └─ pullAndMergeDataBundle → computeMergedDataBundle (cloud-sync.ts:2486)
     └─ mergeAllDataKeys → mergeDataKey("kw-week-employees") (1403)
         └─ mergeWeekEmployees (1376) → mergeWeekEmployeesList (payroll-week-employee-merge.ts:74)
             └─ per merge-key: mergeWeekEmployeeRecord(local, cloud)  (cloud-sync.ts:1290)
     └─ finalizePayrollBundleMerge (1738) → richness override → preserveSettledLwwFromLocal
 └─ pushMergedDataBundleToCloud (2577)  [replaceWeekEmployeesKeys=["kw-week-employees"] → Edge force-replace]
```

### 2.2 `mergeWeekEmployeeRecord` — sedno (cloud-sync.ts:1290–1332)

```
lAt = parseRecordTs(l.dataUpdatedAt)      // znacznik LOKALNY
cAt = parseRecordTs(c.dataUpdatedAt)      // znacznik CHMURY
days = pickDaysByTimestamps(l, c)          // per-klucz dnia (union kluczy, zwycięzca nadpisuje kolizje)
extraCosts =
  lAt >= cAt ? (l.extraCosts ?? c.extraCosts ?? [])    // ← CAŁA tablica zwycięzcy dataUpdatedAt
             : (c.extraCosts ?? l.extraCosts ?? [])
dataWinner = lAt >= cAt ? l : c
return { ...c, ...l, ...dataWinner, days, prevSaturday, extraCosts, rate, settled, ... }
```

- **`dataWinner`** = rekord z wyższym `dataUpdatedAt` (remis → LOCAL). Spread `...dataWinner` na końcu → **cały rekord zwycięzcy** nadpisuje pola nieobjęte jawnym mergiem.
- **`extraCosts`** = **cała tablica** zwycięzcy `dataUpdatedAt`. **Brak union po `id`. Brak per-item LWW. Brak tombstonów.**
- **`dataUpdatedAt` jest WSPÓLNY** dla: `days`, `prevSaturday`, `extraCosts`, `payrollCarryForward`. Zmiana KTÓREGOKOLWIEK z nich bumpuje ten sam znacznik (App.tsx:1412/1429/1457/1474; generyczny 1393 — `dataChanged` obejmuje `days|prevSaturday|extraCosts|payrollCarryForward`).

### 2.3 Parytet Edge (index.tsx:297–321)

`mergeWeekEmployeeRecordByTimestamps` (Edge) **nie oblicza `extraCosts` jawnie** — wynika ono wyłącznie ze spreadu `{...c, ...l, ...dataWinner}` = tablica `dataWinner`. Zachowanie ≈ klient (whole-array LWW), z drobną różnicą: klient ma fallback (gdy zwycięzca nie ma tablicy → weź drugą), Edge nie. Edge-merge działa jednak tylko na ścieżkach **bez** force-replace (shrink/expansion/backup/restore); main admin path force-replace → autorytatywny jest merge KLIENTA (§2.2).

➡️ **Wniosek:** whole-array LWW `extraCosts` sprzężone ze wspólnym `dataUpdatedAt` po OBU stronach. Brak jakiegokolwiek mechanizmu union/per-item/tombstone dla `extraCosts` w całym repo (potwierdzone grepem — jedyne wystąpienia merge to `cloud-sync.ts:1299` i spread Edge).

---

## 3. Czy Lost Update jest realny — dowód logiczny

**TAK.** Dwa niezależne wektory:

### Wektor 1 — kolizja wewnątrz `extraCosts` (dwa wpisy)
Dwa urządzenia dodają **różne** wpisy do `extraCosts` tego samego pracownika, każde na bazie `[]`, bez uprzedniego pull drugiej zmiany. Merge = whole-array LWW → **tablica jednego zwycięzcy w całości zastępuje** → drugi wpis **znika** (brak union po `id`).

### Wektor 2 — kolizja międzykategoryjna (godziny vs `extraCosts`)
Ponieważ `days` i `extraCosts` dzielą `dataUpdatedAt`: urządzenie A edytuje **godziny** (bump `dataUpdatedAt=TA`, `extraCosts` A = puste), urządzenie B dodaje **premię** (`dataUpdatedAt=TB`, `days` B = stare). Przy merge:
- `TA > TB` → A `dataWinner` → `extraCosts = []` → **premia B znika**; `days` = A.
- `TB > TA` → B `dataWinner` → `days = {...lDays, ...cDays}` = mapa B (stare godziny nadpisują kolizyjne klucze) → **zmiana godzin A znika**; `extraCosts` = [premia].

➡️ **Zawsze ginie edycja urządzenia z niższym `dataUpdatedAt`** — w kategorii, której zwycięzca nie dotknął. Cicho, bez alertu.

### Kiedy NIE ginie (obecne mitigacje — dają fałszywe poczucie bezpieczeństwa)
Jeśli drugie urządzenie **zdążyło pull-em pobrać** zmianę pierwszego **przed** własną edycją (edycja sekwencyjna, karta widoczna, po propagacji, poza throttle 15s) → dokłada wpis do już scalonej tablicy → union na poziomie aplikacji. **To NIE jest gwarancja** — zależy od czasu, widoczności karty i propagacji. Okno kolizji jest realistyczne (właściciel + księgowa edytujący ten sam tydzień; karta w tle; offline).

---

## 4. Rola `dataWinner` / LWW / `dataUpdatedAt` (podsumowanie ryzyka)

| Element | Rola | Problem F1 |
|---------|------|-----------|
| `dataUpdatedAt` | jeden znacznik czasu na rekord | **Sprzęga 4 niezależne struktury** (days/prevSat/extraCosts/carry) — edycja jednej „unieważnia” pozostałe u przegranego |
| `dataWinner` | rekord o wyższym `dataUpdatedAt` | Spread `...dataWinner` nadpisuje `extraCosts` całościowo |
| LWW | Last-Write-Wins po `dataUpdatedAt` | Poprawny dla pojedynczego pola, **błędny dla wektora wielu niezależnych wpisów** (potrzebny merge zbiorów, nie zastąpienie) |
| Zegar | `new Date().toISOString()` **klienta** | Skew zegara → przegrywa realnie nowsza edycja (wzmacnia F1) |

---

## 5. Wszystkie miejsca użycia `extraCosts` (mapa)

| Warstwa | Miejsce | Rola |
|---------|---------|------|
| **Model** | `app-domain.ts:82–92,111` | Typ `EmployeeExtraCost`, pole `extraCosts?` |
| **Kalkulacja** | `app-domain.ts:858,865,877` | `totalExtraCosts` → `netPay` (tylko `approved`) |
| **Merge (klient)** | `cloud-sync.ts:1299–1310,1324` | **whole-array LWW** (F1 root) |
| **Merge (Edge)** | `index.tsx:311–313` (spread `dataWinner`), `222` (richness) | whole-array (parytet, brak jawnego handlingu) |
| **Richness** | `cloud-sync.ts:1044`, `index.tsx:222` | `+len*3` — waży bogactwo (wpływa na richness override i shrink) |
| **Handler UI** | `App.tsx:1402–1418` (`updateWeekEmployeeExtraCosts`) → `dataUpdatedAt` | bump wspólnego znacznika |
| **Handler archiwum** | `App.tsx:1535–1549` (`updateArchiveWeekEmployeeExtraCosts`) | ten sam wzorzec w archiwum |
| **Generyczny** | `App.tsx:1386–1387` (`dataChanged` obejmuje `extraCosts`) | bump wspólnego znacznika |
| **UI edycja** | `PayrollView.tsx`, `WeekEmployeeDetail.tsx`, `payroll-editors.tsx` | dodawanie/edycja wpisów |
| **Worker** | `WorkerPhotoView.tsx` | pracownik zgłasza koszt (skan paragonu) — kolejna ścieżka zapisu `extraCosts` |
| **Export** | `payroll-export.ts` | prezentacja `totalExtraCosts` |
| **Dashboard** | `DashboardView.tsx`, `DashboardPilneUwagiSection.tsx` | liczniki/uwagi |
| **Snapshot diff** | `app-domain.ts:2124–2125` | wykrywanie zmian dla snapshotu |

> **Uwaga (poszerza F1):** `WorkerPhotoView` to **druga** ścieżka mutacji `extraCosts` (pracownik zgłasza koszt do akceptacji) — kolizja admin×worker na tym samym rekordzie również podlega whole-array LWW.

---

## 6. Scenariusze (punkt 5 zlecenia)

Założenie bazowe: ten sam pracownik `E` w tym samym tygodniu; `extraCosts` startowo `[]`; brak uprzedniego pull między edycjami (okno kolizji).

### Scenariusz A — A: zmiana godzin · B: premia
- A: `updateWeekEmployeeDay` → `dataUpdatedAt=TA`, `extraCosts=[]`.
- B: `updateWeekEmployeeExtraCosts([premia])` → `dataUpdatedAt=TB`, `days`=stare.
- Merge: `TA>TB` → **premia B ginie**; `TB>TA` → **zmiana godzin A ginie**.
- **Wynik: ❌ Lost Update (jedna z dwóch edycji zawsze ginie).**

### Scenariusz B — A: premia · B: dodatek
- A: `extraCosts=[premia]` (`TA`). B: `extraCosts=[dodatek]` (`TB`).
- Merge whole-array: zwycięzca `dataUpdatedAt` → **tablica przegranego znika w całości**.
- **Wynik: ❌ Lost Update — przetrwa jeden wpis (premia LUB dodatek), nigdy oba.**

### Scenariusz C — A: premia · B: koszt
- Identyczny mechanizm co B (oba to wpisy `EmployeeExtraCost`).
- **Wynik: ❌ Lost Update — premia LUB koszt, nie oba.**

### Scenariusz D — 3 urządzenia (premia / dodatek / koszt równolegle)
- A=[premia](`TA`), B=[dodatek](`TB`), C=[koszt](`TC`).
- Whole-array LWW → konwergencja do tablicy o **najwyższym** `dataUpdatedAt`.
- **Wynik: ❌ Lost Update × 2 — przetrwa 1 z 3 wpisów, dwa giną.**

### Scenariusz E — offline
- Urządzenie offline dodaje premię (`dataUpdatedAt` = czas edycji offline). Online dodaje koszt później (`dataUpdatedAt` nowszy).
- Po reconnect: pull+merge whole-array → nowszy zwycięża.
  - Zwykle **premia offline ginie** (online nowszy). Ale przy skew zegara offline (znacznik „z przyszłości”) → **premia offline nadpisuje** koszt online.
- **Wynik: ❌ Lost Update — nieprzewidywalny (zależny od znaczników klienta, nie od intencji).**

| Scenariusz | Lost Update | Co ginie |
|------------|:-----------:|----------|
| A godziny + premia | ❌ | premia **lub** godziny |
| B premia + dodatek | ❌ | jeden z dwóch wpisów |
| C premia + koszt | ❌ | jeden z dwóch wpisów |
| D 3 urządzenia | ❌❌ | dwa z trzech wpisów |
| E offline | ❌ | nieprzewidywalnie (premia lub koszt) |

---

## 7. Dlaczego obecna architektura NIE jest bezpieczna (obalenie „bezpieczeństwa”)

Rozważono, czy istniejące guardy chronią `extraCosts` — **nie chronią**:

| Guard | Chroni `extraCosts`? | Dlaczego nie |
|-------|:--------------------:|--------------|
| PayrollGuard (shrink >50%) | ❌ | Mierzy `activeDays`/`totalHours` (`payrollMetrics`), **nie `extraCosts`**. Utrata premii nie rusza tych metryk. |
| Edge shrink block | ❌ | Jw. — `weekEmployeesRichness` waży `extraCosts` tylko `+len*3`, a main path i tak force-replace. |
| pull-before-push | ⚠️ częściowo | Pomaga tylko gdy druga zmiana już rozpropagowana **przed** edycją; okno kolizji pozostaje. |
| week-scope S1 / tombstones S2 | ❌ | Dotyczą składu rostera, nie zawartości `extraCosts`. |
| settled LWW S5 | ❌ | Dedykowany wyłącznie `settled`. |
| richness override | ❌ | Adoptuje bogatszą chmurę **całościowo** → może dołożyć/odjąć, ale nadal whole-array, nie union. |

➡️ **Brak jakiegokolwiek mechanizmu, który scala zbiory wpisów `extraCosts` po `id`.** Architektura jest bezpieczna dla pól skalarnych z własnym znacznikiem (`rate`, `settled`) i dla `days` (per-klucz), ale **niebezpieczna dla wektora `extraCosts`**.

---

## 8. DESIGN FREEZE (PROPOZYCJA — NIE zaakceptowana, NIE implementowana)

> **Status:** `DRAFT — WAITING OWNER APPROVAL`. Osobny bundle (One Bundle = One Goal). **Nie** mieszać z S7-5/S7-2. Wymaga **parytetu klient↔Edge** (regresja B6).

### 8.1 Cel
Współbieżna edycja `extraCosts` na wielu urządzeniach **nie może gubić wpisów**: dodania z różnych urządzeń **sumują się** (union po `id`), edycje tego samego wpisu rozstrzyga LWW per-item, usunięcia propagują się (tombstone), a usunięty wpis nie wraca.

### 8.2 Zakres (etapowy)

| ID | Etap | Zmiana | Plik (docelowy IMPLEMENT) | Adresuje |
|----|------|--------|---------------------------|----------|
| **F1-1** | ETAP 1 | **Per-item merge `extraCosts` po `id`** — zamiast whole-array LWW: union zbioru wpisów obu stron po `id`; przy kolizji `id` → LWW po per-item znaczniku (patrz F1-2). Wydzielić czysty helper `mergeExtraCostsById(local, cloud)` reużywany przez klient i Edge (Zero Duplicate Logic, wzorzec `mergeWeekEmployeesList`). | `src/lib/payroll-week-employee-merge.ts` (nowy helper) + `cloud-sync.ts:1290` + Edge `index.tsx:297` | Wektor 1 (§3) |
| **F1-2** | ETAP 1 | **Per-item znacznik `updatedAt` na `EmployeeExtraCost`** — bumpowany przy edycji/dodaniu wpisu; LWW per-item używa go (fallback: `submittedAt`/brak → traktuj jak istniejący). Dekopluje `extraCosts` od wspólnego `dataUpdatedAt` (usuwa Wektor 2). | `app-domain.ts` (typ) + handlery `App.tsx:1402,1535` | Wektor 2 (§3) |
| **F1-3** | ETAP 2 (warunkowy) | **Tombstony usuniętych `extraCosts`** — usunięcie wpisu zapisuje tombstone (per pracownik+id), współdzielony jak `*-deleted-ids`, filtrowany przed union (analogia S2/S7-5). Bez tego union mógłby wskrzeszać usunięty koszt. | `cloud-sync.ts` (deleted-ids) + Edge | resurrection wpisu po union |
| **F1-4** | ETAP 2 (warunkowy) | **Migracja/stabilizacja `id`** — zagwarantować unikalny stabilny `id` dla każdego wpisu (legacy bez `id` → nadanie deterministyczne), by union po `id` był poprawny. | `app-domain.ts` normalizacja | poprawność klucza union |

### 8.3 Reguła merge docelowa (per-item)
```
mergeExtraCostsById(local[], cloud[]):
  index po id; dla wspólnego id → wpis o wyższym updatedAt (remis → local); 
  tylko-local → local; tylko-cloud → cloud;
  (ETAP 2) odfiltruj id ∈ tombstony.
```
`extraCosts` w `mergeWeekEmployeeRecord` przestaje zależeć od `dataUpdatedAt` — używa `mergeExtraCostsById` niezależnie.

### 8.4 Ryzyka
| # | Ryzyko | Mitigacja |
|---|--------|-----------|
| R1 | Zmiana kształtu merge dotyka wrażliwego rdzenia payroll | Czysty helper + testy jednostkowe; brak zmian `settled`/`days`/`rate` |
| R2 | Parytet klient↔Edge (B6) | Wspólny helper importowany po obu stronach (jak `mergeWeekEmployeesList`); test `test-payroll-edge-parity-b6` rozszerzony |
| R3 | Legacy wpisy bez `updatedAt`/`id` | Fallback deterministyczny; F1-4 nadaje `id` |
| R4 | Union bez tombstonów wskrzesza usunięty koszt | F1-3 (ETAP 2) — tombstony |
| R5 | Interakcja z richness (`+len*3`) i shrink guard | Po union długość ≥ max(obu) → nie wyzwala shrink; zweryfikować richness override |
| R6 | Worker×admin (WorkerPhotoView) współbieżnie | Per-item LWW obejmuje też ścieżkę workera |

### 8.5 Wykluczenia (Out of Scope)
- S7-5 resurrection rostera · S7-2 batch-set 500 · zmiana `days`/`zaliczka`/`rate`/`settled` merge · zmiana schematu KV · optimistic-lock/ETag (osobna decyzja, powiązana z LU-3 clock skew).

### 8.6 Plan testów (docelowy)
- **Regresje (PASS):** `test-payroll-edge-parity-b6`, `test-payroll-settled-merge-fix-a`, `test-payroll-extra-cost-etap1`, `test-payroll-extra-cost-amount-rca`, `test-payroll-hours-etap1`, `test-payroll-bootstrap-runtime-parity-b4`.
- **Nowy `test-payroll-extracosts-merge-f1.mjs`:** T1 union dwóch wpisów (A+B) → oba przetrwają; T2 edycja tego samego id → LWW per-item; T3 godziny(A)+premia(B) → oba przetrwają (dekopling); T4 3 urządzenia (premia/dodatek/koszt) → wszystkie 3; T5 offline return → brak utraty; T6 (ETAP 2) usunięcie wpisu nie wraca po union; T7 parytet klient=Edge dla `mergeExtraCostsById`.

### 8.7 Acceptance Criteria (docelowe)
- **AC1** Dodania `extraCosts` z różnych urządzeń **sumują się** (union po `id`), nic nie ginie.
- **AC2** Edycja tego samego wpisu → LWW per-item (`updatedAt`), deterministyczny remis.
- **AC3** Edycja godzin **nie kasuje** `extraCosts` drugiego urządzenia (dekopling od `dataUpdatedAt`).
- **AC4** Parytet klient↔Edge (identyczny wynik `mergeExtraCostsById`).
- **AC5** Regresje S5/B4/B6/hours/extra-cost PASS; brak zmian `settled`/`days`/`rate`.
- **AC6 (ETAP 2)** Usunięty wpis nie wraca (tombstone) — brak resurrection kosztu.
- **AC7** Wpisy legacy bez `id`/`updatedAt` obsłużone (fallback/migracja), brak duplikacji.

---

## 9. Rejestr powiązań

| Ustalenie | Bundle |
|-----------|--------|
| F1 (ten dokument) | **NOWY** — DESIGN FREEZE PROPOZYCJA (WAITING OWNER) |
| LU-3 clock skew / RC-2 optimistic-lock | poza F1 — decyzja architektoniczna (ETag/wersja) |
| F2 resurrection rostera | S7-5 (DESIGN FREEZE APPROVED) |
| F3 batch-set 500 | S7-2 / S7-4A |

---

## 10. Ograniczenia audytu
- Analiza **statyczna**. Realne okno kolizji (throttle 15s, tło, offline, skew) do potwierdzenia repro na urządzeniach (T-1 z certyfikacji).
- DESIGN FREEZE §8 = **propozycja**; wymaga akceptacji właściciela i osobnego cyklu AUDIT→IMPLEMENT (nie w tym zleceniu).

---

*SSOT F1: ten plik. Read-only — bez zmian kodu, bez BUILD, bez COMMIT. Workflow: AUDIT → RAPORT → STOP.*
