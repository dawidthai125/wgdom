# COST-REGRESSION-02 — DISCOVERY-ZIP DESIGN FREEZE (Variant D)

> **ID:** COST-REGRESSION-02-DISCOVERY-ZIP-DESIGN-FREEZE  
> **EPIC:** COST-REGRESSION-02 · **VARIANT:** **D — Discovery + UX**  
> **STATUS:** **DESIGN FREEZE · IMPLEMENTED** · UI **2.65.72** · feature **`c5c95ed`** · [`CLOSEOUT`](COST-REGRESSION-02-DISCOVERY-ZIP-CLOSEOUT.md)  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** FEATURE / Przetargi · **UI Discovery only** · **#CORE-013** — zero Payroll · zero sync merge · **zero Bid / COST-PIPELINE / AI Cost / OfferBoq / Epic B**  
> **Wejście:** [`COST-REGRESSION-02-DISCOVERY-ZIP-AUDIT.md`](COST-REGRESSION-02-DISCOVERY-ZIP-AUDIT.md) · Epic A CLOSED [`COST-REGRESSION-01-EPIC-A-CLOSEOUT.md`](COST-REGRESSION-01-EPIC-A-CLOSEOUT.md) · helper `src/lib/cost-regression-f2.ts`

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (COST-REGRESSION-02 · Variant D):
  F2 + top-level ZIP/7Z → Discovery nie mówi „Brak przedmiaru
  w dokumentach”. Uznaj archive_candidate → candidate_ready
  lub (gdy heavy już Done bez kosztorysu) → parse_failed
  z copy ZIP-aware. REUSE heavy. Zero Bid.

IMPLEMENT: ZABLOKOWANY do Owner GO IMPLEMENTATION.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (przed przyszłym IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE
G3 Cloud Sync:   NIE* (*tylko istniejący persist item po re-parse — REUSE Epic A; bez nowego merge)
G4 Bootstrap:    NIE (Payroll)
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      TAK* (*deep-link Dokumenty — jak Epic A; bez zmiany shell)

Wynik: Gate GREEN.
Owner GO IMPLEMENTATION: WYMAGANE przed kodem.
```

---

## 1. Cel (zamrożony)

| Cel | Opis |
|-----|------|
| **Naprawa Discovery** | Top-level ZIP/7Z = `archive_candidate` → **nie** `no_candidate` |
| **UX copy** | Macierz ZIP-aware (brak dokumentów · ZIP wykryty · w toku · nieudana · zakończona) |
| **CTA** | Przy ZIP: **Ponów analizę** (reuse heavy), nie mylące „Dołącz przedmiar” jako primary |
| **HeavyDone bez kosztorysu** | `archive_candidate` ∧ heavy done ∧ F2 → **`parse_failed`** (copy: nie znaleziono w archiwum) |
| **Sukces** | UI przestaje kłamać „brak przedmiaru” gdy ZIP dokumentacji istnieje |

**Sukces 02 ≠** zawsze PLN po Ponów.  
**Sukces 02 =** prawdziwy discovery status + właściwe CTA + copy zgodne z macierzą.

**Zamrożony wariant:** **D** (Audit §13).  
**Odrzucone w tym DF:** Variant A (tylko copy) · Variant C (unpack w Discovery) · fałszywy Bid bez kosztorysu.

---

## 2. Definicja `archive_candidate` (zamrożona)

```text
isZipOr7zFilename(name) =
  /\.(zip|7z)$/i.test(name.trim())

isArchiveCandidateFilename(name) =
  isZipOr7zFilename(name)
  // CR-02: KAŻDY top-level ZIP/7Z jest archive_candidate.
  // Uzasadnienie: heavy i tak unpackuje wszystkie BZP ZIP;
  // heurystyka nazw pomijała by edge-case (np. „Dokumentacja Techniczna”).
  // False positive (ZIP bez ATH) → candidate_ready/parse_failed + Ponów
  // bez gwarancji PLN — akceptowalne (DF §7).

hasArchiveCandidate(item) =
  uploadedFile.filename jest archive_candidate
  OR dowolny bzpDocuments[].filename jest archive_candidate
  OR dowolny externalDocDiscovery.files[].filename jest archive_candidate
  OR (opcjonalnie) gate.refs z archive_candidate  // REUSE gate, bez nowego crawlera
```

| Pole | Wartość zamrożona |
|------|-------------------|
| Zakres plików | **tylko top-level** nazwy (nie inner `outer → inner`) |
| Rozszerzenia | `.zip` · `.7z` (case-insensitive) |
| Heurystyka nazwy (dokumentacja/…) | **NIE wymagana** w CR-02 v1 |
| Unpack w Discovery | **ZAKAZ** (Variant C OOS) |
| Relacja do Epic A | **Rozszerza** `hasPrzedmiarCandidate` — nie zmienia F2/F1 |

### 2.1 Rozszerzenie kandydata przedmiaru (zamrożone)

```text
hasPrzedmiarCandidate(item) =
  (Epic A: ATH/XLSX/PDF-przedmiar top-level — BEZ ZMIAN logiki nazw)
  OR hasArchiveCandidate(item)
```

---

## 3. Semantyka discovery (zamrożona)

### 3.1 Enum (bez nowego kodu statusu — REUSE Epic A)

| Kod | Znaczenie CR-02 |
|-----|-----------------|
| `no_candidate` | F2 ∧ brak top-level ATH/XLSX/PDF-przedmiar ∧ **brak** `archive_candidate` |
| `candidate_ready` | F2 ∧ jest kandydat (plik kosztowy **lub** archive) ∧ heavy **jeszcze nie** Done bez kosztorysu ∧ nie running |
| `parse_running` | F2 ∧ I/O heavy/bootstrap w toku |
| `parse_failed` | F2 ∧ (sesja parse fail **lub** **archive_candidate ∧ heavyDone ∧ !kosztorys.ok**) |

### 3.2 Priorytet `resolveCostRegressionF2DiscoveryStatus` (zamrożony)

```text
1. if !isCostRegressionF2(item) → null
2. if dossierBuilding | dossierSaving | autoRunning → parse_running
3. if hasArchiveCandidate(item)
      AND tenderDossierHeavyParseDone(item.tenderDossier) === true
      AND !item.tenderDossier?.kosztorys?.ok
      → parse_failed          // ★ CR-02: ZIP już analizowany, brak snapshotu
4. if dossierParseFailed → parse_failed
5. if hasPrzedmiarCandidate(item) → candidate_ready
     // (zawiera archive_candidate gdy heavy JESZCZE nie Done)
6. → no_candidate
```

### 3.3 Diagram (zamrożony)

```text
F2?
 ├─ NIE → (bez Discovery F2)
 └─ TAK
      ├─ parse w toku? ──────────────► parse_running
      ├─ archive_candidate
      │    ∧ heavyDone
      │    ∧ !kosztorys.ok ──────────► parse_failed   (ZIP-aware copy)
      ├─ dossierParseFailed? ────────► parse_failed
      ├─ hasPrzedmiarCandidate? ─────► candidate_ready
      │    (ATH/XLSX/PDF LUB ZIP gdy heavy jeszcze nie Done)
      └─ else ───────────────────────► no_candidate
```

### 3.4 Reguły twarde

1. **Zero** unpack ZIP w warstwie Discovery UI (zakaz Variant C).  
2. **Zero** zmian `tenderDossierHeavyParseDone` / heavy parser / Edge zip-catalog.  
3. Re-parse = **REUSE** `retryDossierParse` + guard `isCostRegressionF2` (Epic A AC-A11).  
4. Max **1** concurrent re-parse per tender.  
5. **Zakaz** batch re-parse wszystkich F2+ZIP.  
6. F1 / Epic B — **bez** copy F2/`no_candidate` ZIP.

---

## 4. Macierz komunikatów UI (zamrożona)

### 4.1 Outcome / Offer Run / sticky / empty Kosztorysy

| Stan UI | Warunek discovery | `phaseLabelPl` (primary) | Secondary / hint |
|---------|-------------------|--------------------------|------------------|
| **Brak dokumentów** | `no_candidate` | **Brak przedmiaru w dokumentach** | „Dołącz ATH, XLSX, PDF przedmiaru lub archiwum ZIP z kosztorysem — bez tego nie da się wyliczyć oferty.” |
| **ZIP wykryty** (przed / bez heavy Done) | `candidate_ready` ∧ `hasArchiveCandidate` | **W dokumentach jest archiwum ZIP** | „Uruchom analizę kosztorysu — system przeszuka ZIP pod kątem ATH/XLSX/PDF. To nie gwarantuje ceny oferty.” |
| **Kandydat pliku** (ATH/XLSX/PDF, bez archive-only) | `candidate_ready` ∧ ¬archive-only | **Brak odczytanego kosztorysu** | (Epic A — bez regresji) „W dokumentach jest kandydat przedmiaru — uruchom ponownie analizę kosztorysu.” |
| **Analiza w toku** | `parse_running` | **Trwa analiza kosztorysu…** | „Po zakończeniu wycena uruchomi się automatycznie.” |
| **Analiza nieudana** (ogólna / sesja) | `parse_failed` ∧ ¬(archive∧heavyDone) | **Nie udało się odczytać kosztorysu** | „Sprawdź plik lub ponów analizę. To nie awaria kalkulatora oferty.” |
| **Analiza nieudana — ZIP już przeszukany** | `parse_failed` ∧ archive ∧ heavyDone | **Nie znaleziono kosztorysu w archiwum ZIP** | „Heavy przeanalizował załączniki ZIP, ale nie powstał snapshot kosztorysu. Sprawdź zawartość ZIP (ATH/XLSX/PDF) lub dołącz inny plik. To nie awaria kalkulatora oferty.” |
| **Analiza zakończona** (sukces) | `kosztorys.ok` ∧ PLN>0 | **Rekomendacja gotowa** | — (happy path TRE) |
| **Analiza zakończona** (nadal brak PLN) | snapshot/F1/inne | **Nie** „Brak przedmiaru…” / **nie** „brak w ZIP” jeśli nie F2 | Epic B / inne warningi — OOS CR-02 |

### 4.2 Flagi prezentacji (allowlist `data-*`)

`data-cost-regression-f2` · `data-cost-regression-discovery` · `data-cost-regression-archive="1"` (gdy `hasArchiveCandidate`) · `data-cost-regression-reparse-cta`

### 4.3 Helper copy (propozycja API — zamrożona intencja)

```text
resolveCostRegressionF2UiCopy(discovery, opts?: { archiveCandidate?: boolean; heavyDoneEmpty?: boolean })
```

Gdy `discovery === "candidate_ready"` ∧ `archiveCandidate` → wiersz **ZIP wykryty**.  
Gdy `discovery === "parse_failed"` ∧ `heavyDoneEmpty` ∧ `archiveCandidate` → wiersz **ZIP już przeszukany**.

---

## 5. CTA (zamrożone)

| Stan | Primary CTA | Secondary |
|------|-------------|-----------|
| `no_candidate` | **Dołącz przedmiar** → tab Dokumenty | — |
| `candidate_ready` (ZIP lub plik) | **Ponów analizę kosztorysu** | Dołącz inny plik |
| `parse_running` | disabled + spinner | — |
| `parse_failed` (w tym ZIP+heavyDone) | **Ponów analizę** | Dołącz inny plik |

**Guard re-parse:** `isCostRegressionF2` ∧ ¬parse_running (Epic A).  
**Implementacja:** REUSE `triggerCostRegressionF2Reparse` / `retryDossierParse`.

---

## 6. Acceptance Criteria (zamrożone)

| ID | Kryterium |
|----|-----------|
| **AC-02-1** | Fixture: F2 + top-level `Dokumentacja….zip` → `hasArchiveCandidate` **true** · discovery ≠ `no_candidate` |
| **AC-02-2** | Fixture RCA-like: F2 + ZIP + `heavyParseDone` + `kosztorys` null → discovery **`parse_failed`** · copy zawiera sens „nie znaleziono… w archiwum ZIP” · **nie** „Brak przedmiaru w dokumentach” |
| **AC-02-3** | Fixture: F2 + ZIP + heavy **nie** Done → discovery **`candidate_ready`** · primary CTA **Ponów** · phaseLabel ZIP-aware |
| **AC-02-4** | Fixture: F2 + zero załączników → nadal **`no_candidate`** · „Brak przedmiaru w dokumentach” |
| **AC-02-5** | Fixture: F2 + tylko SWZ.pdf (bez ZIP/ATH) → **`no_candidate`** |
| **AC-02-6** | Fixture: top-level `.ath` (Epic A) → `candidate_ready` / zachowanie Epic A **bez regresji** |
| **AC-02-7** | F1 fixture → discovery F2 **null** / copy **nie** ZIP `no_candidate` |
| **AC-02-8** | Guard: re-parse **nie** startuje gdy `!isCostRegressionF2` |
| **AC-02-9** | Diff: **brak** zmian `tenders-bid-calculator` · `useTenderPricingAuto` resolve · OfferBoq engines · cloud-sync merge · Variant C unpack w Discovery |
| **AC-02-10** | `npm run build` PASS · test pure `scripts/test-cost-regression-02-discovery-zip.mjs` (lub rozszerzenie epic-a) |

---

## 7. Rollback

| Element | Rollback |
|---------|----------|
| `archive_candidate` / discovery priority | Revert helper → semantyka Epic A (ZIP znów `no_candidate`) |
| Copy ZIP-aware | Revert macierz → Epic A strings |
| CTA | Odłącz tylko jeśli dodano nowe wiring (prefer REUSE) |
| Dane po re-parse | **Zostają** |
| Regresja Bid PLN | Natychmiastowy revert bundle CR-02 — **nie** patchuj kalkulatora |

---

## 8. Allowlist (IMPLEMENT — po Owner GO)

| Plik / obszar | Zakres |
|---------------|--------|
| `src/lib/cost-regression-f2.ts` | `isArchiveCandidateFilename` · `hasArchiveCandidate` · rozszerzenie `hasPrzedmiarCandidate` · priorytet discovery §3.2 · copy ZIP-aware |
| Outcome / Offer Run / sticky / empty | Macierz §4 · `data-cost-regression-archive` |
| Test | `scripts/test-cost-regression-02-discovery-zip.mjs` |
| Changelog + docs closeout | wersja UI przy release |

**Zakaz allowlist:**  
`tenders-bid-calculator.ts` · `useTenderPricingAuto` resolve · OfferBoq pricing engines · `tender-document-resolver` rewrite · Edge zip-catalog · cloud-sync merge · Payroll · Epic B · Variant C (listZip w Discovery).

---

## 9. Out of Scope (twarde)

| Obszar | Status |
|--------|--------|
| Bid / `computeTenderBidProposal` | **ZAKAZ** |
| COST-PIPELINE / flaga / pricing auto resolve | **ZAKAZ** |
| AI Cost / OfferBoq engines | **ZAKAZ** |
| Payroll | **ZAKAZ** |
| Cloud Sync (nowy merge / klucze) | **ZAKAZ** |
| EPIC B | **ZAKAZ** |
| Variant C — Discovery unpack ZIP | **ZAKAZ** |
| Batch auto-repair F2+ZIP | **ZAKAZ** |
| Zmiana `tenderDossierHeavyParseDone` / heavy internals | **ZAKAZ** |
| Gwarancja PLN po Ponów | **NIE** (sukces = copy/CTA) |

---

## 10. Ryzyka (zamrożone mitygacje)

| Ryzyko | Mitygacja DF |
|--------|--------------|
| ZIP bez ATH → Ponów bez PLN | Copy §4: „nie gwarantuje ceny”; AC-02-2 po heavyDone → parse_failed |
| False `candidate_ready` na ZIP ze zdjęciami | Akceptowalne v1; Ponów 1×; ewentualnie heurystyka nazw = **osobny GO** (nie w tym DF) |
| Regresja Epic A labels | AC-02-4…02-7 · testy TRE Offer Run |
| Scope creep Variant C | §9 ZAKAZ |
| Storm parse | Guard F2 · max 1 · zakaz batch |

---

## 11. Kolejność IMPLEMENT (po Owner GO)

| Krok | Deliverable |
|------|-------------|
| M0 | Owner GO IMPLEMENTATION |
| M1 | `archive_candidate` + `hasPrzedmiarCandidate` OR |
| M2 | Priorytet discovery §3.2 (heavyDone → parse_failed) |
| M3 | Macierz copy ZIP-aware + CTA (Outcome/sticky/empty) |
| M4 | Testy AC-02-1…10 · build · changelog · PV |

---

## 12. Relacja do Epic A

| Element Epic A | CR-02 |
|----------------|-------|
| F2 / F1 classifier | **Bez zmian** |
| Enum discovery | **REUSE** (+ nowe ścieżki wejścia) |
| Macierz „Brak przedmiaru…” | Tylko gdy **naprawdę** `no_candidate` |
| Re-parse guard | **REUSE** |
| Lukę DF A (ZIP) | **Zamyka** Variant D |

---

## 13. STOP

```text
DESIGN FREEZE COMPLETE — COST-REGRESSION-02 DISCOVERY-ZIP (Variant D)
Dokument: docs/architecture/COST-REGRESSION-02-DISCOVERY-ZIP-DESIGN-FREEZE.md

Zamrożone:
  archive_candidate = top-level .zip/.7z
  archive → candidate_ready (gdy heavy nie Done)
  archive ∧ heavyDone ∧ !kosztorys → parse_failed (ZIP-aware)
  macierz copy · CTA · AC-02-1…10 · allowlist · OOS

Bid / COST-PIPELINE / AI Cost / OfferBoq / Payroll / Sync / Epic B / Variant C = ZAKAZ

Bez implementacji.
Bez commit.
Bez push.

Czekam na Owner GO do IMPLEMENTATION.
```
