# MARKET-SYNC-01 P0 — ARCHITECTURE REVIEW

> **ID:** MARKET-SYNC-01-P0-ARCHITECTURE-REVIEW  
> **EPIC:** MARKET-SYNC-01 · **Slice:** P0 — Model + Preview  
> **Etap:** **ARCHITECTURE REVIEW** · DOCS ONLY  
> **Data:** 2026-07-30  
> **DF:** [`MARKET-SYNC-01-P0-DESIGN-FREEZE.md`](MARKET-SYNC-01-P0-DESIGN-FREEZE.md) · **FROZEN** · COMPLETE  
> **PLAN:** [`MARKET-SYNC-01-PLAN.md`](MARKET-SYNC-01-PLAN.md) · zaakceptowany  
> **AUDIT:** [`MARKET-SYNC-01-AUDIT.md`](MARKET-SYNC-01-AUDIT.md) · zaakceptowany  
> **Zakaz:** IMPLEMENT · kod · commit · push · OPS · AI-COST · Cloud CORE · WC · Quotes · `commitMarketQuotesImport`

```text
════════════════════════════════════════════════════════
MARKET-SYNC-01 P0 ARCHITECTURE REVIEW
Decyzja: READY FOR OWNER GO
Wszystkie kontrole 1–12: PASS
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | Wyłącznie dokumentacja P0 DF vs AUDIT + PLAN + zasady WGDOM |
| Kod / diff IMPLEMENT | **brak** (review docs) |
| Mutacje | **brak** |
| Kryterium PASS | DF FROZEN spełnia punkt bez sprzeczności blokującej IMPLEMENT |

---

## 1. Kontrole (PASS/FAIL)

### 1. Zgodność z MARKET-SYNC-01 AUDIT

| Wymaganie AUDIT | DF P0 | Wynik |
|-----------------|-------|-------|
| Warstwa MarketProduct + ProviderQuote | §4–§5 | **PASS** |
| Staging przed WC / Quotes | local-first · zero write WC | **PASS** |
| P0 bez scrapera | OUT §14 · sourceKind csv/manual | **PASS** |
| P0 bez Cloud CORE / nowego DATA_KEY | D-P0-F · G3 NIE | **PASS** |
| Publish dopiero później przez commit | STOP · P1 O-P1-4 | **PASS** |
| Zero AI-COST / Bid / CM-04 | OUT §14 | **PASS** |
| CONDITIONAL GO warunki W1–W6 dla P0 | Spełnione w zakresie P0 (W2/W4 = P1) | **PASS** |

**Uwaga (nie FAIL):** AUDIT dopuszczał fuzzy jako low_confidence w Preview; DF P0 **zaostrza** (fuzzy OFF). To zgodne z PLAN („Nigdy auto-link”) i bezpieczniejsze dla P0.

**Werdykt punktu 1: PASS**

---

### 2. Zgodność z MARKET-SYNC-01 PLAN

| Wymaganie PLAN (P0) | DF P0 | Wynik |
|---------------------|-------|-------|
| Slice P0 = Model + Preview | §1 One Bundle | **PASS** |
| OUT: Publish · origins WC · historia · scraper · Cloud KEY | §1 · §14 | **PASS** |
| Import→Normalize→Match→Preview | §3 | **PASS** |
| AC-P0-1…5 (model, fixture, UI bez commit, testy, OUT) | AC-P0-1…10 ⊇ | **PASS** |
| K-MS-0 Preview bez publish | §11 | **PASS** |
| Persist prefer A local-first | D-P0-1 FROZEN | **PASS** (D1 PLAN zamknięty dla P0) |
| Kolejność P0→P1; nie łączyć | §19 NEXT | **PASS** |

**Uwaga (nie FAIL):** Nazewnictwo pól Owner DF (`canonicalName`, `grossPrice`, `importedAt`) vs szkic PLAN (`canonicalNamePl`, `pricePln`, `fetchedAt`) — **świadomie** zamrożone w DF §4.1; mapowanie udokumentowane.

**Werdykt punktu 2: PASS**

---

### 3. Spójność modelu MarketProduct / ProviderQuote

| Kryterium | Ocena |
|-----------|--------|
| Encje rozdzielone (produkt vs oferta sklepu) | **PASS** |
| Pola Owner kompletne + inwarianty | **PASS** |
| Statusy P0 bez Accept/publish | **PASS** (`proposed`/`unmatched`/`conflict`/`rejected_row`) |
| Brak `linkedWorkIds` w P0 | **PASS** (P1) |
| `provider` enum ≠ `MARKET_ORIGIN_IDS` | **PASS** |
| `ean[]` na MP · `ean` na Quote | **PASS** (most cross-shop) |

**Werdykt punktu 3: PASS**

---

### 4. Relacje z Work Catalog / Product Quotes

| Relacja | DF | Wynik |
|---------|-----|-------|
| WC = SSOT robót · P0 zero write | §2.1 | **PASS** |
| Quotes = produkcja · P0 zero write | §2.1 · STOP | **PASS** |
| Staging ≠ WC | SSOT FIRST §2 | **PASS** |
| Brak mapowania publish do `workId` w P0 | linkedWork = P1 | **PASS** |

**Werdykt punktu 4: PASS**

---

### 5. Product Quotes = jedyne źródło cen produkcyjnych

| Dowód | Wynik |
|-------|--------|
| DF: brak mutacji `marketQuotes` / `companyPricePln` | **PASS** |
| Cena sklepu żyje tylko w ProviderQuote staging | **PASS** |
| controlled_market nie zasilany w P0 | **PASS** |
| Kontrakt EPIC: produkcja Quotes dopiero po commit (P1) | **PASS** |

**Werdykt punktu 5: PASS**

---

### 6. `commitMarketQuotesImport` = jedyny mechanizm publikacji

| Dowód | Wynik |
|-------|--------|
| P0 **nie** publikuje (AC-P0-5 · D-P0-I · K-MS-0c = 0) | **PASS** |
| Brak alternatywnego toru w allowlist (zakaz wywołań commit) | **PASS** |
| EPIC/PLAN: przyszły publish **tylko** commit (O-P1-4) | **PASS** |
| ZERO DUPLICATE: brak drugiego write Quotes | **PASS** |

**Werdykt punktu 6: PASS** (P0 nie narusza; publikacja zarezerwowana dla jedynego toru w P1)

---

### 7. P0 kończy się na Preview (STOP)

| Element | DF | Wynik |
|---------|-----|-------|
| Przepływ STOP po §3 krok 4 | jawny | **PASS** |
| Brak Accept | §1 OUT · §5.2 · §8.3 | **PASS** |
| Brak Publish | §1 · diagram ✕ | **PASS** |
| Brak zmian produkcyjnych (WC/Quotes/cloud) | §9 · §14 | **PASS** |

**Werdykt punktu 7: PASS**

---

### 8. Algorytm Match

| Krok Owner | DF §6 | Wynik |
|------------|-------|-------|
| EAN | priorytet 1 · conf 1.0 | **PASS** |
| SKU (+ provider) | priorytet 2 | **PASS** |
| Producent + Nazwa + Jednostka | priorytet 3 · exact fold | **PASS** |
| Alias | priorytet 4 · exact | **PASS** |
| Manual Review | priorytet 5 · P0 tylko wyświetlenie | **PASS** |
| Fuzzy OFF | M1 · M2 FROZEN | **PASS** |
| Conflict ≥2 bez auto-wyboru | M3 | **PASS** |

**Werdykt punktu 8: PASS**

---

### 9. Preview

| Bucket / element | DF §8 | Wynik |
|------------------|-------|-------|
| Nowe produkty | ✓ | **PASS** |
| Zmiany cen (Δ) | ✓ | **PASS** |
| Unmatched | ✓ | **PASS** |
| Konflikty | ✓ | **PASS** |
| Proposed match | ✓ | **PASS** |
| Confidence (+ method) | ✓ | **PASS** |

**Werdykt punktu 9: PASS**

---

### 10. Local-first · brak Cloud Sync CORE

| Kryterium | Wynik |
|-----------|--------|
| D-P0-1 local-first | **PASS** |
| Brak nowego DATA_KEY / edycji `cloud-sync.ts` | **PASS** |
| Gate G3 NIE | **PASS** |
| Klucz staging ≠ `kw-wgdom-work-catalog` | **PASS** |

**Werdykt punktu 10: PASS**

---

### 11. OUT

| Obszar | DF §14 / Gate | Wynik |
|--------|---------------|-------|
| AI-COST | OUT | **PASS** |
| Bid Calculator | OUT | **PASS** |
| Scoring | OUT | **PASS** |
| Parser | OUT | **PASS** |
| Payroll | G1 NIE · OUT | **PASS** |
| Cloud CORE | G3 NIE · OUT | **PASS** |

Dodatkowo: CM-04 · scraper · drugi tor Quotes · Accept/publish — **PASS**.

**Werdykt punktu 11: PASS**

---

### 12. Zasady WGDOM

| Zasada | Ocena AR | Wynik |
|--------|----------|-------|
| **SSOT FIRST** | Staging MP/PQ; WC/Quotes nietknięte | **PASS** |
| **REUSE FIRST** | Wzorzec Preview UX; commit zarezerwowany P1 (nie duplikowany) | **PASS** |
| **ZERO DUPLICATE LOGIC** | Brak drugiego toru Quotes; P0 nie tworzy równoległego write | **PASS** |
| **FEATURE-DATA ONLY** | Model + UI ops; Gate ALL-NIE | **PASS** |
| **DATA FIRST** | Match regułowy; fuzzy OFF; zero AI | **PASS** |

**Werdykt punktu 12: PASS**

---

## 2. Podsumowanie PASS/FAIL

| # | Kontrola | Wynik |
|---|----------|--------|
| 1 | AUDIT | **PASS** |
| 2 | PLAN | **PASS** |
| 3 | Model MP / PQ | **PASS** |
| 4 | Relacje WC / Quotes | **PASS** |
| 5 | Quotes = jedyne ceny produkcyjne | **PASS** |
| 6 | commit = jedyny publish (kontrakt) | **PASS** |
| 7 | STOP Preview · brak Accept/Publish/prod | **PASS** |
| 8 | Match + fuzzy OFF | **PASS** |
| 9 | Preview buckety | **PASS** |
| 10 | Local-first · Cloud CORE | **PASS** |
| 11 | OUT | **PASS** |
| 12 | Zasady SSOT/REUSE/… | **PASS** |

**FAIL: 0**

---

## 3. Uwagi (nie blokujące)

| ID | Uwaga | Działanie |
|----|-------|-----------|
| N1 | Fuzzy w AUDIT vs OFF w DF P0 | Akceptacja AR — zaostrzenie P0; fuzzy nie wraca bez amend DF |
| N2 | Rename pól vs szkic PLAN | Trzymać nazwy DF Owner; PLAN historyczny |
| N3 | Bucket „Nowe produkty” — kryterium złożone | Przy IMPLEMENT: złote fixture + testy bucket |
| N4 | Allowlist §18 DF = szkic | Poniżej **FROZEN na AR** |
| N5 | ACL „Super Admin lub równoważny” | Owner GO IMPLEMENT niech wskaże dokładny ACL |

---

## 4. Ocena ryzyk (przed IMPLEMENT)

| Ryzyko | Sev | Residual po DF | Akcja IMPLEMENT |
|--------|-----|----------------|-----------------|
| Przypadkowy commit Quotes | P0 | Niski (AC + allowlist) | Grep/test K-MS-0c w CI/smoke |
| Fuzzy „przyda się” | P0 | Niski (M2 OFF) | Zakaz w review PR |
| Utrata staging local | P1 | Średni | Eksport JSON w UI P0 |
| Fixture ≠ real CSV LM/Casto | P1 | Średni | P0 = kontrakt; P1 adapters |
| Scope creep Accept w tym samym PR | P0 | Średni | Allowlist · Owner GO tylko P0 |

**Ryzyko architektoniczne blokujące OWNER GO: BRAK**

---

## 5. Allowlist IMPLEMENT P0 (FROZEN przez AR)

### Dozwolone (po Owner GO IMPLEMENT)

| Ścieżka / obszar |
|------------------|
| `src/lib/market-sync/**` (nowy pure: types, normalize, match, staging store local) |
| Panel UI mount w istniejącej nawigacji Super Admin / Biblioteka (bez nowych tras CORE) |
| `scripts/test-market-sync-01-p0*.mjs` |
| Fixture CSV pod `fixtures/market-sync-01/` lub `.tmp` (nie prod KV) |
| Opc. lokalny klucz staging (nie `DATA_KEYS`) |

### Zakazane

| Ścieżka / obszar |
|------------------|
| `src/lib/cloud-sync.ts` · Edge payroll · `DATA_KEYS` |
| `commit-market-quotes.ts` · `apply-market-quotes.ts` (wywołania) |
| Mutacja `kw-wgdom-work-catalog` / `marketQuotes` |
| `tender-offer-boq-*.ts` · AI-COST · Bid · scoring · ATH classifier · parsery |
| CENY-MATERIAŁÓW-04 · Accept/Publish UI · origins `MARKET_ORIGIN_IDS` |
| Scraper / cron / nowy cloud KV |

---

## 6. Decyzja

| | |
|--|--|
| **Decyzja** | **READY FOR OWNER GO** |
| **Nie** | CHANGES REQUIRED |
| **Gotowość P0 do OWNER GO (IMPLEMENT)** | **TAK** — jednoznacznie potwierdzona |
| **IMPLEMENT** | **BLOCKED** do jawnego Owner GO IMPLEMENT P0 |

Wszystkie kontrole 1–12 zakończone wynikiem **PASS**. DF P0 jest spójny z AUDIT i PLAN, chroni SSOT WC/Quotes oraz kontrakt jedynego przyszłego publish przez `commitMarketQuotesImport`, a scope P0 twardo kończy się na Preview.

---

## 7. NEXT

```text
Owner GO IMPLEMENT P0
  → IMPLEMENT wg allowlist AR
  → testy AC-P0 / K-MS-0*
  → Owner Verification P0
  → P0 CLOSE
  → (P1 DF — osobny Owner GO)
```

**Zakaz bez Owner GO IMPLEMENT:** kod · commit · push · OPS.
