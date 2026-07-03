# PAYROLL — PR-PAY-S7 · S7-5 · Resurrection Guard · DESIGN FREEZE

> **Status:** `DESIGN FREEZE ZAAKCEPTOWANY` · **IMPLEMENT = JESZCZE NIE** (gate: zakończenie Production Observation S7-4A) · rollout **etapowy**
> **Data:** 2026-07-03
> **Baseline prod:** **GREEN** · **HEAD `12b09d8`**
> **P0 FREEZE:** ACTIVE (żadnych nowych EPIC do zamknięcia incydentu)
> **Powiązane:** [`PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md`](PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md) (H-R1…H-R3, EV8/EV9) · [`PAYROLL-PR-PAY-S7-4-CLOUD-SYNC-OPTIMIZATION-DESIGN-FREEZE.md`](PAYROLL-PR-PAY-S7-4-CLOUD-SYNC-OPTIMIZATION-DESIGN-FREEZE.md) (S7-4A — OBSERVATION, gate) · PR-PAY-S2 (Deletion Tombstones) · PR-PAY-S6 (Archive Restore Eligibility, `d2a3d90`)

> **⚠ Plan wykonania (OWNER, 2026-07-03):** DESIGN FREEZE **ZAAKCEPTOWANY**, ale **IMPLEMENT JESZCZE NIE**.
> **(1)** Najpierw zakończyć **Production Observation dla S7-4A**. **(2)** Potem **ETAP 1** = **S7-5-1 + S7-5-2** (BUILD + TEST). **(3)** Po ETAPIE 1 — **ponowna obserwacja produkcji**. **(4)** Dopiero wtedy ocenić potrzebę **S7-5-3** (`replaceWeekEmployeesKeys`) i **S7-5-4** (stabilizacja merge-key). Patrz §8.

```text
CEL:           Usunięty pracownik tygodnia NIE może wrócić na żadnym urządzeniu.
ROOT CAUSE:    Tombstone kasowania (kw-week-employees-deleted-ids) jest wyłącznie LOKALNY —
               nigdy nie trafia do chmury ani nie jest pobierany. Chmura nie ma semantyki
               usunięcia (tylko nieobecność), a merge klienta i Edge to UNION. Kasowanie
               nie propaguje się między urządzeniami → urządzenie z rekordem re-dostarcza
               go do chmury → resurrection wszędzie, gdzie tombstone nie pasuje.
H-R2:          CONFIRMED (statycznie) — brak współdzielenia tombstonów.
H-R1/H-R3:     HIGH/MEDIUM — Edge UNION + brak uniwersalnego force-replace.
H-R-KEY:       MEDIUM→HIGH — niestabilny merge-key (dir/name/id) omija lokalny filtr.
IMPLEMENT:     JESZCZE NIE. Gate = zakończenie Production Observation S7-4A.
ROLLOUT:       ETAP 1 = S7-5-1 + S7-5-2 → BUILD + TEST → ponowna obserwacja
               → dopiero potem ocena S7-5-3 i S7-5-4.
```

---

## 1. Kontekst i Root Cause (skrót z audytu uzupełniającego)

Dowód produkcyjny: Urządzenie A (Owner) = 10 pracowników (Mikołaj/Tomek **brak**), Urządzenie B (Stanisław) = 12 (Mikołaj/Tomek **obecni**). Na B usunięcie ich → znikają → **po chwili wracają**; `Ctrl+Shift+R` nie pomaga (sygnatura źródła serwerowego/cross-device, nie lokalnego cache).

Mechanizm (potwierdzony statycznie):
1. Usunięcie zapisuje **tylko lokalny tombstone** `kw-week-employees-deleted-ids` (`App.tsx:1350–1362` → `addDeletedWeekEmployeeKey`). Klucz ten **nie występuje w żadnej liście push/pull** (`cloud-sync.ts:519–524` — tylko getter/setter).
2. Chmura reprezentuje usunięcie **wyłącznie jako nieobecność** w `kw-week-employees`.
3. Merge klienta (`mergeWeekEmployeesForWeekRange` → `mergeWeekEmployees`, `cloud-sync.ts:1636–1654`) filtruje **tylko po lokalnych** tombstonach, poza tym robi **UNION**.
4. Edge robi `mergeWeekEmployeesUnion(prev,next)` przy shrink/roster-expansion **jeśli brak** `replaceWeekEmployeesKeys` (`index.tsx:637–649`).
5. `weekEmployeeMergeKey` jest niestabilny między urządzeniami (`dir:` → `name:` → `id:`, `payroll-week-employee-merge.ts:17–23`) — lokalny tombstone potrafi nie trafić w wracającą kopię.

Efekt: A (ma tombstony) filtruje → 10; B (nie ma) UNION re-dodaje → 12; chmura oscyluje; brak konwergencji.

---

## 2. Zakres (One Bundle = One Goal)

> Cel bundla: **propagacja usunięcia pracownika tygodnia między urządzeniami** + domknięcie ścieżek, które re-dodają rekord. Nic poza tym.

| ID | Etap | Zmiana | Plik (docelowy IMPLEMENT) | Adresuje |
|----|------|--------|---------------------------|----------|
| **S7-5-1** | **ETAP 1** | **Synchronizacja `kw-week-employees-deleted-ids` (push + pull + merge + save)** — dołożyć klucz do `pushMergedDataBundleToCloud` (klucz + wartość `getDeletedWeekEmployeeKeys()`) oraz do listy fetch w `computeMergedDataBundle`; scalić `mergeDeletedWeekEmployeeKeys(local, cloud)` i `saveDeletedWeekEmployeeKeys(merged)` **PRZED** `finalizePayrollBundleMerge` (żeby cross-device tombstony zadziałały w merge tego samego cyklu) | `src/lib/cloud-sync.ts` | H-R2 |
| **S7-5-2** | **ETAP 1** | **Edge tombstone-aware PRZED UNION** — `batch-set` przyjmuje tombstony week-employees (z pushowanego `kw-week-employees-deleted-ids`); przed `mergeWeekEmployeesUnion` odfiltrować z `prev` (i `next`) rekordy, których `weekEmployeeMergeKey` ∈ tombstony danego tygodnia; to samo w `restore-*`/backup-merge ścieżkach Edge używających union | `supabase/functions/make-server-0afb8820/index.tsx` | H-R1 |
| **S7-5-3** | **ETAP 2 (warunkowy)** | **`replaceWeekEmployeesKeys` na WSZYSTKICH ścieżkach push week-employees** — ustawić flagę w `pushKeysToCloudSafe` (gdy `keys` zawiera `kw-week-employees`) i w każdej innej ścieżce pushującej ten klucz; audytowe potwierdzenie, że tylko intencjonalny clear/rollover korzysta z braku force-replace | `src/lib/cloud-sync.ts` | H-R3 |
| **S7-5-4** | **ETAP 2 (warunkowy)** | **Stabilizacja merge-key (directoryId)** — zagwarantować, że `weekEmployeeFromDir` zawsze nadaje `directoryId`; przy tombstonowaniu zapisać identyfikator zgodny z `weekEmployeeMergeKey` używanym przy filtrze; opcjonalny fallback: tombstone po **wszystkich** dostępnych kluczach rekordu (dir + name) aby wracająca kopia z inną tożsamością też trafiała w filtr | `src/lib/payroll-week-employee-merge.ts` + `src/lib/cloud-sync.ts` | H-R-KEY |

> **Etapowanie (OWNER):** **ETAP 1 = S7-5-1 + S7-5-2** (jeden bundle → BUILD → TEST → **ponowna obserwacja produkcji**). **ETAP 2 (S7-5-3, S7-5-4) jest WARUNKOWY** — wdrażać **tylko jeśli** po obserwacji ETAP 1 resurrection nadal występuje (dowód: rekord wraca mimo współdzielonych tombstonów → wskazuje na push bez force-replace [S7-5-3] lub niedopasowany merge-key [S7-5-4]). Jeśli AC8/AC9/AC10/AC11 spełnione po ETAPIE 1 → ETAP 2 **NIE wymagany** (unikamy zmian o wyższym ryzyku R4/R5).

**Reuse First:** S7-5-1 kopiuje **1:1** istniejący wzorzec deleted-ids (jobs/directory/contacts/archive/leaves/charges/op-notes/EM — `cloud-sync.ts:2505–2596`). Istnieje już `mergeDeletedWeekEmployeeKeys` (`cloud-sync.ts:527`), `normalizeDeletedWeekEmployeeKeys`, `get/saveDeletedWeekEmployeeKeys` — **Zero Duplicate Logic**.

---

## 3. Lista plików (docelowy IMPLEMENT)

| Plik | Zakres zmiany |
|------|---------------|
| `src/lib/cloud-sync.ts` | S7-5-1 (push+pull+merge+save tombstonów week-employees), S7-5-3 (force-replace na `pushKeysToCloudSafe` i innych), S7-5-4 (spójność klucza tombstona) |
| `supabase/functions/make-server-0afb8820/index.tsx` | S7-5-2 (Edge filtruje tombstony przed UNION; przyjęcie klucza tombstonów w `batch-set`) |
| `src/lib/payroll-week-employee-merge.ts` | S7-5-4 (gwarancja `directoryId` / spójność `weekEmployeeMergeKey`) |
| `scripts/test-payroll-resurrection-guard-s7-5.mjs` (NOWY) | Testy jednostkowe czystej logiki (patrz §6) |
| `docs/…S7-5…DESIGN-FREEZE.md` (ten plik) | dokumentacja |

**Bez zmian schematu KV.** Klucz `kw-week-employees-deleted-ids` istnieje już w localStorage; w chmurze to zwykły wpis KV (jak pozostałe `*-deleted-ids`).

---

## 4. Ryzyka

| # | Ryzyko | Mitigacja |
|---|--------|-----------|
| R1 | **Rozmiar batch-set rośnie** o kolejny klucz → dokłada się do problemu 500 (H1/S7-2) | Klucz mały (lista stringów, `slice(-500)`); nie łączyć z S7-2 (osobny bundle). Monitorować payload w OBSERVATION |
| R2 | **Tombstone „zabija" legalnego pracownika** o tym samym `name:`/`dir:` w innym tygodniu | Tombstony są **week-scoped** (prefix `${weekFrom}|${weekTo}::`), filtr `deletedWeekEmployeeMergeKeySet` zdejmuje prefix per tydzień — bez zmian |
| R3 | **Edge filtr przed UNION** może usunąć rekord, który miał wrócić z uzasadnionego powodu (recovery) | Filtr **tylko** po jawnie przekazanych tombstonach danego pushu; brak tombstonów = zachowanie jak dziś |
| R4 | **`replaceWeekEmployeesKeys` wszędzie** może nadpisać bogatszy stan chmury przy równoległym zapisie z 2 urządzeń | LWW `settledUpdatedAt` (`preserveSettledLwwFromLocal`) i week-scope bez zmian; force-replace dotyczy wyłącznie składu, nie statusów |
| R5 | **S7-5-4 (directoryId)** — zmiana identyfikacji może wpłynąć na dedupe/collapse | Trzymać jako **osobny, opcjonalny** pod-krok; jeśli podnosi ryzyko, wdrożyć S7-5-1..3 najpierw, S7-5-4 po dowodzie H-R-KEY |
| R6 | **Migracja historyczna** — stare urządzenia z rozbieżnymi rosterami | Po wdrożeniu pierwszy sync scala tombstony obu stron (union deleted-ids) → konwergencja w 1 cyklu (AC9) |

---

## 5. Wykluczenia (Out Of Scope)

| Element | Powód |
|---------|-------|
| S7-2 Cloud Batch Hardening (chunk/izolacja `kv.mset`) | Osobny bundle — problem **500**, nie resurrection |
| S7-3 (singleton klienta Supabase) | Osobny bundle |
| S7-4A Cloud Sync Optimization | Wdrożone — w OBSERVATION; nie ruszać |
| Zmiana LWW `settledUpdatedAt` / statusów rozliczenia | Poza celem; S7-5 dotyczy wyłącznie składu i tombstonów |
| Zmiana schematu KV / migracja tabeli | Ryzyko migracyjne — osobna decyzja |
| Zmiana kolejności pull/push w `runCloudSync` | Należy do S7-4 |
| PR-PAY-S6 (Archive Restore Eligibility) | CLOSED (`d2a3d90`) — niezależne |
| Refactory „przy okazji" | Zakazane (One Bundle = One Goal) |

---

## 6. Plan testów

**Regresje obowiązkowe (muszą PASS):**
- `test-payroll-deletion-tombstones-pr-pay-s2.mjs`
- `test-payroll-archive-restore-eligibility-s6.mjs`
- `test-payroll-restore-banner-false-positive.mjs`
- `test-payroll-edge-parity-b6.mjs`
- `test-payroll-bootstrap-runtime-parity-b4.mjs`
- `test-payroll-settled-merge-fix-a.mjs`
- `test-payroll-cloud-sync-frequency-s7-4.mjs`

**Nowy test `test-payroll-resurrection-guard-s7-5.mjs` (czysta logika, bez sieci):**
- **T1** — push bundla zawiera `kw-week-employees-deleted-ids` z niepustą listą tombstonów (S7-5-1).
- **T2** — pull scala tombstony chmury z lokalnymi (`mergeDeletedWeekEmployeeKeys`) i zapisuje **przed** merge składu (S7-5-1).
- **T3** — mając cross-device tombstone (z chmury), `mergeWeekEmployeesForWeekRange(local z rekordem, cloud z rekordem)` **usuwa** rekord (nie UNION-uje z powrotem).
- **T4** — Edge (symulacja): `batch-set` z tombstonami odfiltrowuje rekord z `prev` **przed** `mergeWeekEmployeesUnion` → rekord nie wraca nawet przy roster-expansion (S7-5-2).
- **T5** — `pushKeysToCloudSafe(["kw-week-employees", …])` ustawia `replaceWeekEmployeesKeys` (S7-5-3).
- **T6** — merge-key: rekord z `directoryId` i jego kopia bez `directoryId` (ten sam człowiek) → tombstone po dir **i** name trafia w obie (S7-5-4).
- **T7 (konwergencja 2 urz. / AC9)** — symulacja A=10 (tombstony M+T), B=12 (bez) → po współdzieleniu tombstonów: A=10, B=10, cloud=10.
- **T8 (offline return / AC10)** — urządzenie C offline z rosterem 12 (bez tombstonów) wraca online; chmura ma tombstony M+T; pull scala tombstony i C nie re-pushuje usuniętych → C=10.
- **T9 (konwergencja 3 urz. / AC11)** — A/B/C z rozbieżnymi rosterami i tombstonem ustawionym na jednym z nich → po pełnym cyklu wszystkie = ten sam roster (= chmura).

> **Zakres testów dla ETAP 1 (S7-5-1 + S7-5-2):** T1–T4, T7, T8, T9 muszą PASS (AC1–AC3, AC8, AC9, AC10, AC11). T5/T6 wchodzą dopiero z ETAP 2 (S7-5-3/S7-5-4), jeśli zostanie uruchomiony.

**BUILD:** `npm run build` (obowiązkowo w IMPLEMENT ETAP 1, nie teraz).

---

## 7. Acceptance Criteria

| # | Kryterium |
|---|-----------|
| **AC1** | `kw-week-employees-deleted-ids` jest **pushowany** i **pobierany** oraz scalany (union) między urządzeniami |
| **AC2** | Tombstone pozostaje **week-scoped** — nie usuwa pracownika o tym samym kluczu w innym tygodniu |
| **AC3** | Edge **nie re-dodaje** (UNION) rekordu obecnego w tombstonach przekazanych w pushu |
| **AC4** | Każda ścieżka pushująca `kw-week-employees` ustawia `replaceWeekEmployeesKeys` (poza intencjonalnym clear/rollover) |
| **AC5** | Regresje S2/S6/B4/B6/settled/frequency **PASS**; brak nowych kluczy KV poza już istniejącym tombstonem |
| **AC6** | LWW `settledUpdatedAt` i week-scope **bez zmian** (status rozliczenia nienaruszony) |
| **AC7** | Baner „utrata danych" (PR-PAY-S6 AC7) nadal działa dla rzeczywistej, nietombstonowanej utraty |
| **AC8** | **Usunięty pracownik NIE może wrócić na żadnym urządzeniu** (po skasowaniu na dowolnym urządzeniu i pełnym cyklu sync znika u wszystkich) |
| **AC9** | **Konwergencja 2 urządzeń:** stan A=10 / B=12 → po sync → **A=10, B=10, Cloud=10** (tombstony M+T współdzielone, UNION nie re-dodaje) |
| **AC10** | **Urządzenie offline po powrocie NIE odtwarza usuniętych** — urządzenie z zaległym (starym) rosterem po odzyskaniu połączenia scala **współdzielone tombstony** (pull) **przed/wraz z** merge składu i **nie re-pushuje** usuniętych; po sync jego roster = roster chmury bez tombstonowanych |
| **AC11** | **Konwergencja 3 urządzeń (A, B, C):** dowolny podzbiór z rozbieżnymi rosterami/tombstonami → po pełnym cyklu sync **wszystkie trzy mają identyczny roster** (= chmura), a każdy tombstone ustawiony na którymkolwiek urządzeniu obowiązuje na pozostałych |

### 7.1 Backlog AC (poza ETAP 1 — do oceny po obserwacji)

| # | Kryterium | Uwaga |
|---|-----------|-------|
| **AC12** | **DELETE wygrywa z równoczesną edycją** — jeśli jedno urządzenie usuwa pracownika, a inne równolegle go edytuje (np. godziny/stawka), po sync rekord pozostaje **usunięty** (tombstone ma pierwszeństwo nad UNION/LWW pola) | Wymaga potwierdzenia, że tombstone jest stosowany **po** LWW pól; potencjalnie dotyka `preserveSettledLwwFromLocal`/merge — oceniić przy ETAP 2 |
| **AC13** | **Tombstone przetrwa restart aplikacji** — po zamknięciu/otwarciu aplikacji (i po `Ctrl+Shift+R`) lokalne tombstony pozostają (localStorage) i nadal filtrują; brak resurrection po restarcie | Weryfikacja trwałości `kw-week-employees-deleted-ids` w localStorage + ponowne zastosowanie przy bootstrapie |

> **AC12/AC13 = BACKLOG.** Nie są warunkiem zamknięcia ETAP 1 (AC1–AC3, AC8–AC11). Ocena po ponownej obserwacji produkcji — mogą wejść do ETAP 2 lub osobnego bundla, jeśli obserwacja wykaże taką potrzebę.

---

## 8. GO / NO-GO

| Etap | Status |
|------|--------|
| **AUDIT (uzupełniający resurrection)** | **ZAAKCEPTOWANY** |
| **DESIGN FREEZE (ten dokument)** | **ZAAKCEPTOWANY** |
| **GATE — Production Observation S7-4A** | **W TOKU** — musi się zakończyć **przed** ETAP 1 |
| **IMPLEMENT ETAP 1 (S7-5-1 + S7-5-2)** | **JESZCZE NIE** — start po zamknięciu obserwacji S7-4A + OWNER COMMAND |
| **IMPLEMENT ETAP 2 (S7-5-3, S7-5-4)** | **WARUNKOWY** — tylko jeśli po obserwacji ETAP 1 resurrection nadal występuje |
| **BUILD / TEST** | **NO GO teraz** (DESIGN FREEZE ONLY) |

### Plan wykonania (etapowy)

1. **GATE:** zakończyć **Production Observation dla S7-4A** (metryki `batchGet/batchSet/pushSkipped`, brak 500). Dopóki trwa — **IMPLEMENT NO GO**.
2. **ETAP 1** (jeden bundle, One Bundle = One Goal): **S7-5-1** (współdzielenie tombstonów: push+pull+merge+save) → **S7-5-2** (Edge tombstone-aware przed UNION) → **BUILD** → **TEST** (T1–T4, T7–T9 + regresje) → COMMIT → PUSH → VERIFY.
3. **PONOWNA OBSERWACJA PRODUKCJI** po ETAPIE 1 — weryfikacja AC8/AC9/AC10/AC11 na realnych urządzeniach.
4. **OCENA ETAP 2:** dopiero po obserwacji zdecydować o **S7-5-3** (`replaceWeekEmployeesKeys` uniwersalnie) i **S7-5-4** (stabilizacja merge-key). Jeśli AC spełnione po ETAPIE 1 → ETAP 2 **NIE wdrażać** (mniejsze ryzyko R4/R5).

> **Uwaga względem H1/500:** S7-5 adresuje **resurrection**, nie HTTP 500. Kolejność względem S7-2 (zależnego od potwierdzenia H1) ustala OWNER; bundle są rozłączne.

---

*SSOT design freeze PR-PAY-S7-5: ten plik · bez zmian kodu · commit wyłącznie dokumentacyjny.*
