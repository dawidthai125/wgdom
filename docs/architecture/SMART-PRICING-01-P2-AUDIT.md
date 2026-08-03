# SMART-PRICING-01 P2 — AUDIT

> **ID:** SMART-PRICING-01-P2-AUDIT  
> **EPIC:** SMART-PRICING-01 · **Slice:** **P2** — Evidence z MARKET-SYNC staging (RO)  
> **STATUS:** **AUDIT COMPLETE** · oczekuje Owner Review / **ACCEPTED** → potem **GO DESIGN FREEZE P2**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH** · **NO DESIGN FREEZE** · **NO CODE**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO AUDIT** SMART-PRICING-01 P2 · PROJECT STATUS APPROVED  
> **Parents:** [`SMART-PRICING-01-DESIGN-FREEZE.md`](./SMART-PRICING-01-DESIGN-FREEZE.md) (epicki) · [`SMART-PRICING-01-AUDIT.md`](./SMART-PRICING-01-AUDIT.md) · [`SMART-PRICING-01-P1-CLOSE.md`](./SMART-PRICING-01-P1-CLOSE.md) · [`SMART-PRICING-01-P1-DESIGN-FREEZE.md`](./SMART-PRICING-01-P1-DESIGN-FREEZE.md) · [`MARKET-SYNC-01-P1-CLOSEOUT.md`](./MARKET-SYNC-01-P1-CLOSEOUT.md)  
> **Zależności CLOSED (REUSE):** SMART P0+P1 · MARKET-SYNC-01 P0–P1 · Product Quotes · Catalog Coverage · GLOBAL-UX-02 (UX unrelated)

```text
════════════════════════════════════════════════════════
SMART-PRICING-01 P2 AUDIT

P0 = CLOSED (Detect Quotes-first RO)
P1 = CLOSED (Evidence Quotes · Rank · Confidence · One-shot · Odrzuć)
P2 = Evidence z MS staging RO · merge + Rank B1 · REUSE P1 UI
OUT P2: Auto-publish · Save/commit · staging write · MS ownership
        · Cloud · Payroll · AI/Bid rewrite · fuzzy ON · scrapery

Live tip: 2.65.95 / d8b080e (P1 feature) · docs tip HEAD dad4c983
O-SP-D: SMART może czytać MS P1 staging RO (epicki DF FROZEN)
NEXT: Owner ACCEPTED → GO DESIGN FREEZE P2 (nie IMPLEMENT)
════════════════════════════════════════════════════════
```

---

## 0. Cel AUDIT P2

| Pytanie | Cel |
|---------|-----|
| Co P1 już domknął? | Evidence Quotes + Rank + Confidence + One-shot session + Odrzuć · flaga OFF |
| Co epicki DF mówi o P2? | SEARCH B — staging RO · `source=market_sync_staging` · OUT auto-publish |
| Jaki kontrakt MS wolno czytać? | `loadMarketSyncStagingLocal` · FEATURE LS `kw-market-sync-01-staging` · **nie** Publish |
| Jak nie ukraść ownership MS? | Zero Accept/Publish/commit · zero mutacji staging |
| Jaki thin slice? | Adapter staging→Evidence + merge + badge źródła · REUSE panel P1 |
| Docs tip? | Tip już = P1 CLOSED · refresh przed kodem P2 tylko jeśli live ≠ HEAD docs |

**OUT tego AUDIT:** wireframe szczegółowy · pełny DF P2 · IMPLEMENT · scrapery · MS P2 EPIC · Save P3.

---

## 1. Production baseline

### 1.1 Live tip (weryfikacja AUDIT)

```json
{
  "version": "2.65.95",
  "commit": "d8b080e",
  "timestamp": "2026-08-03T06:39:29.200Z"
}
```

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun |
| **UI version** | **2.65.95** |
| **Live commit prefix** | **`d8b080e`** (SMART-PRICING-01 **P1** feature) |
| **Docs tip on `main`** | **`dad4c983`** (P1 CLOSE + PV/RELEASE · tip sync) — może dogonić `version.json` po deploy docs |
| **SSOT tip** | [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| **Protected Core** | **GREEN** |
| **STABILIZATION** | **ACTIVE** |
| **Tryb** | **UTRZYMANIE** · brak otwartego workflow IMPLEMENT |

### 1.2 Domknięte zależności (nie ruszać)

| EPIC / slice | Status | Relacja do P2 |
|--------------|--------|----------------|
| **SMART-PRICING-01 P0** | **CLOSED** · `9ca4a4e5` | Detect REUSE |
| **SMART-PRICING-01 P1** | **FULLY CLOSED** · **PV** · `d8b080e5` | Evidence/UI/One-shot **REUSE** |
| **GLOBAL-UX-02** | **FULLY CLOSED** · `3385d9f` | Brak zależności merytorycznej |
| **MARKET-SYNC-01 P0** | **CLOSED** | Staging model + local store |
| **MARKET-SYNC-01 P1** | **CLOSED** · `5326cf8c` | Accept/Publish ownership · SMART **tylko czyta** staging |
| **MARKET-SYNC-01 P2** | **NIE** rozpoczęty | **Osobny** EPIC — nie blokuje SMART P2 (O-SP-D) |
| Catalog / CM-04 / AI-COST | CLOSED / FROZEN | Brak rewrite |

---

## 2. Analiza SMART P1 (CLOSED) — zależności

### 2.1 Co shipped (REUSE obowiązkowy)

| Element | Wartość |
|---------|---------|
| Evidence model | `SmartPricingPriceEvidence` · P1: `source` **tylko** `product_quotes` |
| Builder | `buildEvidenceFromProductQuotes` (pure) |
| Rank | `rankEvidence` · O-SP-G · sort only |
| Confidence | `computeDecisionConfidence` RO · READY\|REVIEW\|MANUAL |
| One-shot | session React state · **0 LS · 0 Cloud · 0 Quotes write** |
| Odrzuć | clear selection / close · 0 side-effects |
| UI | `SmartPricingEvidencePanel` + wire OfferBoq |
| Flaga | `kw-smart-pricing-01-p1` default **OFF** |
| Extension | `P1_evidence` · `P1_one_shot` → `available: true` · **`P2_ms_staging` → false** |
| Test | P0 83 · P1 109 PASS |
| SSOT | [`SMART-PRICING-01-P1-CLOSE.md`](./SMART-PRICING-01-P1-CLOSE.md) |

### 2.2 Co P1 świadomie odłożył → P2

| OUT P1 | Status |
|--------|--------|
| Evidence `source=market_sync_staging` | → **P2** |
| SEARCH B / „Szukaj w sklepach” | → **P2** |
| Rank reguła **B1** (Quotes > staging) w pełnym torze | → **P2** (dziś tylko Quotes) |
| Extension `P2_ms_staging` ON | → **P2** |
| Confidence: staging → zwykle **REVIEW** (epicki §6) | → **P2** doprecyzowanie |

### 2.3 Kontrakt kodu dziś (AS-IS)

| Ścieżka | Stan vs P2 |
|---------|------------|
| `src/lib/smart-pricing/evidence.ts` | Quotes only |
| `src/lib/smart-pricing/types.ts` | `SmartPricingEvidenceSource = "product_quotes"` — **wymaga rozszerzenia w P2** |
| `src/lib/smart-pricing/extensions.ts` | `P2_ms_staging.available === false` |
| `src/lib/smart-pricing/rank.ts` | Brak B1 (jeden source) |
| `src/app/smart-pricing/SmartPricingEvidencePanel.tsx` | Brak etykiety staging / CTA MS |
| `src/lib/market-sync/staging-store.ts` | `loadMarketSyncStagingLocal` — **kandydat RO REUSE** |
| `src/lib/market-sync/publish.ts` / `accept.ts` | **ZAKAZ** wywołań z SMART |

**Wniosek:** P2 = **włączenie SEARCH B** na istniejącym modelu Evidence P1 · **bez** nowego panelu „v2” · **bez** ownership MS.

---

## 3. MARKET-SYNC staging — co wolno czytać

### 3.1 SSOT MS (REUSE)

| Element | Wartość |
|---------|---------|
| Store | `MarketSyncStagingStore` · FEATURE LS `kw-market-sync-01-staging` |
| Load RO | `loadMarketSyncStagingLocal()` |
| Zawartość | `marketProducts` · `providerQuotes` · `syncRuns` |
| Match | `matchMethod` / `matchConfidence` / `linkedWorkIds` (N:1) |
| Publish | `runMarketSyncPublish` → `commitMarketQuotesImport` — **ownership MS · OUT SMART P2** |
| Kill Switch | `MARKET_SYNC_PUBLISH_ENABLED` — **nie** dotyczy odczytu staging |

### 3.2 Mapowanie na Evidence (propozycja AUDIT → DF)

| Pole Evidence | Źródło staging (szkic) |
|---------------|------------------------|
| `source` | **`market_sync_staging`** |
| `provider` | `ProviderQuote.provider` |
| `price` | `grossPrice` (PLN) |
| `acquiredAt` | `importedAt` |
| `confidence` | `matchConfidence` (fallback niski → MANUAL/REVIEW) |
| `matchMethod` | map z MS `MatchMethod` (bez `direct_work_quote`) |
| `matchDetail` | productName · sku · status · marketProductId |
| `workId` | `linkedWorkIds[0]` jeśli N:1 |
| `unit` / `warnings` | unit mismatch · status `conflict`/`unmatched` → warnings / wykluczenie z rekomendacji (B4) |

**Filtr kandydatów (rekomendacja):** status ∈ {`accepted`,`proposed`,`imported`} z `linkedWorkIds` lub jawnym match do `catalogWorkId` · **wyklucz** `conflict` / `unmatched` / `rejected*` z puli One-shot rekomendacji (epicki B4).

### 3.3 O-SP-D (FROZEN epicki)

SMART P2 **wolno** czytać staging MS **P1** — **nie** trzeba czekać na MARKET-SYNC-01 P2.

---

## 4. Blast radius

### 4.1 IN (oczekiwany)

| Obszar | Ryzyko | Mitigacja |
|--------|--------|-----------|
| `src/lib/smart-pricing/**` | Rozszerzenie source · adapter staging · Rank B1 · flag P2 | Pure · smokes · allowlist |
| `src/app/smart-pricing/*` | Badge źródła · opc. CTA „Szukaj w sklepach” | Thin UI · REUSE panel |
| `OfferBoqCostIntelligencePanel.tsx` | Wire flagi P2 / merge Evidence | Tylko hunks SMART |
| Import `loadMarketSyncStagingLocal` | Coupling do MS | Tylko RO load · **0** save/publish |

### 4.2 OUT (zakazane — blast = STOP)

| Obszar | Powód |
|--------|--------|
| `market-sync/publish*` · `accept*` · `commitMarketQuotesImport` | Ownership MS / P3 |
| `saveMarketSyncStagingLocal` / mutacja staging | Staging write = OUT |
| `cloud-sync` / DATA_KEYS | Zakaz CORE |
| `tenders-bid-calculator` · pricing engine rewrite | Bid OUT |
| Payroll / App shell / routing | Gate |
| MARKET-SYNC UI rewrite (Preview panel) | Inny ownership |
| Fuzzy ON · scrapery · cron | Zakaz EPIC |

### 4.3 Payroll Safety Gate (przewidywany — przed IMPLEMENT)

```text
PAYROLL SAFETY GATE — SMART-PRICING-01 P2
G1 Payroll:      NIE
G2 LS schema/budget CORE: NIE
   (odczyt FEATURE staging MS ≠ nowe CORE keys; One-shot nadal 0 LS)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell root:   NIE
G9 Routing:      NIE
Wynik: ALL-NIE (jeśli diff ⊆ allowlist)
Owner GO CORE path: NO
```

---

## 5. Allowlist (propozycja AUDIT → DF)

```text
IN:
  src/lib/smart-pricing/**
    └─ staging-read / evidence-from-staging (nazwa DF)
    └─ types: source += market_sync_staging
    └─ rank: reguła B1 (Quotes > staging)
    └─ confidence: reguły staging → REVIEW (epicki §6)
    └─ extensions: P2_ms_staging available true
    └─ flag: kw-smart-pricing-01-p2 (rekomendacja) default OFF
  src/app/smart-pricing/**
    └─ Evidence panel: label źródła · opc. CTA SEARCH B
  src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx
    └─ cienki wire flagi P2 / merge Evidence
  scripts/test-smart-pricing-01-p2.mjs (+ regresja P0/P1)
  (opc. docs SMART-PRICING-01-P2-* po GO)

OUT:
  src/lib/market-sync/publish*.ts · accept.ts · undo.ts (write path)
  commitMarketQuotesImport / applyMarketQuotesFromPreview
  saveMarketSyncStagingLocal (z toru SMART)
  cloud-sync · Payroll* · Bid calculator rewrite · AI-COST rewrite
  MARKET-SYNC Preview ownership UI (poza cienkim linkiem „otwórz MS”)
```

**Monolit rule:** OfferBoq — tylko hunks P2; zakaz „przy okazji” Cost Intelligence rewrite.

---

## 6. Zakres IN (P2)

| IN | Opis |
|----|------|
| **Staging → Evidence** | Pure projection RO z `MarketSyncStagingStore` |
| **`source=market_sync_staging`** | Rozszerzenie unii Evidence (jeden model — bez DTO v2) |
| **Merge** | Quotes Evidence (P1) ∪ Staging Evidence (P2) |
| **Rank B1** | Przy równym providerze: `product_quotes` **przed** `market_sync_staging` |
| **Confidence** | Staging top → zwykle **REVIEW** (epicki §6) · conflict/unmatched → MANUAL / brak w puli |
| **One-shot / Odrzuć** | **REUSE** P1 semantyka (session · 0 Quotes write) — dozwolone z Evidence staging |
| **UI** | Lista Evidence z etykietą źródła · opc. jawne „Szukaj w sklepach” gdy Quotes puste |
| **Extension** | `P2_ms_staging.available = true` |
| **Flaga** | `kw-smart-pricing-01-p2` default **OFF** (rekomendacja) · OFF ⇒ parity **P1** (Quotes only) |
| **Testy** | P0+P1 regresja PASS · nowy smoke P2 (staging→Evidence · B1 · 0 publish) |

### 6.1 Semantyka flag (rekomendacja AUDIT)

| P1 flag | P2 flag | Zachowanie |
|---------|---------|------------|
| OFF | * | Detect P0 only (jak dziś prod) |
| ON | OFF | P1: Evidence Quotes only |
| ON | ON | P1+P2: Quotes ∪ staging |
| OFF | ON | **NIE** rekomendowane — DF powinien wymusić P2⇒P1 lub traktować P2 OFF gdy P1 OFF |

**Rekomendacja DF:** P2 ON **wymaga** P1 ON (lub jedna flaga łączona — Owner wybór w DF).

---

## 7. Zakres OUT (P2) — twarde

| OUT | Powód |
|-----|--------|
| **Auto-publish** / batch Publish MS | Epicki P2 OUT · ownership MS |
| **Save** / Confirm / Kill Switch path SMART | Faza **P3** |
| **`commitMarketQuotesImport`** | P3 · MS Publish |
| **`runMarketSyncPublish` / Accept / Defer write** | Ownership MS |
| **Mutacja staging** (`saveMarketSyncStagingLocal`) | Zakaz z SMART |
| **Cloud** / DATA_KEYS | Zakaz |
| **Payroll** / AI rewrite / Bid rewrite | Zakaz |
| **Fuzzy ON** · scrapery · cron · LLM as price | Zakaz EPIC |
| **Zmiana progów Detect O-SP-F** | Zakaz bez amend |
| **N:M / PriceHistory / MS P2 EPIC** | Osobny GO |
| **One-shot → LS/Cloud** | DF-P1-01 nadal obowiązuje |
| **Równoległy model Evidence v2** | Jeden model · rozszerzony `source` |

---

## 8. Ryzyka

| ID | Ryzyko | Severity | Mitigacja |
|----|--------|----------|-----------|
| **R-P2-01** | SMART wywołuje Publish „przy okazji” | **P0** | Allowlist · static ban · smoke |
| **R-P2-02** | Staging traktowany jak SSOT Quotes | **P0** | Rank B1 · badge źródła · Confidence REVIEW |
| **R-P2-03** | Conflict/unmatched → One-shot błędnej ceny | **P1** | Filtr B4 · MANUAL |
| **R-P2-04** | Coupling twarde do MS internal API | **P1** | Cienki adapter w `smart-pricing/` · tylko public load RO |
| **R-P2-05** | P2 creep → Save CTA | **P0** | OUT §7 · brak Zapisz w UI |
| **R-P2-06** | Flaga P2 ON przy P1 OFF = niespójny UX | **P2** | Gate P2⇒P1 w DF |
| **R-P2-07** | Pusty staging ⇒ regresja P1 | **P1** | Merge: brak staging = zachowanie P1 |
| **R-P2-08** | Docs tip drift (dad4c98 vs d8b080e) | **P2** | Opc. tip refresh przed commit kodu jeśli live ≠ oczekiwany |
| **R-P2-09** | MS P2 EPIC mieszany w tym samym commit | **P0** | Osobny GO · OUT allowlist |

---

## 9. Thin Slice (rekomendacja)

```text
THIN P2 (jedna paczka):
  1) Adapter RO: staging store → PriceEvidence[] (source=market_sync_staging)
  2) Merge z Evidence Quotes (P1 builder)
  3) Rank + B1
  4) Confidence (staging → REVIEW bias)
  5) UI: label źródła w istniejącym Evidence panel (+ opc. CTA SEARCH B)
  6) Flaga P2 default OFF · extension P2 ON
  7) Smoke P2 + regresja P0/P1

NIE W THIN:
  Save · Publish · staging write · MS UI rewrite · fuzzy · scrapery · P3
```

**Kolejność workflow (epicki §4) — P2 uzupełnia krok [3]:**

```text
Detect (P0) → Evidence Quotes (P1) → Evidence Staging (P2)
  → Rank(+B1) → Confidence → Present → One-shot|Odrzuć
  → Zapisz = NADAL BRAK (P3)
```

---

## 10. Definition of Done (propozycja → DF)

| ID | Kryterium |
|----|-----------|
| **AC-P2-1** | Diff ⊆ allowlist §5 |
| **AC-P2-2** | Evidence staging: `source=market_sync_staging` · pure · 0 mutacji store MS |
| **AC-P2-3** | Rank B1: Quotes przed staging przy równym providerze |
| **AC-P2-4** | Confidence RO · staging nie „udaje” READY bez reguł DF |
| **AC-P2-5** | One-shot/Odrzuć: semantyka P1 · Quotes FP unchanged |
| **AC-P2-6** | **0** `commitMarketQuotesImport` / Publish / Accept write z SMART |
| **AC-P2-7** | **0** `saveMarketSyncStagingLocal` w torze SMART |
| **AC-P2-8** | Flaga P2 default OFF · OFF = zachowanie = P1 only |
| **AC-P2-9** | P0 + P1 smoke regresja PASS |
| **AC-P2-10** | Smoke P2 PASS |
| **AC-P2-11** | Build + typecheck PASS |
| **AC-P2-12** | Gate ALL-NIE |
| **AC-P2-13** | Brak CTA Zapisz / Auto-publish |

---

## 11. Rollback

| Warstwa | Akcja |
|---------|--------|
| **Flag** | `kw-smart-pricing-01-p2=0` → natychmiast parity P1 |
| **P1 flag** | nadal steruje Evidence Quotes; obie OFF → Detect P0 |
| **Git** | revert commit P2 (docs+code) — bez migracji danych (brak schema Quotes) |
| **Staging MS** | nietknięty (RO) — brak cleanup |
| **One-shot** | session only — reload gasi |

**Rollback cost:** niski (FEATURE flag + thin diff).

---

## 12. Owner Verification (szkic → DF)

| # | Check |
|---|-------|
| **OV-1** | P2 OFF → UI = P1 (Quotes only) / obie OFF → Detect P0 |
| **OV-2** | P1+P2 ON → Evidence zawiera wiersze `market_sync_staging` gdy staging ma match |
| **OV-3** | Rank: Quotes powyżej staging przy tym samym providerze (B1) |
| **OV-4** | Confidence badge · staging nie wygląda jak „zapisane Quotes” |
| **OV-5** | One-shot ze staging → session only · Quotes FP OK · reload gasi |
| **OV-6** | Odrzuć → 0 side-effects staging/Quotes |
| **OV-7** | Brak CTA Zapisz / Publish w panelu SMART |
| **OV-8** | DevTools: brak wywołań commit/publish z toru OfferBoq SMART |
| **OV-9** | Detect P0 progi bez zmian |
| **OV-10** | Diff ⊆ allowlist · Gate ALL-NIE |

---

## 13. Docs tip

| Pytanie | Odpowiedź AUDIT |
|---------|-----------------|
| Czy tip STALE jak przed P1? | **NIE krytycznie** — tip = P1 CLOSED (`d8b080e` / docs `dad4c983`) |
| Refresh przed kodem P2? | **Zalecany lekki** tylko jeśli live `version.json` ≠ oczekiwany tip przed GO COMMIT; nie blokuje DF |
| Co wpisać po CLOSE P2? | Feature tip SMART P2 · flaga OFF · P3 backlog |

---

## 14. Rekomendacja DESIGN FREEZE

```text
Werdykt AUDIT:
  P2 = READY FOR DESIGN FREEZE
  IMPLEMENT = ZABLOKOWANY do Owner GO DF + GO IMPLEMENT
  Thin = staging RO → Evidence + merge + B1 + REUSE P1 decisions
  OUT = Publish/Save/staging write/Cloud/Payroll/Bid/AI
  Flaga = kw-smart-pricing-01-p2 default OFF (P2⇒P1)
```

| Decyzja | Rekomendacja |
|---------|--------------|
| **Czy robić P2?** | **TAK** — naturalny następny krok epicki po P1 CLOSED |
| **Czy teraz IMPLEMENT?** | **NIE** — najpierw **DESIGN FREEZE P2** |
| **Czy łączyć z P3 Save?** | **NIE** |
| **Czy łączyć z MS P2 EPIC?** | **NIE** |
| **Czy Save w P2?** | **NIE** |
| **Flaga default** | **OFF** |
| **Ownership MS** | **Nienaruszalne** — SMART = konsument RO |

### Otwarte decyzje Ownera na DF (O-SP-P2-*)

| ID | Pytanie | Opcje (rekomendacja **pogrubiona**) |
|----|---------|--------------------------------------|
| **O-SP-P2-01** | Flaga | **Osobna `kw-smart-pricing-01-p2`** · wspólna z P1 |
| **O-SP-P2-02** | P2⇒P1 | **Wymagane P1 ON** · niezależne |
| **O-SP-P2-03** | Kiedy SEARCH B | **Auto gdy Quotes puste + jawny CTA** · tylko CTA · zawsze merge |
| **O-SP-P2-04** | One-shot ze staging | **TAK (session, jak P1)** · tylko REVIEW+explicit · zakaz |
| **O-SP-P2-05** | Link do UI Market Sync | **Opc. „Otwórz Market Sync”** (nawigacja) · brak |

---

## 15. Owner Acceptance Checklist

```text
[ ] Akceptuję IN §6 / OUT §7 (staging RO · OUT Publish/Save)
[ ] Akceptuję allowlist §5
[ ] Akceptuję Thin Slice §9
[ ] Akceptuję DoD §10 · Rollback §11 · OV §12
[ ] Potwierdzam: O-SP-D — odczyt MS P1 staging OK bez MS P2 EPIC
[ ] Potwierdzam: brak IMPLEMENT / commit / push w tym etapie
[ ] Następny krok po ACCEPTED: GO DESIGN FREEZE P2
```

---

## 16. Werdykt

**SMART-PRICING-01 P2 AUDIT = COMPLETE**

- Production **GREEN** · tip **2.65.95** / **`d8b080e`**  
- P1 **FULLY CLOSED** · kontrakt Evidence gotowy do rozszerzenia `source`  
- P2 = **MS staging RO → Evidence** · Rank B1 · REUSE One-shot/Odrzuć  
- OUT = Auto-publish · Save · staging write · Cloud · CORE  
- Gate przewidywany: **ALL-NIE**  

**Czekam na:** **ACCEPTED** / HOLD / amend · potem **GO DESIGN FREEZE P2**.  

**Nie** IMPLEMENT · **nie** commit · **nie** push · **nie** start P3.
