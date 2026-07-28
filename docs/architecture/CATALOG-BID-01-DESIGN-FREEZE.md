# CATALOG-BID-01 — DESIGN FREEZE

> **ID:** CATALOG-BID-01-DESIGN-FREEZE  
> **PROGRAM:** CATALOG-BID-01 — odzyskanie ilości pod wycenę katalogową  
> **STATUS:** **DESIGN FREEZE · Owner GO** · **IMPLEMENT COMPLETE** (UI **2.65.68**) · patrz [`CATALOG-BID-01-CLOSEOUT.md`](CATALOG-BID-01-CLOSEOUT.md)  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** FEATURE / Przetargi · **#CORE-013** — zero Payroll write-path · zero zmiana kontraktu wyceny  
> **RCA wejściowe:** [`CATALOG-BID-01-RCA.md`](CATALOG-BID-01-RCA.md) · Root Cause **zaakceptowany**  
> **Powiązane CLOSED:** COST-PIPELINE-01 (OfferBoq → Bid → Outcome) — **nie ruszać**  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (DF):
  Odzyskaj dodatnie ilości DO snapshotu kosztorysu
  PRZED computeTenderBidProposal / resolveTenderBidPricingMode.

ZAMROŻONE:
  computeTenderBidProposal = SSOT kalkulacji Bid
  resolveTenderBidPricingMode = BEZ zmian (nie rozluźniać)
  F1 / F2 / F3 / F4 = BEZ zmian (kontrakt early-return)
  COST-PIPELINE = BEZ zmian

JEDYNY PUNKT NAPRAWY:
  TenderKosztorysSnapshot.catalogQuantities
  (materializacja przy budowie / normalizacji snapshotu)

IMPLEMENT: COMPLETE (2.65.68) — patrz CLOSEOUT.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (przed przyszłym IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: TAK*  (*istniejący dossier / pipeline LS — bez nowych kluczy payroll)
G3 Cloud Sync:   TAK*  (*snapshot kosztorysu już w dossier sync — BEZ zmiany merge SSOT)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE*  (*useTenderPricingAuto / COST-PIPELINE poza allowlist)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE

Wynik: Gate Boundary G2/G3 przy IMPLEMENT (#CORE-014) — tylko pola snapshotu kosztorysu.
Owner GO IMPLEMENTATION: WYMAGANE przed kodem.
STABILIZATION WINDOW: ACTIVE.
```

---

## 1. Cel DF

Zmniejszyć udział ścieżki **F1** (`ok:false` · `recommendedBidPln=null` · warning o braku ilości), gdy w danych przetargu **już istnieją** dodatnie ilości w warstwie przedmiaru / preview / `rows`, ale **nie trafiają** do SSOT wyceny katalogowej.

**Nie** zmieniamy:

- kontraktu wyceny (`resolveTenderBidPricingMode`, F1–F4),
- COST-PIPELINE / OfferBoq / Outcome,
- silnika Bid (Kp, marża, agregacja stawek).

Naprawa = **wejście ilości** do jedynego pola SSOT, które kalkulator już czyta.

---

## 2. Ocena kandydatów (odzysk quantity)

| # | Miejsce | Rola dziś | Czy odzyskuje F1? | Ryzyko | Werdykt DF |
|---|---------|-----------|-------------------|--------|------------|
| **1** | **Parser ATH** | Produkuje `AthPreviewResult.rows` (qty, unit, opis) | Tak, gdy qty giną **w parserze** | Wysokie · **OOS: parser rewrite** · PDF/Edge creep | **ODRZUCONY** jako punkt naprawy |
| **2** | **`catalogQuantities`** | SSOT ilości pod catalog Bid + UI Kosztorys V4; budowa: `buildCatalogQuantitiesFromPreview` w `athPreviewToSnapshot` | Tak — to pole czyta `resolveCatalogQuantities` **najpierw** | Niskie–średnie · wąski zakres · zgodne z SSOT UI | **WYBRANY — jedyny punkt** |
| **3** | **`rows.quantity`** | Snapshot priced rows (cap 500); fallback w `resolveCatalogQuantities` **tylko gdy** `catalogQuantities` puste / brak | Częściowo — już jest fallback w kalkulatorze; **nie** działa gdy `catalogQuantities.length > 0` a qty po filtrze = 0 | Średnie · drugi równoległy mechanizm w Bid **zabroniony** (zmiana kontraktu helpera) | **ODRZUCONY** jako osobna naprawa; może być **źródłem danych** do wypełnienia `catalogQuantities` |
| **4** | **Merge dossier** | `pickBetterKosztorys` wybiera cały snapshot (ATH > …) | Tylko pośrednio (który snapshot wygrywa) | Wysokie · regresja jakości merge TP190/TP200 · G3 | **ODRZUCONY** jako punkt odzysku qty |
| **5** | **Snapshot kosztorysu** (jako warstwa) | `TenderKosztorysSnapshot` = kontener | Tak — **jeśli** naprawa = materializacja pola w snapshotcie | Niskie gdy ograniczona do `catalogQuantities` | **OBJĘTY** przez punkt #2 (to samo miejsce architektoniczne) |

### 2.1 Zakaz równoległych mechanizmów

```text
ZAKAZ:
  ✗ zmieniać resolveCatalogQuantities / resolveTenderBidPricingMode
  ✗ drugi fallback qty wewnątrz computeTenderBidProposal
  ✗ osobny „qty patch” w useTenderPricingAuto / COST-PIPELINE
  ✗ równoległa naprawa w merge + parser + catalogQuantities
  ✗ wymuszanie Bid z estimatedValuePln / SWZ bez qty

DOZWOLONE (jeden tor):
  ✓ jeden tor zapisu dodatnich ilości → catalogQuantities
  ✓ ewentualne skopiowanie z już sparsowanych rows → catalogQuantities
    (nadal jeden SSOT field, przed kalkulatorem)
```

---

## 3. Wybrany punkt naprawy (ZAMROŻONY)

### 3.1 SSOT

| Element | Wartość zamrożona |
|---------|-------------------|
| **Pole** | `TenderKosztorysSnapshot.catalogQuantities: TenderCatalogQuantityLine[]` |
| **Builder SSOT** | `buildCatalogQuantitiesFromPreview` (+ wywołanie z `athPreviewToSnapshot`) |
| **Opcjonalny normalizer (ten sam tor)** | Jedna pure funkcja typu `ensureKosztorysCatalogQuantities(snapshot)` — **tylko** uzupełnia / naprawia `catalogQuantities`; **nie** zmienia `ok`, ATH totals, merge, parsera |
| **Konsument (bez zmian)** | `resolveCatalogQuantities` → `resolveTenderBidPricingMode` → `computeTenderBidProposal` |

### 3.2 Uzasadnienie

1. **RCA:** F1 = brak ATH total **i** brak qty po `resolveCatalogQuantities`.  
2. Kalkulator **już** preferuje `catalogQuantities` nad `rows` — to właściwy SSOT.  
3. UI Kosztorys V4 / Bid panel też traktują `catalogQuantities` jako primary — naprawa w tym polu = spójność Outcome + zakładki.  
4. Odzysk **przed** kalkulatorem = F1/F2/F3/F4 i mode resolution **bez zmian**.  
5. Parser rewrite / PDF / Edge = OOS; jeśli qty są w `preview.rows` lub `snapshot.rows`, wystarczy poprawna materializacja `catalogQuantities`.  
6. Jeden tor = brak dual-path w Bid i brak „cichej” drugiej ceny.

### 3.3 Co wolno w IMPLEMENT (kierunek, nie kod)

| Dozwolone | Niedozwolone |
|-----------|--------------|
| Wąski fix filtra / mapowania w `buildCatalogQuantitiesFromPreview` (bez rewrite parsera ATH) | Zmiana `isLikelyCatalogQuantityRow` „na wszystko przepuszczaj” bez testów regresji formularzy |
| `ensureKosztorysCatalogQuantities`: gdy brak użytecznych qty w `catalogQuantities`, zbuduj z `rows` (description + qty > 0), z zachowaniem cap `CATALOG_QUANTITIES_CAP` | Zmiana `resolveCatalogQuantities` żeby ignorować niepuste `catalogQuantities` z zerowymi qty |
| Testy pure: snapshot in → `catalogQuantities` out | Hook pricing / Outcome / UI copy |
| Reuse istniejącego filtra noise (P3-AUDIT) | Nowy równoległy katalog ilości poza snapshotem |

---

## 4. Architektura (zamrożona)

```text
┌──────────────────────────────────────────────────────────────┐
│  AthPreviewResult / istniejący parse (OOS — bez rewrite)     │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  ★ JEDYNY PUNKT NAPRAWY (CATALOG-BID-01)                     │
│                                                              │
│  athPreviewToSnapshot                                        │
│    └─ buildCatalogQuantitiesFromPreview                      │
│  (+ opcjonalnie ensureKosztorysCatalogQuantities)            │
│                                                              │
│  → TenderKosztorysSnapshot.catalogQuantities  ← SSOT qty     │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             │  dossier / pipeline (bez zmiany merge)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  computeCatalogBidProposalForPricingAuto                     │
│    → computeTenderBidProposal   ← BEZ ZMIAN                  │
│         resolveTenderBidPricingMode  ← BEZ ZMIAN             │
│         resolveCatalogQuantities     ← BEZ ZMIAN             │
│         F1 / F2 / F3 / F4            ← BEZ ZMIAN             │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  COST-PIPELINE (CLOSED) — OfferBoq first, catalog fallback   │
│  ← POZA ZAKRESEM CATALOG-BID-01                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.1 Relacja do ścieżek RCA

| Po IMPLEMENT (zgodnie z DF) | Oczekiwany efekt |
|-----------------------------|------------------|
| Qty odzyskane do `catalogQuantities` | Mode `catalog` · Bid `ok:true` (gdy agregat direct > 0) — **F1 nie odpala** |
| Nadal brak qty i brak ATH | **F1 bez zmian** — poprawne zachowanie kontraktu |
| Brak kosztorysu `ok` | **F2 bez zmian** |
| ATH total > 0 | **`ath_priced`** — poza celem catalog qty |
| Catalog qty, direct ≤ 0 | **F4 bez zmian** |

---

## 5. Allowlist (IMPLEMENT — po Owner GO)

| Plik / obszar | Zakres |
|---------------|--------|
| `src/lib/tenders-bzp-brief.ts` | `buildCatalogQuantitiesFromPreview` · `athPreviewToSnapshot` (wąsko) |
| Nowy lub istniejący pure helper w `src/lib/` | `ensureKosztorysCatalogQuantities` (tylko `catalogQuantities`) — **opcjonalnie**, jeden tor |
| `src/lib/tender-catalog-quantity-filter.ts` | Tylko jeśli regresja noise udowodniona testem — **bez** otwarcia formularzy SWZ |
| `scripts/test-catalog-bid-01-*.mjs` (lub równoważny) | Testy pure: puste/niepełne `catalogQuantities` → odzysk z rows / preview |
| Docs closeout po IMPLEMENT | `CATALOG-BID-01-CLOSEOUT.md` (później) |

**Choke-point wywołania normalizera (jeśli dodany):** wyłącznie przy materializacji / odświeżeniu snapshotu kosztorysu (ten sam tor co `athPreviewToSnapshot`), **nie** w `useTenderPricingAuto`, **nie** w merge LWW cloud.

---

## 6. Out of scope (ZAMROŻONE)

| Obszar | Status |
|--------|--------|
| COST-PIPELINE / `resolveTenderPricingAutoProposal` | **OOS** |
| OfferBoq / AI-COST / TRE-02 | **OOS** |
| HOTFIX poza tym DF | **OOS** |
| UI / copy Outcome / CTA | **OOS** |
| Outcome / Recommendation Result | **OOS** |
| Parser rewrite ATH / PDF / Edge | **OOS** |
| `computeTenderBidProposal` · `resolveTenderBidPricingMode` · F1–F4 | **OOS — zamrożone** |
| `resolveCatalogQuantities` (zmiana semantyki) | **OOS** |
| Merge dossier `pickBetterKosztorys` / cloud-sync merge | **OOS** |
| Work Catalog / stawki / KNR / klasyfikator UNKNOWN | **OOS** |
| Payroll / week / bootstrap | **OOS** |
| Wymuszanie Bid z `estimatedValuePln` | **OOS · zakaz** |

---

## 7. Migration plan (po Owner GO IMPLEMENTATION)

| Etap | Działanie | Gate |
|------|-----------|------|
| **M0** | Owner GO IMPLEMENTATION | Bez GO = stop |
| **M1** | Testy failing-first: snapshot z qty w `rows` / preview, puste użyteczne `catalogQuantities` → dziś F1 | Pure scripts |
| **M2** | Wąski fix buildera / `ensureKosztorysCatalogQuantities` (jeden tor → `catalogQuantities`) | Allowlist only |
| **M3** | Testy PASS: qty w SSOT → `resolveTenderBidPricingMode` = `catalog` (bez zmiany tych funkcji) | Verify kontrakt F1 nadal dla pustych |
| **M4** | `npm run build` + relevant smoke/test | Development §7 |
| **M5** | Changelog + closeout docs | Bez UI copy (OOS) |
| **M6** | Commit / push **tylko** na osobne polecenie Ownera | Workflow release |

**Migracja danych:** brak osobnej migracji KV. Snapshoty legacy zyskują qty przy **następnym** rebuildzie snapshotu / parse (istniejący mechanizm stale parser — **bez** bump `CURRENT_PARSER_VERSION` w tym DF, chyba że Owner GO osobno; domyślnie **nie bumpować**).

---

## 8. Rollback

| Scenariusz | Akcja |
|------------|-------|
| Regresja formularzy (noise w `catalogQuantities`) | Revert commit allowlist · filtr noise zostaje |
| Fałszywe Bid na śmieciowych wierszach | Rollback normalizera · F1 wraca dla tych case |
| Brak wpływu na F1 w prod | Rollback · otwórz osobne RCA upstream (parser — poza tym DF) |
| COST-PIPELINE / Outcome regresja | **Nie powinno** — jeśli wystąpi, revert; DF zabraniał tych plików |

Rollback = **git revert** wąskiego bundle — bez feature-flag (chyba że IMPLEMENT doda opcjonalną flagę; **domyślnie DF nie wymaga** nowej flagi LS).

---

## 9. Acceptance criteria

| ID | Kryterium | Mierzalne |
|----|-----------|-----------|
| **AC-1** | `resolveTenderBidPricingMode` / F1–F4 **bez** diff semantyki | Testy kontraktu: puste qty+ATH → nadal F1 |
| **AC-2** | Gdy snapshot ma dodatnie qty w `rows` (lub preview.rows), a `catalogQuantities` było puste / bez qty > 0 — po materializacji `catalogQuantities` ma ≥1 linię z qty > 0 | Pure test |
| **AC-3** | Po AC-2: `computeTenderBidProposal` (bez `offerBoqDirect`) zwraca `pricingMode: "catalog"` i `ok:true` **gdy** agregat direct > 0 | Pure test |
| **AC-4** | Brak zmian w plikach COST-PIPELINE / OfferBoq / Outcome / Edge | `git diff` allowlist |
| **AC-5** | Formularz SWZ / noise rows **nie** wracają masowo do `catalogQuantities` | Regresja filtra P3-AUDIT |
| **AC-6** | Świadomie pusty przedmiar (brak qty, brak ATH) → nadal F1 | Kontrakt zachowany |
| **AC-7** | Build PASS | `npm run build` |

**NIE jest AC:** „każdy przetarg dostaje cenę” · „OfferBoq zawsze działa” · zmiana copy UI.

---

## 10. Ryzyka

| Ryzyko | Wpływ | Mitygacja DF |
|--------|-------|--------------|
| Qty nigdy nie było w preview/rows (prawdziwy brak przedmiaru) | F1 zostaje — Owner może oczekiwać ceny | AC-6 · komunikat RCA: nie każdy tender musi mieć Bid |
| Zbyt agresywny filtr / zbyt luźny filtr | Fałszywe F1 albo śmieciowy Bid | AC-5 · reuse `isLikelyCatalogQuantityRow` |
| `catalogQuantities.length > 0` z samymi qty=0 | Dziś `resolveCatalogQuantities` **nie** spada na rows | Normalizer musi **naprawić pole** (puste użyteczne → rebuild), nie zmieniać helpera Bid |
| Pokusa fixu w kalkulatorze | Rozluźnienie kontraktu wyceny | Allowlist + zakaz §2.1 |
| Pokusa bump parserVersion / rescan all | Storm parse / sync | DF: **bez** bump v4 domyślnie |
| Merge wybiera „gorszy” snapshot bez qty | F1 mimo fix buildera | OOS merge; osobne RCA jeśli pomiar to potwierdzi |
| Scope creep → parser/PDF | Stabilization breach | Out of scope §6 |

---

## 11. Relacja do COST-PIPELINE-01

| Warstwa | Status |
|---------|--------|
| OfferBoq → Bid | **CLOSED** — nie zmieniać |
| Catalog fallback | **Pozostaje** — ten DF **poprawia wejście** catalog, nie orchestration |
| Outcome „Brak rekomendowanej ceny” | Poprawi się **pośrednio** gdy F1 spadnie dzięki qty — **bez** edycji Outcome |

---

## 12. STOP

```text
DESIGN FREEZE COMPLETE — CATALOG-BID-01
Dokument: docs/architecture/CATALOG-BID-01-DESIGN-FREEZE.md

Jedyny punkt naprawy: TenderKosztorysSnapshot.catalogQuantities
(buildCatalogQuantitiesFromPreview / ensure… — przed kalkulatorem)

Bez implementacji.
Bez commit.
Bez push.

Czekam na Owner GO do IMPLEMENTATION.
```
