# PR-PERF-S1 — Cloud Sync Bundle Optimization · DESIGN FREEZE (BACKLOG)

> **Typ:** DESIGN FREEZE przyszłego bundle wydajnościowego (Wariant B z audytu). **NIE implementacja.**
> **Data:** 2026-07-03 · **HEAD `main`:** `0cdbc54` · **Prod:** v2.63.27
> **Źródło:** [`docs/PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md`](PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md) §7 Wariant B.
> **Status:** 📋 **DESIGN FREEZE DRAFT · WAITING OWNER GO · IMPLEMENT NOT STARTED**
> **Gate:** nie startować przed zamknięciem aktywnego P0 (S7-5 / F1) — to osobny bundle (One Bundle = One Goal).
> **Workflow:** AUDIT → DESIGN FREEZE → STOP. Bez BUILD, TEST, COMMIT.

---

## 0. Cel i teza

Zredukować payload i liczbę kluczy w bieżącym sync przez **podział warstwy transportowej** na logiczne bundle domenowe. Edycja w danej domenie synchronizuje **tylko** jej bundle (+ Shared), zamiast ~40 kluczy naraz.

**Teza bezpieczeństwa:** SSOT = *klucz KV + reguła merge*, **nie** „jeden bundle transportowy”. Podział dotyczy wyłącznie **grupowania kluczy w żądaniach** batch-get/batch-set. Merge, LWW, tombstony i API pozostają bez zmian.

---

## 1. Inwarianty (co NIE zmienia się — twarde)

| # | Inwariant | Uzasadnienie |
|---|-----------|--------------|
| INV-1 | **SSOT bez zmian** — te same klucze KV, ta sama semantyka | podział = transport, nie źródło prawdy |
| INV-2 | **Merge bez zmian** — `mergeAllDataKeys`, `mergeWeekEmployees`, `finalizePayrollBundleMerge` działają per-klucz | scope = podzbiór kluczy, ta sama funkcja |
| INV-3 | **LWW bez zmian** — `dataUpdatedAt`/`rateUpdatedAt`/`settledUpdatedAt` | zero zmian w rozstrzyganiu |
| INV-4 | **Tombstones bez zmian** — te same `*-deleted-ids`, ta sama reguła filtrowania | jadą z właściwym bundlem |
| INV-5 | **CloudSync API bez zmian** — `fetchKeysFromCloud(keys[])`, `pushKeysToCloud(keys[], values[])` sygnatury nietknięte | dodajemy warstwę **routingu** nad istniejącym API |
| INV-6 | **Merge-coupled keys razem** — klucze sprzężone indeksowo w merge muszą być w **jednym** bundlu | patrz §3.6 |
| INV-7 | **Bootstrap bez zmian** — CloudLoader CORE + DEFERRED nadal ładuje całość na start | podział dotyczy sync **bieżącego**, nie startu |
| INV-8 | **Edge parity** — Edge nadal przyjmuje dowolny podzbiór kluczy (batch-set/get są key-agnostic) | brak zmian kontraktu Edge |
| INV-9 | **Bundle Independence** — każdy bundle poprawny **niezależnie od kolejności** synchronizacji pozostałych; żadna logika biznesowa nie zakłada, że inny bundle został zsynchronizowany wcześniej | eliminacja ukrytych zależności czasowych między bundlami |

> **KRYTYCZNE (INV-6):** `finalizePayrollBundleMerge` / `applyRuntimePayrollAntiLeak` używają indeksów `empIdx/fromIdx/toIdx/archIdx` (`cloud-sync.ts:1681–1684,1746–1748,1793–1794`). Te 4 klucze (`kw-week-employees`, `kw-weekFrom`, `kw-weekTo`, `kw-archive`) **muszą** być w jednym bundlu (Payroll), inaczej łamiemy INV-2.

---

## 2. Model docelowy (routing transportu)

```
Edycja domeny X → dirty(X) → sync bundla X (+ Shared, jeśli dotknięty)
                              ↓
           computeMergedBundle(subsetKeys(X))  ← reuse mergeAllDataKeys
                              ↓
           fingerprint per-bundle → push tylko gdy zmiana
```

- **Bundle registry** (nowa, czysta mapa `key → bundleId`) — jedyne „nowe” dane; nie zmienia KV.
- **Per-bundle fingerprint** — rozszerzenie `bundleFingerprint` na podzbiór (AC4 per bundle).
- **Dirty tracking** — który bundle wymaga sync (na bazie istniejącego useEffect deps, rozbitego per domena).

---

## 3. Definicje bundli

### 3.1 Shared Bundle (backbone — cross-domenowy, niski churn)
Klucze używane przez ≥2 domeny lub stanowiące tożsamość/roster/komunikację.

| Klucz | Tombstone | Konsumenci |
|-------|-----------|-----------|
| `kw-directory` | `kw-directory-deleted-ids` | Payroll (roster), Jobs (assignees), Inspector |
| `kw-jobs` | `kw-jobs-deleted-ids` | Payroll (`workEntries`/assignments), WM Druk (odbiory), Billing, Jobs |
| `kw-contacts` | `kw-contacts-deleted-ids` | Email w wielu modułach |
| `kw-operational-notes` | `kw-operational-notes-deleted-ids` | Dashboard, Inspector, Jobs |
| `kw-recoverable-charges` | `kw-recoverable-charges-deleted-ids` | Billing „Do rozliczenia” (per job) |

- **Aux powiązane:** `kw-operational-notes-read-state`, `kw-operational-notes-audit-log` (aux notatek), `kw-wm-druk-audit`/`kw-security-audit-log` (Audit Hub).
- **Zależności:** brak (to rdzeń, od którego zależą inne).
- **Klucze współdzielone:** `kw-directory` (Payroll+Jobs), `kw-jobs` (Payroll+WM+Billing) — powód, dla którego są w Shared, nie w domenie.
- **Uwaga:** `kw-operational-notes` i `kw-recoverable-charges` są edytowane przez jedną domenę (Ops/Billing), ale nie należą do Payroll/Tender/WM/Catalog → tymczasowo w Shared. **Backlog:** ewentualny osobny „Jobs/Ops Bundle” (poza PR-PERF-S1).

### 3.2 Payroll Bundle
| Klucz | Tombstone | Uwaga |
|-------|-----------|-------|
| `kw-week-employees` | `kw-week-employees-deleted-ids` **(local-only, F2/S7-5 — poza PR-PERF-S1)** | merge-coupled |
| `kw-weekFrom` | — | merge-coupled |
| `kw-weekTo` | — | merge-coupled |
| `kw-archive` | `kw-archive-deleted-ids` | merge-coupled |
| `kw-employee-leaves` | `kw-employee-leaves-deleted-ids` | overlay urlopów |

- **Zależności:** Shared (`kw-directory` identyczność roster, `kw-jobs` spójność assignments/`workEntries`).
- **Klucze współdzielone:** brak własnych — korzysta z Shared read-only w warstwie app.
- **Wymagane tombstony:** `kw-archive-deleted-ids`, `kw-employee-leaves-deleted-ids`.
- **INV-6:** `week-employees + weekFrom + weekTo + archive` **nierozłączne** (indeksy merge).

### 3.3 Tender Bundle
| Klucz | Tombstone |
|-------|-----------|
| `kw-tenders-pipeline` | `kw-tenders-deleted-ids` *(obecnie osobna ścieżka `tenders-sync.ts` — do ujednolicenia lub pozostawienia)* |
| `kw-tenders-company-profile` | — |
| `kw-company-profile` | — |
| `kw-tenders-custom-keywords` | — |
| `kw-tender-calibration` | — |
| `kw-tender-price-overrides` | — |

- **Zależności:** Catalog (kalibracja/override cen referują cost-catalog), Shared (`kw-jobs` przy tender→job).
- **Klucze współdzielone:** brak twardych; pośrednia zależność cenowa od Catalog.
- **Wymagane tombstony:** `kw-tenders-deleted-ids` (jeśli włączony do wspólnego sync; dziś zarządzany osobno).

### 3.4 WM Bundle (WM Druk: Odbiory + Pomiary + Schematy)
| Klucz | Tombstone |
|-------|-----------|
| `kw-wm-print-templates` | `kw-wm-print-deleted-template-ids` |
| `kw-wm-print-job-docs` | `kw-wm-print-deleted-job-doc-ids` |
| `kw-wm-print-settings` | — |
| `kw-wm-print-history` | — |
| `kw-delivery-package-publications` | — |
| `kw-electrical-measurements` | `kw-electrical-measurements-deleted-ids` |
| `kw-electrical-measurement-registry` | — |
| `kw-electrical-measurement-settings` | — |
| `kw-electrical-schematics` | — |

- **Zależności:** Shared (`kw-jobs` — WM Druk operuje per job).
- **Aux:** `kw-wm-druk-audit` (Audit Hub — może zostać w Shared aux).
- **Wymagane tombstony:** `kw-wm-print-deleted-template-ids`, `kw-wm-print-deleted-job-doc-ids`, `kw-electrical-measurements-deleted-ids`.
- **Opcja (backlog):** rozbić na `WM-Print` + `Electrical` — na razie razem (jedna zakładka WM Druk).

### 3.5 Catalog Bundle (quasi-statyczny, bulk, niski churn — kandydat cache)
| Klucz | Tombstone |
|-------|-----------|
| `kw-wgdom-cost-catalog` | — |
| `kw-wgdom-cost-catalog-history` | — |
| `kw-wgdom-classification-dictionary` | — |
| `kw-wgdom-work-catalog` | — |
| `kw-wgdom-work-bundles` | — |

- **Zależności:** brak (liść). Konsumowany przez Tender (ceny) i Wycena.
- **Klucze współdzielone:** żaden nie jest edytowany przez inne domeny.
- **Wymagane tombstony:** brak.
- **Cache:** pobierany warunkowo (marker wersji/`updatedAt`), inaczej z local — największa oszczędność egress.

### 3.6 Macierz przypisania (30 DATA_KEYS → bundle)

| Bundle | # kluczy | Tombstony |
|--------|:--------:|-----------|
| Shared | 5 | 5 (jobs, directory, contacts, op-notes, charges) |
| Payroll | 5 | 2 (archive, leaves) + [F2 local-only] |
| Tender | 6 | (tenders — osobno) |
| WM | 9 | 3 (wm-tpl, wm-doc, em) |
| Catalog | 5 | 0 |
| **Σ** | **30** | **10 (+1 local-only F2)** |

---

## 4. Graf zależności (kolejność sync)

```
Catalog (liść)
   ▲
Tender ──► Shared ◄── Payroll
   ▲          ▲
   └── WM ────┘
```

- **Reguła:** przy sync domeny dołącz Shared, jeśli w tej transakcji dotknięto klucza Shared (np. edycja assignments = Payroll dotyka `kw-jobs` → sync Payroll + Shared).
- **Brak cykli:** Catalog nie zależy od nikogo; Shared nie zależy od domen; domeny zależą od Shared/Catalog.
- **INV-9 (Bundle Independence):** graf opisuje **kolejność preferowaną**, nie **wymaganą**. Każdy bundle merge’uje się poprawnie niezależnie od tego, czy inny bundle był już zsynchronizowany. Merge per-klucz (INV-2) + LWW (INV-3) gwarantują zbieżność przy dowolnej kolejności. Zakaz kodu typu „zakładam, że Catalog/Shared jest już świeży” — brak ukrytych zależności czasowych.

---

## 5. Migration Strategy (etapowa, wstecznie zgodna — bez implementacji tu)

| Etap | Zakres | Bezpieczeństwo |
|------|--------|----------------|
| **M0 — Registry (no-op)** | Wprowadzić mapę `key→bundle` + `subsetKeys(bundleId)` jako czystą warstwę. **Sync nadal pełny** (feature flag OFF). | Zero zmiany zachowania; testowalne jednostkowo |
| **M1 — Per-bundle fingerprint** | `bundleFingerprint(subset)` liczony per bundle; nadal push pełny, ale metryki pokazują dirty per bundle. | Obserwowalność bez ryzyka |
| **M2 — Scoped push (flag)** | Push tylko dirty bundli (Shared zawsze przy współdzielonym kluczu). Pull nadal pełny. | Redukcja batch-set; pull niezmieniony = brak ryzyka utraty |
| **M3 — Scoped pull (flag)** | Pull tylko dirty/aktywnej domeny + Shared; reszta z cache/lazy. | Wymaga potwierdzenia, że brak pull ≠ stale (INV-2 merge przy następnym pull) |
| **M4 — Catalog cache** | Warunkowy fetch Catalog (marker wersji). | Największa oszczędność egress |
| **Rollback** | Feature flag globalny → powrót do pełnego bundla (M0). | Każdy etap odwracalny flagą |

**Parytet:** każdy etap wymaga testu `mergeAllDataKeys(subset)` == `mergeAllDataKeys(full)[subset]` (idempotencja podzbioru) + regresji payroll (S5/B4/B6) + Edge parity.

**Zasada wstecznej zgodności:** Edge i KV bez zmian → stare klienty (pełny bundle) i nowe (scoped) współistnieją; merge per-klucz gwarantuje spójność niezależnie od grupowania.

---

## 6. Ryzyka

| # | Ryzyko | Mitigacja |
|---|--------|-----------|
| R1 | Rozbicie merge-coupled kluczy (INV-6) | Payroll quad nierozłączny; test indeksów |
| R2 | Scoped pull → stale w innej domenie | Pull domeny przy wejściu w widok + Shared zawsze; M3 za flagą + obserwacja |
| R3 | Klucz współdzielony zsynchronizowany tylko w jednej domenie | `kw-directory`/`kw-jobs` w Shared, synchronizowane przy każdej domenie ich dotykającej |
| R4 | Tombstone odłączony od swojego klucza | Tombstony przypięte do bundla klucza (§3) |
| R5 | Rozjazd parity klient↔Edge | Edge key-agnostic (INV-8); test parity |
| R6 | Kolizja z F1/S7-5 (aktywny P0) | PR-PERF-S1 nie rusza `kw-week-employees` merge ani tombstonów week-employees (F2) |
| R7 | Feature flag half-state (część klientów scoped) | Merge per-klucz odporny; M2/M3 za flagą, rollout kontrolowany |

---

## 7. Acceptance Criteria (kanoniczne — PR-PERF-S1)

> Zamknięcie DESIGN FREEZE. Te 4 kryteria są **warunkiem GO** implementacji.

| AC | Kryterium | Weryfikacja |
|----|-----------|-------------|
| **AC-1** | **Zmniejszenie liczby requestów** po pojedynczej edycji Payroll | `__wgdomSyncMetrics()` przed/po: mniej `batchGet`+`batchSet` niż pełny bundle |
| **AC-2** | **Payroll Bundle nie pobiera** danych WM/Tender/Catalog | scoped pull Payroll = tylko Payroll + Shared; brak kluczy WM/Tender/Catalog w żądaniu |
| **AC-3** | **Merge Payroll przed i po** podziale bundli daje **identyczny wynik** | snapshot merge full vs merge scoped → diff pusty |
| **AC-4** | **`subset(bundle) == subset(full bundle)`** | idempotencja: `mergeAllDataKeys(subset)` == `mergeAllDataKeys(full)[subset]` |

## 7.1 Acceptance Criteria (rozszerzone — techniczne)

- **AC1** Edycja Payroll synchronizuje ≤ (Payroll + Shared) kluczy, nie ~40.
- **AC2** `mergeAllDataKeys` na podzbiorze = wynik identyczny jak na pełnym bundlu dla tych kluczy (idempotencja).
- **AC3** Tombstony każdej domeny jadą z jej bundlem; brak resurrection wskutek podziału.
- **AC4** Fingerprint per-bundle: brak zmian w bundlu = brak jego push.
- **AC5** Regresje: S5 settled, B4 bootstrap/runtime, B6 Edge parity, payroll hours/extra-cost — PASS.
- **AC6** INV-6: payroll quad zawsze w jednym bundlu; `finalizePayrollBundleMerge` nietknięty.
- **AC7** Rollback flagą przywraca pełny bundle bez utraty danych.
- **AC8** Bootstrap (CloudLoader) niezmieniony — CORE+DEFERRED ładuje całość.

---

## 7.2 Expected KPI (Before / After)

> Wartości **do uzupełnienia po pomiarze baseline** (przed implementacją) i po wdrożeniu. Metoda pomiaru zdefiniowana z góry, aby porównanie Before/After było powtarzalne.

| KPI | Current Baseline | Target | Measurement Method |
|-----|------------------|--------|--------------------|
| Requests / pojedyncza edycja Payroll | TBD after baseline measurement | TBD after baseline measurement | `__wgdomSyncMetrics()` (Δ `batchGet`+`batchSet`) na jedną edycję po ustaniu debounce 2 s |
| batch-get payload | TBD after baseline measurement | TBD after baseline measurement | DevTools Network → rozmiar odpowiedzi `POST /batch-get` (bytes) |
| batch-set payload | TBD after baseline measurement | TBD after baseline measurement | DevTools Network → rozmiar żądania `POST /batch-set` (bytes) |
| batch-get / min | TBD after baseline measurement | TBD after baseline measurement | `__wgdomSyncMetrics().batchGet` w 60 s oknie, typowa sesja edycji |
| batch-set / min | TBD after baseline measurement | TBD after baseline measurement | `__wgdomSyncMetrics().batchSet` w 60 s oknie, typowa sesja edycji |
| Supabase egress | TBD after baseline measurement | TBD after baseline measurement | Supabase Dashboard → Reports/Usage (egress w oknie testowym) |
| Average sync latency | TBD after baseline measurement | TBD after baseline measurement | DevTools Network → mediana czasu odpowiedzi batch-get + batch-set |

**Uwaga:** pomiar baseline wykonać na tej samej sesji/scenariuszu, na którym liczony będzie wynik After (ten sam device count, ta sama sekwencja edycji), inaczej porównanie nie jest miarodajne.

---

## 8. Out of Scope
- Zmiana merge/LWW/tombstonów (INV-2/3/4).
- `kw-week-employees-deleted-ids` (F2 → S7-5).
- F1 `extraCosts` per-item merge (osobny bundle).
- ETag/Realtime/per-key versioning (Wariant C — long term).
- Jobs/Ops Bundle split (`operational-notes`/`recoverable-charges` — backlog).
- Zmiana schematu KV / kontraktu Edge.

---

## 9. Plan testów (docelowy — nie wykonywać teraz)
- `test-perf-s1-bundle-registry.mjs` — mapa `key→bundle` kompletna (30/30), brak sieroty.
- `test-perf-s1-subset-merge-idempotent.mjs` — AC2 (subset == full[subset]).
- `test-perf-s1-tombstone-routing.mjs` — AC3 (tombstone z właściwym bundlem).
- `test-perf-s1-fingerprint-per-bundle.mjs` — AC4.
- Regresje: `test-payroll-settled-merge-fix-a`, `test-payroll-bootstrap-runtime-parity-b4`, `test-payroll-edge-parity-b6`, `test-payroll-extra-cost-etap1`.

---

## 10. Rejestr powiązań
| Ustalenie | Relacja |
|-----------|---------|
| Audyt wydajności | [`PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md`](PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md) §7 Wariant B |
| Wariant A (low-risk round-tripy) | poza PR-PERF-S1 (osobny, mniejszy) |
| Wariant C (ETag/Realtime) | long term, osobny EPIC |
| F1 / S7-5 | aktywny P0 — PR-PERF-S1 nie koliduje |

---

*SSOT PR-PERF-S1: ten plik. DESIGN FREEZE DRAFT — bez implementacji, BUILD, TEST, COMMIT. Workflow: AUDIT → DESIGN FREEZE → STOP.*
