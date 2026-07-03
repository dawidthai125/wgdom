# EDGE-OPT-A — `batch-get` → order-preserving batch fetch · DESIGN FREEZE

> **Status:** `DESIGN FREEZE` (do zatwierdzenia OWNER) · **IMPLEMENT = JESZCZE NIE**
> **Data:** 2026-07-03
> **HEAD (SSOT):** `ae132bc` · **Prod:** DEPLOYED (PR-PAY-S7-5 ETAP 1)
> **Tryb dokumentu:** DESIGN FREEZE ONLY — bez implementacji, bez zmian kodu, bez BUILD, bez COMMIT.
> **Powiązane:** audyt Edge-Opt-A (STRUMIEŃ B) · [`PAYROLL-QUALITY-GATE.md`](PAYROLL-QUALITY-GATE.md) · [`PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md`](PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md) (baseline requestów) · RC-1/RC-3 (fan-out batch-get / Edge processing cost)
> **Program:** PAYROLL & SUPABASE RECOVERY. **One Bundle = One Goal.** Bundle rozłączny z S7-5, S7-4B, S7-3.

```text
CEL:        batch-get (N× kv.get = N× SELECT + N× createClient)
            ↓
            order-preserving, null-filling batch fetch (1× SELECT ... IN)
NOŚNIK:     RC-1 (fan-out batch-get) + RC-3 (Edge CPU). ~40 SELECT/wywołanie → 1 SELECT.
INWARIANT:  Kontrakt HTTP i pozycyjne mapowanie klient↔Edge BEZ ZMIAN.
BLOKER:     obecny kv.mget NIE zachowuje kolejności i pomija braki → wymaga naprawy PRZED użyciem.
IMPLEMENT:  JESZCZE NIE. Gate = zamknięcie Production Observation PR-PAY-S7-5 ETAP 1 + OWNER GO.
```

---

## 1. Cel

Zredukować koszt CPU i liczbę zapytań Supabase w ścieżce odczytu Cloud Sync przez zamianę **N indywidualnych `kv.get`** (N zapytań `SELECT ... WHERE key = $1` + N `createClient`) na **jeden order-preserving batch fetch** (`SELECT key, value ... WHERE key IN (...)`), przy **zachowaniu identycznego kontraktu** endpointu `batch-get` i pozycyjnego mapowania po stronie klienta.

**Stan obecny (fakt, HEAD `ae132bc`):**
- `batch-get` (`supabase/functions/make-server-0afb8820/index.tsx:102–106`): `await Promise.all(keys.map((k) => kv.get(k)))`.
- `kv.get` (`kv_store.tsx:33–40`): per klucz nowy `createClient()` + `SELECT value ... eq(key).maybeSingle()`.
- `kv.mget` (`kv_store.tsx:61–68`): jeden `SELECT value ... IN (keys)` — **istnieje, niewykorzystany**, i w obecnej formie **wadliwy** dla tego celu (patrz §3.1).

**Efekt docelowy:** dla bundla ~40 kluczy: **~40 SELECT + ~40 createClient → 1 SELECT** (+1 klient). Przy `batchGet≈101/sesję` (telemetria S7-4A): rząd **~4000 → ~101 SELECT/sesję** dla tej ścieżki.

---

## 2. Zakres (One Bundle = One Goal)

| ID | Zmiana | Plik (docelowy IMPLEMENT) | Adresuje |
|----|--------|---------------------------|----------|
| **A1** | **Helper KV order-preserving batch fetch** — `SELECT key, value ... IN (keys)` → `Map<key,value>` → `keys.map(k => map.get(k) ?? null)`. Spełnia kontrakt §4. Naprawa istniejącego `mget` **lub** nowy `mgetOrdered` (decyzja wg audytu callerów, §3.1). | `supabase/functions/make-server-0afb8820/kv_store.tsx` | RC-1 / RC-3 |
| **A2** | **`batch-get` używa helpera A1** — zamiana `Promise.all(keys.map(kv.get))` na jedno wywołanie A1; zachować walidację wejścia i kształt odpowiedzi `{ values }`. | `supabase/functions/make-server-0afb8820/index.tsx` | RC-1 / RC-3 |
| **T** | **Nowy test** czystej logiki helpera (T-A1…T-A5) + wskazówki integracyjne. | `scripts/test-edge-opt-a-batch-get.mjs` (NOWY) | dowód kontraktu §4 |

**Reuse First / Zero Duplicate Logic:** preferowana **naprawa `mget`** (jeden helper batch-read), o ile audyt potwierdzi brak callera zależnego od obecnej (wadliwej) semantyki. W przeciwnym razie nowy `mgetOrdered`, `mget` bez zmian.

Illustracyjny wzorzec docelowy (SPEC projektowy — **nie** kod do wdrożenia w tym dokumencie):

```ts
export const mgetOrdered = async (keys: string[]): Promise<any[]> => {
  if (keys.length === 0) return [];                    // pusta lista → brak zapytania
  const { data, error } = await client()
    .from("kv_store_0afb8820").select("key, value").in("key", keys);
  if (error) throw new Error(error.message);
  const byKey = new Map((data ?? []).map((r) => [r.key, r.value]));
  return keys.map((k) => byKey.get(k) ?? null);        // kolejność + null-fill + duplikaty
};
```

---

## 3. Zakres wyłączony (Out Of Scope)

| Element | Powód |
|---------|-------|
| `batch-set` | Osobna ścieżka zapisu — nie dotyczy odczytu; ryzyko własne |
| restore (`restore-payroll-backup`, `restore-data-backup`) | Poza celem; nietknięte (w tym S7-5-2 filtr tombstonów) |
| merge / LWW | Logika scalania niezmieniona |
| tombstones (S7-5) | Nietknięte — odczyt tombstonów przechodzi tym samym kontraktem |
| backup / rotacje KV | Poza celem |
| Performance innych modułów (Tender/WM/Inspector/Catalog) | Osobne bundle (RC-4) |
| `client()` singleton (per-get → 1 klient) | **Osobny** krok Edge-Opt / S7-3 — nie mieszać |
| Chunkowanie bardzo dużych list `IN` | Poza celem (realnie ~40 kluczy); zob. §5 R3 jako warunek brzegowy testu |
| Refactory „przy okazji" | Zakazane (One Bundle = One Goal) |

### 3.1 Blokujący defekt obecnego `kv.mget` (rdzeń zakresu A1)

Bezpośrednia podmiana `batch-get` na obecny `mget` jest **NIEDOZWOLONA** — złamałaby kontrakt §4:
1. **Kolejność** — `IN (keys)` zwraca wiersze w kolejności fizycznej Postgresa, nie w kolejności `keys`. Klient czyta pozycyjnie (`fetched[keys.length + N]`) → wartości pod złymi kluczami (**P0 korupcja**).
2. **Braki** — brak wiersza = brak elementu → `values.length < keys.length`, przesunięcie indeksów.
3. **`select("value")` bez `key`** — brak danych do odtworzenia mapowania.

**Wniosek:** rdzeniem A1 jest **order-preserving + null-filling** (SELECT `key, value` + `Map` + `keys.map`), a nie samo „użycie mget".
**Warunek A1:** przed zmianą sygnatury/semantyki `mget` wykonać audyt callerów; brak innego callera potwierdzony → naprawić `mget`; w innym wypadku nowy helper.

---

## 4. Kontrakt helpera (SSOT)

```
INPUT:   keys: string[]
OUTPUT:  values: any[]

WARUNKI (inwarianty — wszystkie MUSZĄ zachodzić):
  1. values.length === keys.length
  2. values[i] odpowiada keys[i] (mapowanie pozycyjne)
  3. null dla klucza nieobecnego w KV
  4. zachowana kolejność wejścia (niezależnie od kolejności zwrotu z DB)
  5. poprawna obsługa duplikatów (keys=[k,k] → [v,v])
  6. keys.length === 0 → zwraca [] BEZ zapytania do bazy
  7. błąd zapytania → rzuca Error(error.message) (jak get/mget dziś)
```

**Kontrakt HTTP `batch-get` (bez zmian):** żądanie `{ keys }` → odpowiedź `{ values }`, `values` pozycyjne wg powyższego. Endpoint, nazwa, kształt JSON — **niezmienione**.

**Zgodność klienta:** `fetchKeysFromCloud` / `computeMergedDataBundle` czytają `fetched[]` pozycyjnie i tolerują `null`/`undefined` przez `normalize*`. Inwarianty 1–4 gwarantują **zerowy** wpływ na klienta.

---

## 5. Plan testów

**Jednostkowe — czysta logika helpera (mock warstwy Supabase):**

| Test | Scenariusz | Oczekiwane (PASS) |
|------|-----------|-------------------|
| **T-A1** | Kolejność: `keys=[k3,k1,k2]`, DB zwraca w innej kolejności | `[v3,v1,v2]` (kolejność wejścia) |
| **T-A2** | Brak klucza: `keys=[k1,kX,k2]`, `kX` nieobecny | `[v1, null, v2]`, `length===3` |
| **T-A3** | Duplikaty: `keys=[k1,k1]` | `[v1,v1]` |
| **T-A4** | Pusta lista: `keys=[]` | `[]`, **zero** zapytań do DB (spy/mock licznik === 0) |
| **T-A5** | Parytet: dla N kluczy `mgetOrdered(keys)` === wynik `keys.map(get)` (golden vs obecna implementacja) | identyczne |

**Integracyjne (staging Edge):**

| Test | Scenariusz | Oczekiwane (PASS) |
|------|-----------|-------------------|
| **T-I1** | Realny `batch-get` pełnego bundla (~40 kluczy) | Odpowiedź identyczna z obecną implementacją (bajt-w-bajt) |
| **T-I2** | Bootstrap + runtime sync (parytet B4) | Bez zmian; `test-payroll-bootstrap-runtime-parity-b4.mjs` PASS |
| **T-I3** | Regresje payroll (S2 / S6 / S7-5) po zmianie odczytu | Wszystkie PASS — dowód, że odczyt tombstonów/rosterów niezmieniony |

**Regresje obowiązkowe (muszą PASS):** `test-payroll-resurrection-guard-s7-5.mjs`, `test-payroll-deletion-tombstones-pr-pay-s2.mjs`, `test-payroll-archive-restore-eligibility-s6.mjs`, `test-payroll-edge-parity-b6.mjs`, `test-payroll-bootstrap-runtime-parity-b4.mjs`, `test-payroll-cloud-sync-frequency-s7-4.mjs`.

**BUILD:** `npm run build` (obowiązkowy w IMPLEMENT, nie teraz).

---

## 6. Rollback

- **Trigger:** rozjazd danych (wartość pod złym kluczem), `values.length != keys.length`, wzrost błędów `batch-get`, lub braki w odpowiedzi.
- **Mechanizm:** zmiana izolowana w `batch-get` + helper KV → **rewert jednego commita** przywraca `Promise.all(keys.map(kv.get))` (znany dobry stan).
- **Bez migracji / bez zmian schematu KV / bez zmian klienta** → rollback natychmiastowy i bezpieczny.
- **Weryfikacja po rollback:** T-I1 + regresje payroll PASS.

---

## 7. Quality Gate

Wg [`PAYROLL-QUALITY-GATE.md`](PAYROLL-QUALITY-GATE.md) — typ zmiany **Edge (`index.tsx`) / transport odczytu** → eskalacja do **L4**.

```
MERGE: Edge-Opt-A batch-get order-preserving · HEAD: <commit> · Typ: Edge (read transport) · Poziom: L4

□ L1 Smoke                     (bootstrap ładuje dane; brak błędów batch-get w konsoli)
□ L2 Regression                (T-A1..T-A5 + T-I2/T-I3 + regresje payroll)
□ L3 Multi Device              (parytet odczytu 2–3 dev; brak rozjazdu wartości)
□ VERIFY CLEAN                 (bundle po sync == baseline; brak przesunięć klucz↔wartość)
□ No New Bugs                  (0 P0/P1; szczególnie: brak korupcji mapowania)
□ Known Bugs unchanged         (F1/H1 bez zmian)
□ Production Observation (L4)   (Supabase: spadek SELECT/CPU; brak nowych błędów; requesty nie gorsze)
```

**BLOCKED jeśli:** T-A1/T-A2/T-A5 FAIL (kolejność/null/parytet), T-I1 różny od obecnego, VERIFY CLEAN FAIL, jakakolwiek korupcja mapowania (nowy P0).

---

## 8. Acceptance Criteria

| # | Kryterium |
|---|-----------|
| **AC1** | `batch-get` zwraca `values` o długości **równej** `keys.length` dla dowolnego wejścia |
| **AC2** | `values[i]` odpowiada `keys[i]` **niezależnie** od kolejności zwrotu z bazy (kolejność zachowana) |
| **AC3** | Klucz nieobecny w KV → `null` na odpowiedniej pozycji (nie pominięty, nie przesunięty) |
| **AC4** | Duplikaty w `keys` obsłużone poprawnie (`[k,k] → [v,v]`) |
| **AC5** | `keys=[]` → `[]` i **zero** zapytań do bazy |
| **AC6** | Kontrakt HTTP `batch-get` (`{keys}`→`{values}`) i pozycyjne mapowanie klienta **bez zmian** — zero zmian po stronie klienta |
| **AC7** | `batch-get` pełnego bundla wykonuje **1** zapytanie `SELECT ... IN` zamiast N (dowód: staging/logs) |
| **AC8** | Regresje payroll (S2/S6/S7-5/B4/B6/frequency) **PASS**; brak nowych kluczy/schematu KV |
| **AC9** | Production Observation: liczba SELECT / CPU Supabase dla ścieżki odczytu **nie gorsza** (oczekiwany spadek); brak nowych błędów `batch-get`; brak HTTP 500 |

---

## 9. Ryzyka

| # | Ryzyko | Poziom | Mitigacja |
|---|--------|--------|-----------|
| R1 | Rozjazd kolejności/`null` → korupcja mapowania | **KRYTYCZNE** | Wzorzec `Map` + `keys.map` (§2); T-A1/T-A2/T-A5 |
| R2 | Duplikaty kluczy | Średnie | `keys.map(byKey.get)` (§2); T-A3 |
| R3 | Limit rozmiaru `IN (...)` przy bardzo dużych listach | Niskie (~40 real) | Warunek brzegowy testu; ewentualne chunkowanie = osobny krok (Out Of Scope) |
| R4 | Inny caller `mget` zależny od starej semantyki | Średnie | Audyt callerów przed zmianą; jeśli istnieje → nowy `mgetOrdered`, `mget` nietknięty |
| R5 | `undefined` (get) vs `null` (helper) po stronie klienta | Niskie | `?? null`; `normalize*` traktuje oba tak samo; T-A5 golden |

---

## 10. Lista plików (docelowy IMPLEMENT)

| Plik | Zakres |
|------|--------|
| `supabase/functions/make-server-0afb8820/kv_store.tsx` | A1 — helper order-preserving (naprawa `mget` lub `mgetOrdered`) |
| `supabase/functions/make-server-0afb8820/index.tsx` | A2 — `batch-get` używa A1 |
| `scripts/test-edge-opt-a-batch-get.mjs` (NOWY) | T-A1…T-A5 |
| `docs/EDGE-OPT-A-…-DESIGN-FREEZE.md` (ten plik) | dokumentacja |

**Bez zmian:** klient (`cloud-sync.ts`), schemat KV, `batch-set`, restore, merge/LWW, tombstones, backup.

---

## 11. GO / NO-GO

| Etap | Status |
|------|--------|
| **AUDIT (Edge-Opt-A)** | **ZAAKCEPTOWANY** |
| **DESIGN FREEZE (ten dokument)** | **DO ZATWIERDZENIA OWNER** |
| **GATE — Production Observation PR-PAY-S7-5 ETAP 1** | **W TOKU** — zakończyć przed IMPLEMENT |
| **IMPLEMENT** | **JESZCZE NIE** — po zamknięciu obserwacji S7-5 + OWNER GO |
| **BUILD / TEST / COMMIT** | **NO GO teraz** (DESIGN FREEZE ONLY) |

---

*SSOT design freeze Edge-Opt-A: ten plik · bez zmian kodu · dokument projektowy. IMPLEMENT dopiero po OWNER GO.*
