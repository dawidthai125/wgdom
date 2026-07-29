# CENY-MATERIAŁÓW-04 P1-A — OWNER VERIFICATION COMPLETE

> **ID:** CENY-MATERIAŁÓW-04-P1-A-OWNER-VERIFICATION-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** OWNER VERIFICATION · **BEZ COMMIT** · **BEZ PUSH**  
> **DF:** [`CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE.md)  
> **AR:** [`CENY-MATERIAŁÓW-04-P1-ARCHITECTURE-REVIEW.md`](CENY-MATERIAŁÓW-04-P1-ARCHITECTURE-REVIEW.md) · APPROVED  
> **OPS:** [`CENY-MATERIAŁÓW-04-P1-A-OPS-COMPLETE.md`](CENY-MATERIAŁÓW-04-P1-A-OPS-COMPLETE.md)  
> **Evidence:** `.tmp/ceny-materialow-04-p1a-owner-verification.json`

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P1-A OWNER VERIFICATION COMPLETE
Decyzja: OWNER VERIFICATION FAILED
════════════════════════════════════════════════════════
```

---

## 1. Decyzja

| | |
|--|--|
| **Decyzja** | **OWNER VERIFICATION FAILED** |
| **Nie** | READY FOR COMMIT |

**Blokada:** false matche mappingu (D-P1-F) — m.in. ścieki→obrzeża, rozebranie ogrodzeń/rynien→roboty P1-A. Wymagany **OPS patch** (węższe `namePl`/keywords / dezaktywacja złych trafień) + ponowna Owner Verification.

---

## 2. Checklist vs DF / AR

| # | Check | Wynik |
|---|-------|--------|
| 1 | Wszystkie **10** nowych robót `p1a-*` w cloud WC | **PASS** |
| 2 | **100%** product Quotes (wgdom · price = companyPrice) | **PASS** (10/10; legacy 34/34 też) |
| 3 | Quotes wyłącznie CSV → `commitMarketQuotesImport` | **PASS** (OPS evidence · zero scrapera) |
| 4 | Brak zmian AI-COST / providerów / heurystyk / Bid / `cloud-sync.ts` | **PASS** (brak diff w plikach OUT) |
| 5 | Coverage **C1** / **C2** | **PASS** (C1=**35**, C2=**35**) |
| 6 | Hard: ≥3 works · Quotes 100% · unmatched ↓ | **PASS** (10 · 100% · 41→**11**, −73%) |
| 6b | Soft: HE ↓ · CM ≥ P0 | **PASS** (HE **32.4%** · CM **67.6%**) |
| 7 | `08decd0e` — spadek −35% uzasadniony + **zero** false match | **FAIL** (1 false: ścieki→obrzeża) |
| 8 | Walidacja 18 przetargów · global false matches | **FAIL** (**10** false semantic) |

---

## 3. Katalog (cloud)

| Metryka | Wartość |
|---------|---------|
| Aktywne roboty | 44 |
| P1-A | **10/10** obecne · active |
| Product Quotes P1-A | **10/10** · origin `wgdom` · price = `companyPricePln` |
| Product Quotes legacy | **34/34** (heal P0 utrzymany) |

Wszystkie 10 ID zgodne z OPS COMPLETE — **brak braków / niespodziewanych ID**.

---

## 4. Coverage + KPI (powtórka 18)

| Metryka | P0 | Owner Verify |
|---------|-----|--------------|
| CM avg ON | 65.7% | **67.6%** |
| HE avg ON | 34.3% | **32.4%** |
| C1 (linie → P1-A) | 0 | **35** |
| C2 (DROGI HE/unmatched) | — | **35** |
| Unmatched DROGI linie | 41 | **11 (−73.2%)** |

Hard works/Quotes/unmatched — **PASS**. Soft HE/CM — **PASS**.

---

## 5. Sprawa `08decd0e` (szczegół)

| | P0 | Po P1-A |
|--|----|---------|
| directPln | ~430.1 k | ~279.4 k |
| Δ | — | **−150.8 k (−35%)** |
| HE % | **62.5%** | niski udział HE |
| CM % | 37.5% | **70.5%** |
| P1-A matches | 0 | **23** |
| Origin na P1-A | — | **100% `controlled_market`** |
| Quote = companyPrice | — | **TAK** |

**Część OK:** spadek direct jest **spójny** z HE→CM przy `companyPricePln` (nie utrata Quotes / nie regresja silnika). Większość matchy (kostka, podbudowa, koryto, rozebrania chodnika/kostki/podbudowy/obrzeży) — semantycznie poprawna.

**FAIL:** nadal 1 false match:

| Opis linii | Zmapowane na | Problem |
|------------|--------------|---------|
| „Ścieki z prefabrykatów betonowych … na podsypce piaskowej” | `p1a-obrzeza-betonowe-mb` | Nie jest obrzeżem — token name `betonowe` łapie „betonowych” |

---

## 6. False matche (global · 18 spraw) — przyczyna FAIL

| Tender | Linia (skrót) | Work P1-A | Ocena |
|--------|---------------|-----------|--------|
| 08decd0e | Ścieki prefabrykatów | `p1a-obrzeza-betonowe-mb` | **FALSE** |
| 08dec13d | Ogrodzenia systemowe — rozebranie | `p1a-rozebranie-obrzezy-mb` | **FALSE** |
| 08dec13d | Rozebranie opaski betonowej | `p1a-rozebranie-podbudowy-m2` | **FALSE** |
| 08dee3f6 | Barierki — rozebranie | `p1a-rozebranie-obrzezy-mb` | **FALSE** |
| 08dee3f6 | Warstwa zbrojona / siatka ościeża | `p1a-koryto-jezdni-chodnik-m2` | **FALSE** |
| 08dee3f6 | Rozebranie rynny / rury spustowej | `p1a-rozebranie-obrzezy-mb` | **FALSE** |
| 08dee3f6 | Ławy pod krawężniki | `p1a-kostka-brukowa-m2` | **FALSE** |
| 08debd4b | Rozebranie ścianki z cegieł | `p1a-rozebranie-chodnikow-m2` | **FALSE** |
| 08dec13d | Nawierzchnie z kostki … (układanie) | `p1a-kostka-brukowa-m2` | reguła OV zbyt wąska *lub* OK — do ręcznego review* |

\*Część „kostka brukowa — ułożenie” może być **true** match; reguła OV wymagała `układana` — do doprecyzowania przy patchu. Pozostałe wiersze tabeli = **jasne FALSE** (D-P1-F).

**Przyczyna root:** scoring OfferBoq (AS-IS, OUT) punktuje **tokeny `namePl`** (`rozebranie`, `betonowe`, …) → zbyt szerokie trafienia mimo wąskich keywords. **Zakaz** zmiany AI-COST — naprawa = OPS na danych (`namePl`/keywords / `active=false` na problematycznych do czasu fix).

---

## 7. OUT (potwierdzone)

| Obszar | Diff w tip src (verify) |
|--------|-------------------------|
| AI-COST / pricing-engine / mapping | **brak** |
| Providerzy / heurystyki | **brak** |
| Bid Calculator | **brak** |
| Cloud Sync CORE (`cloud-sync.ts`) | **brak** |

Mutacje = wyłącznie dane `kw-wgdom-work-catalog` (OPS) + docs/evidence.

---

## 8. Remediation (wymagane przed READY FOR COMMIT)

```text
OPS PATCH P1-A (bez AI-COST):
1. namePl bez generycznych tokenów (np. samo „betonowe”, samo „rozebranie”)
2. Keywords: frazy pełne; wykluczyć ścieki / rynny / ogrodzenia / ścianki / ościeża
3. Opcjonalnie active=false na robotach generujących FALSE do czasu poprawy
4. Ponowny probe Owner Verification (ten sam skrypt)
5. Dopiero wtedy READY FOR COMMIT
```

Rollback L1 (`active=false` na `p1a-*`) dostępny jeśli Owner woli cofnąć slice.

---

## 9. Następny krok

```text
OPS PATCH P1-A (false matches)
  → Owner Verification #2
  → READY FOR COMMIT (oczekiwane)
  → potem P1-B
```

**Zakaz teraz:** git commit · push.

---

**OV STATUS:** **COMPLETE** · **OWNER VERIFICATION FAILED**
