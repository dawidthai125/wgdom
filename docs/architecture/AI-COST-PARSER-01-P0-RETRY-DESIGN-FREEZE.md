# AI-COST-PARSER-01 — P0-RETRY · DESIGN FREEZE

> **ID:** AI-COST-PARSER-01-P0-RETRY-DESIGN-FREEZE  
> **EPIC / slice:** AI-COST-PARSER-01 · **P0-RETRY** (F2 soft-invalidate)  
> **STATUS:** **DESIGN FREEZE · IMPLEMENTED (lokalnie)** · **COMMIT/PUSH: oczekuje Owner GO** · tip baseline **2.65.77**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **Baseline tip:** **2.65.77** / **`a061bbd`** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **PLAN:** [`AI-COST-PARSER-01-PLAN.md`](AI-COST-PARSER-01-PLAN.md)  
> **IMPLEMENT:** [`AI-COST-PARSER-01-P0-RETRY-IMPLEMENTATION-REPORT.md`](AI-COST-PARSER-01-P0-RETRY-IMPLEMENTATION-REPORT.md)  
> **PV:** [`AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md`](AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md)  
> **CLOSEOUT:** [`AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md`](AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md)  
> **Klasa:** FEATURE / Przetargi dossier retry · **#CORE-013** · **#CORE-014**

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (P0-RETRY):
  Usunąć blokadę ponownego Heavy po terminalnym:
    zipUnpackOk === false  ∧  heavyParseDone === true

  REUSE ONLY:
    applyForceHeavyRescanAt + retryNonce
  ZERO nowego mechanizmu retry / pętli Heavy.

IMPLEMENT: ZABLOKOWANY do Owner GO IMPLEMENTATION.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE* (*brak nowych kluczy LS; REUSE pole dossier.forceHeavyRescanAt)
G3 Cloud Sync:   NIE* (*bez edycji cloud-sync.ts / DATA_KEYS;
                       persist local patch jak istniejący Force — REUSE onUpdate)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE* (*bez nowych tras; CTA Ponów F2 bez zmian copy)

Wynik: ALL-NIE · Gate GREEN
Owner GO IMPLEMENTATION: WYMAGANE przed kodem
Bundle: FEATURE only · zakaz mixed FEATURE+CORE
```

---

## 1. Cel zamrożony

| Cel | Opis |
|-----|------|
| **Odblokowanie** | F2 „Ponów analizę” przy terminalnym A **musi** uruchomić prawdziwy Heavy E-RUN |
| **REUSE** | Wyłącznie `applyForceHeavyRescanAt` + istniejący `retryNonce` / E-RUN force path |
| **Zero duplikatu** | Zakaz drugiej pętli Heavy, zakaz ręcznego kasowania `parsedAt` / bump `parserVersion` jako invalidate |
| **OPS** | Po deploy: możliwe potwierdzenie lub wykluczenie aktywnego błędu unpack na `08dee178` |

**Sukces P0-RETRY ≠** naprawa Edge/JSZip/parserów.  
**Sukces P0-RETRY =** Ponów przy terminalnym A nie jest no-op.

---

## 2. Zakres IN (zamrożony)

| ID | IN |
|----|-----|
| **I1** | Pure predykat `shouldSoftInvalidateOnF2ZipRetry(dossier, docs)` |
| **I2** | W `retryDossierParse`: gdy predykat **true** → `applyForceHeavyRescanAt` + `onUpdate(..., { persist: "local" })` + clear inflight/flags (jak `forceHeavyRescan`) + `retryNonce++` |
| **I3** | Gdy predykat **false** → wyłącznie dotychczasowe `retryNonce++` (+ clear flags jak dziś) |
| **I4** | Testy pure + regresja ZIP-UNPACK copy + Force CTA healthy |
| **I5** | OPS re-verify fixtures po release (poza kodem tego DF) |

**Zamrożony flow:**

```text
User: F2 Ponów → retryDossierParse
  IF shouldSoftInvalidateOnF2ZipRetry(dossier, docs):
       forceRescanAtRef = ISO
       onUpdate({ tenderDossier: applyForceHeavyRescanAt(dossier) }, { persist: "local" })
       clear inflight / building / parseFailed  (REUSE body forceHeavyRescan)
       retryNonce++
  ELSE:
       clear flags + retryNonce++   (AS-IS)
  → E-RUN: forceActive ∨ !heavyParseDone → pełny cost/unpack
```

---

## 3. Zakres OUT (zamrożony — twarde)

```text
✗ Nowy mechanizm retry / druga pętla Heavy / soft-gate „nigdy Done”
✗ Ręczne nullowanie parsedAt / kosztorys poza applyForceHeavyRescanAt
✗ Bump parserVersion jako invalidate
✗ Zmiana shouldShowForceHeavyRescanCta (healthy MULTI · kosztorys.ok)
✗ Zmiana copy A/B/C / CR-02 discovery enum
✗ Parsery: ath-parser · pdf-przedmiar · tenders-bzp-doc-parse · Edge zip-catalog
✗ Discovery rewrite (tender-cost-discovery)
✗ Bid / computeTenderBidProposal / OfferBoq / AI-COST-01 S1–S7 / AI-COST-02-B
✗ Aggregate / Branch / cost-multi-02 (poza importem applyForceHeavyRescanAt)
✗ Payroll · cloud-sync.ts · DATA_KEYS · Edge functions · Bootstrap
✗ Telemetria A/B/C/D (zipOpenOk · zipFailStage · zipCatalogSource) — osobny slice
✗ Nowe trasy / shell / GDS / Dashboard
✗ window.confirm na F2 Ponów (Force ma własny confirm — nie kopiować na F2)
```

---

## 4. Kontrakt retry (zamrożony)

### 4.1 Predykat — jedyna prawda

```text
shouldSoftInvalidateOnF2ZipRetry(dossier, docs) === true  IFF ALL:

  (1) docs zawiera ≥1 top-level .zip LUB .7z
      (REUSE isZipFilename / is7zFilename — jak CR-02 archive)

  (2) dossier.scanSummary?.zipUnpackOk === false
      (strict false — null/undefined/true → predykat FALSE)

  (3) tenderDossierHeavyParseDone(dossier) === true
      SSOT: istniejąca funkcja z tender-dossier-pipeline
      (uwzględnia forceHeavyRescanAt → false; nie reimplementować)

  (4) dossier.kosztorys?.ok !== true
      (brak użytecznego snapshotu — F2)

  (5) !dossier.forceHeavyRescanAt
      (już w toku force → nie patchuj ponownie zbędnie;
       i tak retryNonce++ jak Force przy drugim kliku)
```

**FALSE →** zachowanie AS-IS (`retryNonce++` only).  
Przykład: `08ded027` (brak `zipUnpackOk===false` / `heavyParseDone===false`) → predykat false.

### 4.2 Mechanizm (SSOT Force)

| Element | Zamrożone |
|---------|-----------|
| Soft-invalidate | **Tylko** `applyForceHeavyRescanAt(dossier, iso)` |
| Flaga | `dossier.forceHeavyRescanAt: string` (istniejące pole) |
| HeavyDone | `tenderDossierHeavyParseDone` → `false` gdy force ustawione (AS-IS) |
| E-RUN | `forceActive` → pomija early-return; `existingDossierForBuild = null` (AS-IS Force) |
| Auto unpack retry | Bez zmian — 1× w `prepareTenderDossierParseSession` |
| Clear force | REUSE success/fail w `useTenderDossierHeavyLazy` (AS-IS) |
| Circuit breaker | `HEAVY_MAX_RUNS_PER_KEY` bez zmian |
| UI copy F2 | Bez zmian (stan A copy z ZIP-UNPACK DF) |
| Persist | `{ persist: "local" }` jak `forceHeavyRescan` — **nie** nowy cloud write-path |

### 4.3 Zakazy kontraktu

- Auto-Ponów w pętli / batch portfolio  
- Druga flaga invalidate obok `forceHeavyRescanAt`  
- Zmiana semantyki ZIP-UNPACK A/B/C  
- Wywołanie `forceHeavyRescan` UI confirm z F2  

---

## 5. Allowlista plików (zamrożona)

### 5.1 IN

| Plik | Dozwolona zmiana |
|------|------------------|
| `src/lib/cost-parser-zip-unpack.ts` | **Dodanie** pure `shouldSoftInvalidateOnF2ZipRetry` (+ ewentualny re-export typów pomocniczych). **Bez** zmiany macierzy A/B/C copy. |
| `src/app/hooks/useTenderDossierHeavyLazy.ts` | **Tylko** `retryDossierParse`: warunkowy REUSE `applyForceHeavyRescanAt` / `forceRescanAtRef` / clear inflight — wzorzec 1:1 z `forceHeavyRescan` (bez confirm). |
| `scripts/test-cost-parser-01-f2-retry-invalidate.mjs` | **NOWY** — T1–T3 |
| `scripts/test-cost-multi-02-force-rescan.mjs` | **Opcjonalnie** +1–2 asercje: `shouldShowForceHeavyRescanCta` healthy bez regresji |

### 5.2 Import REUSE (read-only z allowlist IN)

- `applyForceHeavyRescanAt` z `cost-multi-02-force-rescan.ts` — **import only**, bez edycji pliku (chyba że Arch Review wymusi re-export helpera — preferuj zip-unpack).  
- `tenderDossierHeavyParseDone` — import only.  
- `isZipFilename` / `is7zFilename` — import only.

### 5.3 Zakaz diff

Wszystko spoza §5.1 — w szczególności OUT §3.

---

## 6. Definition of Done (zamrożony)

### 6.1 Przed COMMIT

- [ ] Predykat zgodny z §4.1 · testy T1–T3 PASS  
- [ ] Terminalne A + Ponów → `forceHeavyRescanAt` ustawione (unit/semantyka)  
- [ ] Non-A Ponów → brak `applyForceHeavyRescanAt`  
- [ ] `test-cost-parser-01-zip-unpack.mjs` PASS (copy A/B/C)  
- [ ] `test-cost-multi-02-force-rescan.mjs` PASS (CTA healthy)  
- [ ] Diff ⊆ allowlista §5.1  
- [ ] Gate §0 ALL-NIE · zero `cloud-sync.ts` / Payroll  

### 6.2 Po PUSH / tip (OPS — Owner)

Fixture **`08dee178-1010-dbe7-ebd1-650001a84a9f`:**

| Check | Pass |
|-------|------|
| Ponów → Heavy startuje (nie no-op) | TAK |
| `parsedAt` ≠ `2026-07-28T19:02:03.820Z` | TAK |
| `zipInnerCount > 0` **lub** świeży `zipUnpackOk===false` po run | TAK |
| Rozstrzygnięcie unpack OK vs fail udokumentowane | TAK |

Fixture **`08ded027-…`:** Ponów / otwarcie nie regresuje startu Heavy.

### 6.3 CLOSE

- [ ] Release note / tip w `09` (osobny docs commit na prośbę)  
- [ ] CLOSEOUT P0-RETRY  

---

## 7. Testy regresyjne (zamrożone)

| ID | Plik / typ | Asercja |
|----|------------|---------|
| **T1** | NOWY script · pure | Predykat **true** tylko: ZIP/7Z ∧ `zipUnpackOk===false` ∧ `heavyParseDone` ∧ `!kosztorys.ok` ∧ `!forceHeavyRescanAt` |
| **T2** | NOWY script · pure | Predykat **false**: brak archiwum · `zipUnpackOk===true` · `null` · `!heavyParseDone` · `kosztorys.ok` |
| **T3** | NOWY script · pure | Po `applyForceHeavyRescanAt` → `tenderDossierHeavyParseDone===false` |
| **T4** | `test-cost-parser-01-zip-unpack.mjs` | Copy / stany A/B/C **bez regresji** |
| **T5** | `test-cost-multi-02-force-rescan.mjs` | `shouldShowForceHeavyRescanCta` dla healthy **bez regresji** |
| **T6** | OPS manual | `08dee178` po tipie — §6.2 |

**Zakaz:** E2E pełnego Edge download w unit (OPS = manual / read-only probe).

---

## 8. Ryzyka (zamrożone + mitygacja)

| Ryzyko | Poziom | Mitygacja DF |
|--------|--------|--------------|
| Storm ZIP / pętla Heavy | Średni | Predykat wąski · `HEAVY_MAX_RUNS` · bez auto-loop |
| Regresja Force CTA healthy | Średni | Zakaz edycji `shouldShowForceHeavyRescanCta` · T5 |
| Artifact cache stary full-hit | Średni | Force path: `existingDossierForBuild=null` (AS-IS) |
| Soft-invalidate przy B/C (`zipUnpackOk=true`) | Niski | Strict `=== false` |
| Sync / persist storm | Niski | REUSE local patch Force · #CORE-013 |
| Mobile podwójny confirm | Niski | Brak confirm na F2 Ponów |

---

## 9. Boundary Check (#CORE-013 / #CORE-014)

| Check | Werdykt |
|-------|---------|
| FEATURE vs CORE | **FEATURE** — retry UX/ops dossier Przetargi |
| Mixed FEATURE+CORE w jednym commit | **ZAKAZ** |
| Payroll write-path | **NIE** |
| `cloud-sync.ts` / DATA_KEYS | **NIE** |
| Nowy Edge endpoint | **NIE** |
| Shared App providers / shell | **NIE** |
| AI-COST-01 Freeze (S1–S7 / Bid) | **NIE naruszony** — zero touch |
| COST-MULTI Force kontrakt | **REUSE** `applyForceHeavyRescanAt` — bez zmiany CTA healthy |
| Tip SSOT | bump tylko w `09` przy release docs |

---

## 10. Potwierdzenia zgodności (zamrożone)

| Wymaganie | Potwierdzenie DF |
|-----------|------------------|
| Brak naruszenia **AI-COST-01 Freeze** | **TAK** — OUT Bid / OfferBoq / S1–S7 |
| Brak zmian **parserów** | **TAK** — OUT ath/pdf/zip listing |
| Brak zmian **Bid** | **TAK** |
| Brak zmian **Payroll** | **TAK** — Gate G1 NIE |
| Brak zmian **Cloud** (`cloud-sync.ts`) | **TAK** — Gate G3 NIE |
| **SSOT FIRST** | **TAK** — `tenderDossierHeavyParseDone` + `forceHeavyRescanAt` jedyne invalidate |
| **REUSE FIRST** | **TAK** — wyłącznie `applyForceHeavyRescanAt` + `retryNonce` |
| **ZERO DUPLICATE LOGIC** | **TAK** — zakaz drugiej pętli / ad-hoc parsedAt clear |
| **#CORE-013** | **TAK** — FEATURE only · allowlista · Gate GREEN |
| **MOBILE FIRST** | **TAK** — bez nowego chrome; istniejący CTA F2 |

---

## 11. Odrzucone alternatywy (zamrożone)

| Alternatywa | Werdykt |
|-------------|---------|
| Clear `parsedAt` w `retryDossierParse` bez force | **ODRZUCONE** — omija SSOT Force / E-RUN |
| Bump `parserVersion` | **ODRZUCONE** |
| Rozszerzenie Force CTA na `!kosztorys.ok` | **ODRZUCONE** w tym slice (F2 ma Ponów; soft-invalidate w środku Ponów) |
| Soft-gate „nigdy HeavyDone przy zip fail” | **ODRZUCONE** (już w ZIP-UNPACK DF) |
| Telemetria A/B/C/D w tym samym commit | **ODRZUCONE** — osobny EPIC/slice |

---

## 12. Proces po FREEZE

```text
[DONE]  PLAN zaakceptowany Owner
[NOW]   DESIGN FREEZE (ten dokument) · FROZEN
[NEXT]  Architecture Review (krótki) — allowlista + predykat
[NEXT]  Owner GO IMPLEMENTATION
[THEN]  IMPLEMENT ⊆ §5 · TEST T1–T5 · COMMIT (na prośbę) · PUSH · tip
[THEN]  OPS VERIFY §6.2 · CLOSEOUT
```

**IMPLEMENT bez Owner GO = naruszenie procesu.**

---

## 13. Fixture referencyjne

| ID | Rola po P0-RETRY |
|----|------------------|
| `08dee178-1010-dbe7-ebd1-650001a84a9f` | Terminal A historyczny → Ponów **musi** odpalić Heavy |
| `08ded027-195e-191c-5fad-9500015f883f` | Heavy niedomknięty → predykat false; brak regresji startu |

---

```text
DESIGN FREEZE = FROZEN
Slice: AI-COST-PARSER-01 / P0-RETRY
Mechanizm: applyForceHeavyRescanAt + retryNonce ONLY
IMPLEMENT: ZABLOKOWANY do Owner GO
Tip baseline: 2.65.77 / a061bbd
```
