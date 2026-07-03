# EDGE-OPT-B — MASTER AUDIT (konsolidacja)

> **Typ:** AUDIT (konsolidacja) · **NIE Design Freeze** · **NIE implementacja**
> **Data:** 2026-07-04
> **Prod HEAD (SSOT):** `609ae53` · **Faza programu:** PRODUCTION OBSERVATION (Performance OPEN)
> **Scope:** Edge `batch-set` — `saveDailyFullBackup`, `rotateKvBackups`, `rotateJobsBackups`, `kv.get(prev)`, `kv.mset`.
> **Źródła:** POST-DEPLOY CPU BASELINE REPORT + EDGE-OPT-B DEPENDENCY REPORT (obie AUDIT ONLY).
> **Zasada danych:** fakty = zweryfikowane z kodu (podane linie). Udziały CPU = **SZACUNKI NIEZWERYFIKOWANE** (brak telemetrii; Performance Observation OPEN) — oznaczone `[EST]`.

Plik(i) referencyjne: `supabase/functions/make-server-0afb8820/index.tsx`, `kv_store.tsx`, `kv-batch-order.ts`.

---

## 1. Architecture overview

`batch-set` (`index.tsx:617–772`) to endpoint zapisu całego bundla danych aplikacji do KV (`kv_store_0afb8820`, JSONB). Na jedno wywołanie wykonuje: (a) walidację/koercję wartości, (b) odczyty stanu poprzedniego (`kv.get(prev)`) + guardy anty-shrink/expansion + tombstony (S7-5-2), (c) rotację kopii zapasowych per klucz domenowy, (d) jeden `kv.mset` pełnego bundla, (e) `saveDailyFullBackup` (pełny snapshot dnia „richness-max").

Charakterystyka kosztu (fakt z kodu): **fan-out pojedynczych operacji KV** (każde `kv.get`/`kv.set` = osobny round-trip + osobny `createClient()`) + **podwójna (de)serializacja pełnego bundla** (`kv.mset` ~391KB oraz `saveDailyFullBackup` read+write). Client↔Edge parity: batch-set jest Edge-only; kontrakt HTTP/klient nietknięty (jak Edge-Opt-A).

Diagnostyka S7-1 obecna: `try/catch` + `requestId` + log `error.message`/`stack` + `{ok:false,error,requestId}` na 500 (`index.tsx:620,764–770`).

---

## 2. Complete call graph (zweryfikowany z kodu)

```
POST /make-server-0afb8820/batch-set                              (index.tsx:617)
├─ coerceKvValue(keys[i], values[i]) → safeValues                 (623, 604)
├─ kv.get("kw-jobs-deleted-ids")                                  (628)
├─ kv.get("kw-directory-deleted-ids")                             (632)
├─ kv.get("kw-employee-leaves-deleted-ids")                       (636)
├─ kv.get("kw-week-employees-deleted-ids")            [S7-5-2]    (641)
├─ (opc.) kv.get("kw-weekFrom") / kv.get("kw-weekTo")            (645–646)
│         tylko jeśli klucze poza batchem
├─ weekEmployeeTombstoneKeySetForWeek(...)            [S7-5-2]    (647)
├─ for key in keys:                                               (653)
│  ├─ *-deleted-ids  → safeValues[i] = union.slice(-500)          (654–661)   [bez I/O]
│  ├─ kw-jobs        → kv.get("kw-jobs")                          (663)
│  │                   └─ rotateJobsBackups(prev)                 (666 → 551)
│  │                      ├─ kv.get("kw-jobs-prev")               (552)
│  │                      ├─ kv.set("kw-jobs-prev2")  [warunk.]   (553)
│  │                      ├─ kv.set("kw-jobs-prev")               (554)
│  │                      └─ kv.set(`kw-jobs-day-${day}`)         (556)
│  ├─ kw-week-employees → kv.get + rotateKvBackups("kw-week-employees") (679,683→543)
│  ├─ kw-archive        → kv.get + rotateKvBackups("kw-archive")  (704,707)
│  ├─ kw-directory      → kv.get + rotateKvBackups("kw-directory")(716,719)
│  ├─ kw-contacts       → protectArrayKey (732→559)
│  │                      └─ kv.get + rotateKvBackups("kw-contacts")
│  └─ kw-employee-leaves→ kv.get + (opc.) kv.get("kw-archive")    (739,745)
│                         + rotateKvBackups("kw-employee-leaves") (752)
├─ kv.mset(keys, safeValues)                                      (757)
└─ saveDailyFullBackup(keys, safeValues)   [try/catch]            (759 → 578)
   ├─ kv.get(`kw-full-day-${day}`)                                (587)
   ├─ score(bundle) / score(existingBundle)   [O(rekordy)]        (588–599, recordRichness)
   └─ kv.set(`kw-full-day-${day}`)  [warunk.: score(new)>=score(old)] (599–601)

rotateKvBackups(base)                                             (543):
   kv.get(base) → if null return
   kv.get(`${base}-prev`) → if !null: kv.set(`${base}-prev2`)
   kv.set(`${base}-prev`)
```

**Zweryfikowana liczba operacji** (pełny bundle ~40 kluczy, wszystkie domeny obecne): ~**24 `kv.get` + ~14 `kv.set` + 1 `kv.mset` + ~37 `createClient()`**.

---

## 3. Execution order (zweryfikowana)

1. Parse body + `coerceKvValue` → `safeValues` (materializacja bundla w pamięci).
2. Pre-loop reads: 4× `kv.get` deleted-ids + (opc.) weekFrom/To + `weekEmpTombstoned`.
3. For-loop (kolejność = kolejność `keys` w żądaniu): per klucz domenowy **`kv.get(prev)` → `rotate*` → guard/merge → `safeValues[i]`**; `*-deleted-ids` bez I/O.
4. `kv.mset(keys, safeValues)` — jeden upsert **PO** wszystkich guardach/rotacjach.
5. `saveDailyFullBackup(keys, safeValues)` — **PO** `mset`, w `try/catch` (błąd nie wywraca batch-set).
6. `return {ok:true}`.

**Inwariant (krytyczny, zweryfikowany):** `kv.get(prev)` i `rotate*` czytają stan **sprzed** nadpisania → muszą wyprzedzać `kv.mset`. `saveDailyFullBackup` operuje na `safeValues` (nie na KV) — wejście niezależne od `mset`, porządkowo po nim.

---

## 4. Data dependencies (zweryfikowane)

| Element | Zależy od | Produkuje |
|---|---|---|
| `kv.get(prev)` per klucz | bieżący stan KV klucza | wejście guardów + `rotate*` |
| `rotateKvBackups(base)` | `base`, `${base}-prev` (stan sprzed) | `${base}-prev`, `${base}-prev2` |
| `rotateJobsBackups(prev)` | `kw-jobs-prev` + przekazany `prev` | `kw-jobs-prev`, `kw-jobs-prev2`, `kw-jobs-day-${day}` |
| guard `kw-jobs` | `allDeletedIds` (stored+batch) + prev | `safeValues[jobs]` |
| guard `kw-week-employees` | `weekEmpTombstoned` (weekFrom/To + tombstony) + prev [S7-5-2] | `safeValues[we]` |
| guard `kw-employee-leaves` | `kw-archive` (batch lub KV) | `safeValues[leaves]` |
| `kv.mset` | wszystkie `safeValues` (post-guard) | zapis bundla (~391KB) |
| `saveDailyFullBackup` | `safeValues` + `kw-full-day-${day}` (porównanie richness) | `kw-full-day-${day}` (warunkowo) |

**Sprzężenia dla Edge-Opt-B:** (a) batchowanie prev-reads (mget) wymaga zebrania prev **przed** pętlą i **przed** `rotate*` (rotate też czyta te klucze); (b) `saveDailyFullBackup` — jedyny element czytający/piszący **cały** bundle 2×, izolowany od guardów.

---

## 5. Restore dependencies (zweryfikowane)

| Klucz backupu (producent) | Konsument |
|---|---|
| `${base}-prev`, `${base}-prev2` (`rotateKvBackups`: week-employees/archive/directory/contacts/leaves) | `restore-payroll-backup` (812–834) · `restore-data-backup` (914–919) |
| `kw-jobs-prev`, `kw-jobs-prev2`, `kw-jobs-day-${day}` (`rotateJobsBackups`) | `restore-jobs-backup` (805–809) · `restore-data-backup` (915–917) · `jobs-backup-status` |
| `kw-full-day-${day}` (`saveDailyFullBackup`) | `restore-data-backup` source `"today"` (909–912) · `data-backup-status` (885) |

**Twarda granica:** kształt i nazwy kluczy `-prev`/`-prev2`/`-day`/`kw-full-day-*` oraz semantyka „richness-max" (`score(new) >= score(existing)`) są kontraktem 3 ścieżek restore + 2 status-endpointów. **Nie zmieniać.**

---

## 6. Rollback strategy

- **Izolacja:** logika w `batch-set` + 3 funkcjach pomocniczych → **rewert jednego commita** przywraca stan. Brak zmian schematu KV, brak migracji.
- **Additywność backupów:** klucze backupu są dopisywane, nie usuwane → stan pośredni (np. rzadszy `saveDailyFullBackup` po B1) **nie korumpuje** restore; starszy snapshot pozostaje ważny.
- **Warunek bezpieczeństwa:** nie zmieniać kształtu/nazw kluczy backupu ani reguły „richness-max".
- **Ryzyko resztkowe:** błędny warunek „rotuj gdy zmiana" (B2) → `-prev` starszy niż oczekiwano = **degradacja jakości backupu**, nie utrata danych bieżących.
- **Weryfikacja po rollbacku:** regresje `restore-jobs/payroll/data-backup` + parytet S7-5-2.

---

## 7. Performance hotspots

**Fakty (zweryfikowane z kodu):**
- `saveDailyFullBackup` czyta i (warunkowo) zapisuje **cały** bundle (~391KB) + scoring `O(wszystkie rekordy)` **na każdym** `batch-set` (brak bramkowania).
- `rotate*` kopiują duże tablice domenowe do `-prev/-prev2/-day` (get+set per kopia) per klucz.
- ~24 `kv.get` + ~14 `kv.set` = fan-out pojedynczych round-tripów; ~37 `createClient()`.
- `kv.mset` zapisuje pełny bundle (brak delta).

**Szacowany udział CPU `[EST — NIEZWERYFIKOWANE]`** (batch-set = 100%):

| Kontrybutor | `[EST]` udział |
|---|:---:|
| `saveDailyFullBackup` (bundle ×2 + scoring) | ~30–45% |
| Backup rotation (`rotateKvBackups`/`rotateJobsBackups`) | ~20–30% |
| `kv.get(prev)` fan-out + `createClient` | ~10–20% |
| `kv.mset` serializacja (~391KB) | ~10–20% |
| Merge/richness compute | ~5–10% |

> Liczby `[EST]` wymagają potwierdzenia telemetrią (`pg_stat_statements`, CPU dashboard, Edge duration) — Performance Observation OPEN.

---

## 8. Risk matrix

| # | Obszar | Ryzyko | Poziom | Uwaga |
|---|--------|--------|:------:|-------|
| K1 | `saveDailyFullBackup` gating | Utrata dziennego snapshotu „richness-max" | Średnie | Zachować regułę `score(new)>=score(existing)` + gwarancję ≥1 snapshot/dzień |
| K2 | Rotacja warunkowa | `-prev`/`-prev2` starsze → słabszy restore | Średnie | Guard „zmiana ⇒ rotacja"; testy restore |
| K3 | Batch prev-reads (mget) | Rozjazd kolejności/braków (jak defekt mget) | Niskie | Reuse `kv-batch-order.ts` (order-preserving, przetestowany) |
| K4 | Restrukturyzacja read-all-first | Guard/merge dostaje zły prev | Wysokie jeśli źle | Prev musi = stan sprzed mset; testy parytetu shrink/expansion |
| K5 | S7-5-2 parity | Naruszenie filtra tombstonów przed UNION | Wysokie | Nie dotykać ścieżki merge week-employees |
| K6 | Kontrakt kluczy backupu | Zmiana nazw/kształtu psuje restore | Wysokie | Granica twarda — nie zmieniać |
| K7 | Overlap S7-3 / PR-PERF-S1 | Dublowanie zakresu (client singleton / delta) | Proces | Rozstrzygnąć przynależność bundla przed startem |
| K8 | Pełny bundle mset | Rozmiar payload (H1/500) | Niskie/śr. | Delta = osobne, wyższe ryzyko (B5) |

---

## 9. Bundle split recommendation (B1/B2/B3/B4/B5)

> Kandydaci do rozbicia Edge-Opt-B na osobne bundle (One Bundle = One Goal). **Kolejność = rosnące ryzyko.** Bez propozycji implementacji.

| Bundle | Cel | `[EST]` potencjał | Ryzyko | Zależności | Rekomendacja kolejności |
|--------|-----|:---:|:---:|-----------|:---:|
| **B1** | Bramkowanie `saveDailyFullBackup` (raz/dzień lub przy zmianie fingerprint) | ~30–45% | Niskie (K1) | Reguła richness-max; restore „today" | **1** |
| **B3** | Batch prev-reads przez `kv.mget` (read-all-first) | ~10–20% | Średnie (K3,K4) | reuse `kv-batch-order.ts`; inwariant prev-before-mset | **2** |
| **B2** | Warunkowa rotacja backupów (rotuj tylko zmienione) | ~15–25% | Średnie/wys. (K2,K6) | kontrakt restore | **3** |
| **B4** | Singleton klienta Supabase (mniej `createClient`) | ~5–10% | Niskie | **overlap S7-3** | odroczone (koordynacja) |
| **B5** | Delta push / changed-key write | duży | Wysokie (K8) | **overlap PR-PERF-S1** | odroczone (rozstrzygnięcie zakresu) |

**Rekomendacja:** najniższy stosunek zysk/ryzyko = **B1 → B3 → B2**; B4/B5 odroczone do rozstrzygnięcia przynależności z S7-3 / PR-PERF-S1. Każdy bundle = osobny pełny cykl z regresją restore + parytet S7-5-2.

---

## 10. Design Freeze prerequisites (warunki przed rozpoczęciem DF — NIE DF)

Zanim powstanie Design Freeze dla któregokolwiek B1–B5:

1. **Domknięcie Performance Observation** S7-5 ETAP 1 + Edge-Opt-A (realne CPU / `pg_stat_statements` / Edge duration) → walidacja/rewizja liczb `[EST]` z §7.
2. **Baseline liczbowy** — twarda liczba `SELECT`/`INSERT` per `batch-set` i udział `saveDailyFullBackup` (potwierdzenie, że B1 to główny hotspot).
3. **Rozstrzygnięcie overlapów** — przynależność B4 (↔ S7-3) i B5 (↔ PR-PERF-S1) do konkretnego bundla.
4. **Potwierdzenie kontraktu restore** — jawna lista kluczy backupu chronionych (K6) + test parity restore jako regresja obowiązkowa.
5. **OWNER GO** dla wybranego bundla (pojedynczy, One Bundle = One Goal).
6. **Zakres wykluczony z góry:** merge/LWW, S7-5-2 tombstony, kształt kluczy backupu, kontrakt HTTP/klient.

---

*SSOT master audit Edge-Opt-B: ten plik. AUDIT ONLY — bez implementacji, bez Design Freeze, bez zmian kodu. Liczby `[EST]` do walidacji telemetrią.*
