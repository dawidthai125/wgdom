# PAYROLL — PR-PAY-S7-4 · Cloud Sync Optimization · DESIGN FREEZE

> **Status:** `S7-4A IMPLEMENT COMPLETE · BUILD PASS · TEST PASS` → **PRODUCTION OBSERVATION 24–48h**
> **Data:** 2026-07-03 · **HEAD `915da77`** · Production **DEGRADED** · P0 ACTIVE
>
> **✅ S7-4A (owner GO — G1–G4 only) wdrożone:** debounce (`AUTO_SYNC_DEBOUNCE_MS`) · minimum interval + focus/visibility throttle (`shouldPullNow`, `MIN_PULL_INTERVAL_MS=15s`) · AC4 no-change=no-push (`bundleFingerprint`, poziom bundla — **NIE** delta push) · AC5 metrics (`getSyncMetrics` / `__wgdomSyncMetrics()` w konsoli produkcyjnej).
> **OUT OF SCOPE (potwierdzone):** G5 Delta Push · G6 ETag/Hash — do decyzji po obserwacji.
> **Test:** `scripts/test-payroll-cloud-sync-frequency-s7-4.mjs` 17/17 PASS · gate regresji (S5/S2/S6/RB/B4/B6) PASS · BUILD PASS.
> **Bazuje na:** [`PAYROLL-PR-PAY-S7A-CLOUD-SYNC-FREQUENCY-AUDIT.md`](PAYROLL-PR-PAY-S7A-CLOUD-SYNC-FREQUENCY-AUDIT.md) (CONFIRMED CONTRIBUTING CAUSE) · [`PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md`](PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md)

```text
NOWE DANE (owner, produkcja): Supabase Resource Exhaustion + bardzo wysoka liczba batch-get.
REWIZJA PLANU: PR-PAY-S7-4 (Cloud Sync Optimization) PRZED PR-PAY-S7-2 (Cloud Batch Hardening).
CEL S7-4: zredukować liczbę i rozmiar żądań batch-get/batch-set (przyczyna resource exhaustion),
BEZ zmian merge / LWW / Payroll / tombstones / kv.mset.
```

---

## 1. Zakres (IN SCOPE)

| ID | Zmiana | Miejsce (docelowy IMPLEMENT) |
|----|--------|------------------------------|
| **G1 debounce** | Auto-save: utrzymać debounce; ujednolicić i wydłużyć okno grupowania zmian (potwierdzić 2s→? w implementacji) | `App.tsx` `scheduleAutoCloudSync` |
| **G2 minimum interval (pull)** | Twardy minimalny odstęp między pull `pullFromCloudAndMerge` (np. `lastPullAtRef`; jeśli od ostatniego pull < N s → skip/defer) | `App.tsx` `pullFromCloudAndMerge` |
| **G3 focus throttle** | `window "focus"` przechodzi przez ten sam throttle co G2 (bez natychmiastowego pull przy każdym focus) | `App.tsx:964–969` |
| **G4 visibility throttle** | `visibilitychange` (widoczny) przez ten sam throttle; scalić z `focus` w jeden ścieżkowy trigger, aby uniknąć podwójnego pull | `App.tsx:960–969` |
| **G5 change detection (push)** | Push tylko **zmienionych kluczy** zamiast całego 38-kluczowego bundla; porównanie względem ostatnio potwierdzonego stanu (hash/fingerprint per klucz, wyłącznie warstwa transportu) | `cloud-sync.ts` `pushMergedDataBundleToCloud` / `pushKeysToCloud` |
| **G6 ETag/hash — AUDIT ONLY** | Zbadać wykonalność ETag/If-None-Match lub `kw-admin-hash`/hash bundla dla batch-get (pull tylko gdy zmiana w chmurze). **W tym slice tylko audyt wykonalności** — implementacja ETag odłożona (dotyka Edge/DB) | `cloud-sync.ts` `fetchKeysFromCloud` (audyt) |

> **Zasada:** G1–G5 = optymalizacja **warstwy transportu/harmonogramu** (klient). G6 = audyt (bez zmian Edge/DB w tym bundlu).

## 2. Wykluczenia (OUT OF SCOPE — NIE ZMIENIAĆ)

- **merge** (`finalizePayrollBundleMerge`, `mergeWeekEmployees*`, `mergeDataKey`)
- **LWW** (`pickSettledByTimestamps`, `settledUpdatedAt`, `dataUpdatedAt`, `rateUpdatedAt`)
- **Payroll** logika (godziny/stawki/carry-forward/rollover/EPS/metrics)
- **tombstones** (`kw-*-deleted-ids`, `deletedWeekEmployeeMergeKeySet`, filtry)
- **kv.mset** i cała logika Edge `batch-set` (to należy do S7-2)
- Kolejność pull→apply→push jako semantyka merge (zmiana dotyczy tylko harmonogramu/change-detection, nie wyniku merge)

## 3. Ryzyka

| # | Ryzyko | Mitygacja |
|---|--------|-----------|
| **R1** | Throttle/min-interval opóźnia legalne aktualizacje między urządzeniami (staleness) | Dobrać interwał zachowawczo; pull nadal na realne wybudzenie (resume) i po push; nie blokować retry ręcznego |
| **R2** | Change-detection (G5) pominie faktyczną zmianę (false negative) → brak push | Fingerprint deterministyczny z tych samych danych co push; fallback: pełny push okresowo / gdy brak baseline; **nie** dotykać merge |
| **R3** | Scalenie focus+visibility zgubi pull po realnym powrocie | Zachować co najmniej jeden pull na powrót (resume) poza oknem throttle |
| **R4** | Zmiana debounce wpłynie na „szybki zapis" settled (400ms) | Ścieżka settled pozostaje osobna; nie wydłużać jej ponad obecne UX |
| **R5** | Regresja w istniejących testach sync | Uruchomić pełny gate regresji (poniżej) przed COMMIT |

## 4. Lista plików (przewidywana)

- `src/app/App.tsx` — G2/G3/G4 (throttle pull, scalenie focus/visibility), G1 (debounce)
- `src/lib/cloud-sync.ts` — G5 (diff push), G6 (audyt ETag — bez zmian runtime lub minimalny helper hash)
- (ewent.) `src/app/hooks/useLocalStorage.ts` — jeśli change-detection wymaga fingerprintu; **bez** zmiany semantyki zapisu
- `scripts/test-payroll-cloud-sync-frequency-s7-4.mjs` — **nowy** test (debounce/throttle/change-detection jako logika czysta)

## 5. Plan testów

**Nowy:** `scripts/test-payroll-cloud-sync-frequency-s7-4.mjs`
- min-interval: dwa pull w oknie < N s → drugi pominięty/odroczony
- focus+visibility w krótkim oknie → 1 pull (nie 2)
- change-detection: brak zmian → 0 zmienionych kluczy (push pominięty); zmiana 1 klucza → dokładnie 1 klucz w payload
- debounce: seria zmian w oknie → 1 zaplanowany sync

**Regresja (gate — muszą PASS):**
- `test-payroll-settled-persistence-pr-pay-s5.mjs`
- `test-payroll-deletion-tombstones-pr-pay-s2.mjs`
- `test-payroll-archive-restore-eligibility-s6.mjs`
- `test-payroll-restore-banner-false-positive.mjs`
- `test-payroll-bootstrap-runtime-parity-b4.mjs`
- `test-payroll-edge-parity-b6.mjs`

**BUILD:** obowiązkowo (`npm run build`).

## 6. Acceptance Criteria

- **AC1** Pull nie wykonuje się częściej niż minimalny interwał (G2) — dowód w teście.
- **AC2** Pojedynczy powrót do karty = maks. 1 pull (focus+visibility scalone) — AC3.
- **AC3** Brak realnej zmiany danych ⇒ **brak batch-set** (0 zmienionych kluczy) (G5).
- **AC4** Zmiana pojedynczego klucza ⇒ push zawiera **tylko** ten klucz (nie 38).
- **AC5** merge/LWW/tombstones/Payroll/kv.mset **bez zmian** — gate regresji PASS.
- **AC6** BUILD PASS.
- **AC7** G6: raport wykonalności ETag/hash dla batch-get (dołączony do audytu), bez zmian Edge.

## 7. Post-Implement — Production Observation (24–48h)

Po wdrożeniu S7-4 → **obserwacja produkcyjna 24–48h**:
- liczba `batch-get` / `batch-set` (spadek?)
- Supabase resource exhaustion (ustąpił?)
- czy `batch-set 500` **nadal** występuje

**Decyzja po obserwacji:**
- **batch-set 500 USTĄPIŁ** → resource exhaustion był głównym driverem; S7-2 pozostaje DRAFT (opcjonalne hardening).
- **batch-set 500 NADAL występuje** → **GO PR-PAY-S7-2 Cloud Batch Hardening** (chunk/izolacja `mset`), H1 potwierdzone jako niezależny root cause.

---

## GO / NO-GO

| Etap | Status |
|------|--------|
| **AUDIT (S7A)** | **COMPLETE** — CONFIRMED CONTRIBUTING CAUSE |
| **Nowe dane** | Supabase Resource Exhaustion + wysoka liczba batch-get (owner) |
| **DESIGN FREEZE (S7-4)** | **APPROVED** |
| **S7-4A IMPLEMENT (G1–G4 + AC4/AC5)** | ✅ **COMPLETE · BUILD PASS · TEST PASS** |
| **PRODUCTION OBSERVATION** | **24–48h** — mierzyć batch-get / batch-set (`__wgdomSyncMetrics()`), resource exhaustion, czy `batch-set 500` nadal |
| **G5 Delta Push / G6 ETag** | **OUT OF SCOPE** — decyzja po obserwacji |
| **S7-2** | **NO GO** — GO tylko jeśli `batch-set 500` nadal po S7-4A |

**One Bundle = One Goal** — S7-4 wyłącznie optymalizacja częstotliwości/rozmiaru sync; Edge/`kv.mset` (S7-2) osobny bundle.

---

*SSOT design freeze PR-PAY-S7-4: ten plik · dotąd bez zmian kodu · commit dokumentacyjny.*
