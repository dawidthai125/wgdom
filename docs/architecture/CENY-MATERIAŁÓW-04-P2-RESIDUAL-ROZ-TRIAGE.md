# CENY-MATERIAŁÓW-04 P2 — RESIDUAL ROZ TRIAGE

> **ID:** CENY-MATERIAŁÓW-04-P2-RESIDUAL-ROZ-TRIAGE  
> **Data:** 2026-07-30  
> **MODE:** ANALIZA READ-ONLY · **bez** IMPLEMENT / mutacji KV / commit / push  
> **Wejście:** P2-A/B OPS+OV **PASS** · K-P2-1 **PENDING** (36→**33**, target ≤**18**)  
> **Evidence:** `.tmp/ceny-materialow-04-p2-residual-roz-triage.json`  
> **Zakaz:** P3 INNE · AI-COST · scoring · Bid · Cloud CORE · parser · scope poza ROZ

```text
════════════════════════════════════════════════════════
RESIDUAL ROZ TRIAGE
Rekomendacja (historyczna): CONTINUE P2
STATUS 2026-07-30: AMEND COMPLETE · K-P2-1 PASS (16≤18)
→ docs/architecture/CENY-MATERIAŁÓW-04-P2-RESIDUAL-ROZ-AMEND-COMPLETE.md
════════════════════════════════════════════════════════
```

---

## 1. Cel K-P2-1 (przypomnienie)

| | Wartość |
|--|---------|
| Baseline pre-P2-A (Owner) | **36** linii unmatched ROZ |
| Stan po P2-A/B | **33** |
| Target K-P2-1 | ≤ **18** (≤50% × 36) |
| **Minimum do pokrycia** | **≥ 15** linii (33→18) |
| PLN residual | ~**7,0 k** (niski vs CM; linie = KPI hard) |

---

## 2. Pełna lista 33 unmatched (grupy)

### A. Depth ROZ — kandydaci P2 (19 linii · ~6,9 k PLN)

| # | Wzorzec | n | ≈PLN | Przykłady | Ocena pokrycia |
|---|---------|---|------|-----------|----------------|
| A1 | **Ścianki działowe — wariant opisu** | 4 | 1261 | `…działowych piwnicznych` · `…z łat i rygli` · `…-nowe wejście` | **EXTEND keywords** na istniejące `p2a-rozebranie-scianek-dzialowych-m2` (fraza już ma rdzeń; brakuje dopisków). ZERO DUPLICATE: **nie** nowe ID. |
| A2 | **Stropy drewniane / polepa / zasypka / kasetony** | 5 | 2219 | `Rozebranie stropów drewnianych - polepa` · `…zasypek` · `…kasetonów` | **NEW** CatalogWork (brak w DF §5.2) **lub** EXTEND `legacy-rozbiorki-m2` pełnymi frazami. Preferencja DF: NEW gdy osobna cena — tu tak. **Wymaga amend DF** (+ Quotes). |
| A3 | **Obróbki blacharskie (prawie exact p2a)** | 2 | 47 | `Rozebranie obróbek blacharskich murów ogniowych…` | **Heal keywords / nameTok** na `p2a-rozebranie-obrobek-*` — opis zawiera frazę DF, a `catalogWorkId=null` (score/primary nie wygrywa). **Nie** nowe ID. |
| A4 | **Rynny / rury spustowe** | 2 | 675 | `Rozebranie rynny z blachy…` · `Rozebranie rury spustowej…` | **NEW** (dach / odwodnienie) **lub** EXTEND obróbki — ryzyko false vs P1. Amend DF. |
| A5 | **Zerwanie podłoża** | 1 | 1854 | `Przygotowanie podłoża - zerwanie istniejącego podłoża` | **NEW** (≠ posadzki wewnętrzne p2a). Wysoki PLN. Amend DF + Quotes. |
| A6 | **Ścianki pełne cegła 1/2** | 1 | 162 | `Rozebranie ścianek pełnych z cegły…` | **EXTEND** `p2a-scianek-*` **opcjonalnie** (wcześniej celowo odcięte F2). Akceptowalna cena wspólna? Owner. |
| A7 | **Barierki drewniane — rozebranie** | 1 | 213 | `Barierki ochronne z desek… - rozebranie` | **NEW** wąskie **lub** legacy EXTEND. Granica vs ogrodzenia P1-B — fraza musi zawierać `barierki`+`rozebranie`, nie `ogrodzen`. |
| A8 | **Pawlacze / obudowa wanny / piece kaflowe** | 3 | 119 | `Rozebranie pawlaczy` · `…obudowy wanny` · `…pieców i trzonów…` | Niski PLN; **legacy EXTEND** pełnymi frazami wystarczy (bez proliferacji ID). |

**Suma A:** 19 linii. Po pokryciu wszystkich → residual teoretyczny = **33−19 = 14** ≤ **18** → **K-P2-1 osiągalny matematycznie**.

### B. Szum / misbucket / OUT P2 (14 linii · ~0,3 k PLN)

| # | Wzorzec | n | ≈PLN | Dlaczego nie mapować jako ROZ depth |
|---|---------|---|------|-------------------------------------|
| B1 | **„Mocowanie… bez częściowego rozebrania…”** | 6 | ~155 | Słowo `rozebrania` w **klauzuli wyłączenia** KNR → fałszywy bucket ROZ. Mapowanie na p2a = **false match**. Naprawa bucketa = zmiana classifiera (poza FEATURE-DATA / blisko parser). |
| B2 | **Demontaż tablic licznikowych** | 3 | 0 | Teletech/elektryka; ≠ `p2b-tablica-rozdzielcza-*`. PLN 0, ale **liczy się do K-P2-1**. |
| B3 | **Opaska betonowa + utwardzenie** | 1 | 297 | Granica **DROGI / P1-A** — OUT P2-A (nawierzchnie). |
| B4 | **Ławy pod obrzeża** | 2 | 30 | **P1-A / DROGI** (obrzeża) — OUT. |
| B5 | **Demontaż prysznica / barierki tarasu** | 2 | 0 | Sanitarka / lokalny demontaż — nie depth ROZ DF; PLN 0. |

**Floor residual po idealnym pokryciu A:** **~14** (grupa B zostaje unmatched **świadomie**).

---

## 3. EXTEND vs NEW vs Quotes (bez duplikacji)

| Działanie | Linie (szac.) | Narusza ZERO DUPLICATE? | Amend DF? |
|-----------|---------------|-------------------------|-----------|
| EXTEND keywords `p2a-scianek-*` (piwniczne / łat / nowe wejście) | +4 | Nie (to samo ID) | **Nie** (keywords w ramach worka) — OV token scan |
| Heal `p2a-obrobek-*` (dlaczego exact nie mapuje) | +2 | Nie | Nie (diagnostyka score) |
| EXTEND `p2a-scianek` o „ścianek pełnych” | +1 | Nie | Decyzja Owner (cena) |
| EXTEND `legacy-rozbiorki-m2` frazami pawlacze/wanna/piece/barierki | +4–5 | Nie (legacy) | Nie — **pełne frazy**, zero stemów |
| NEW stropy drewniane | +5 | Nie (brak ID) | **TAK** |
| NEW zerwanie podłoża | +1 | Nie | **TAK** |
| NEW rynna + rura spustowa | +2 | Nie | **TAK** |
| Product Quotes | na każde NEW 100% | — | Pipeline P3.3 |
| Mapowanie grupy B na ROZ | — | **TAK (false)** | Zakaz |
| P3 INNE / classifier rewrite | B1 | — | **Zakaz** w tym triage |

**Cap P2-A:** ≤12 NEW; aktywne **6** → budżet **≤6** nowych ID.  
Plan domknięcia: **3 NEW** (stropy · podłoże · rynna/spust jako 1–2 ID) + reszta **EXTEND** → mieści się w cap.

---

## 4. Elementy poza scope P2 / P3

| Element | Klasyfikacja |
|---------|----------------|
| Mocowanie aparatów (B1) | Szum bucketa — **nie P3**, nie P2 depth; wymaga zmiany reguł gap (OUT) |
| Tablice licznikowe (B2) | Elektryka/teletech — poza P2-A; nie mylić z P2-B rozdzielnicą |
| Opaska / ławy obrzeży (B3–B4) | **P1-A / DROGI** — OUT P2 |
| Reszta „INNE” rynku (CM-03) | **P3** — poza tym triage |
| AI-COST / scoring / Bid / Cloud CORE / parser | **Zakaz** |

---

## 5. Rekomendacja końcowa

### **CONTINUE P2** (z planem domknięcia K-P2-1)

**Uzasadnienie:**

1. Po pokryciu **19** linii grupy A residual ≈ **14** ≤ **18** → K-P2-1 **osiągalny bez** fałszywego mapowania szumu B.  
2. Ścieżka zgodna z DF: **EXTEND FIRST** → nieliczne **NEW** (amend listy §5.2) → Quotes 100% → OV false=0.  
3. Nie wymaga P3, AI-COST, scoringu, Bid, Cloud CORE ani parsera.  
4. K-P2-2/K-P2-3 już PASS — jedyny bloker AC-P2.6 to K-P2-1.

**Plan (wysoki poziom, bez IMPLEMENT w tym dokumencie):**

| Krok | Treść |
|------|--------|
| 1 | Owner GO na **amend DF** residual pack (stropy · podłoże · rynna/spust) |
| 2 | Thin AR anti-dup vs p2a/p1a |
| 3 | OPS: EXTEND A1/A3/A6/A8 → NEW A2/A4/A5 → Quotes → OV |
| 4 | Readonly re-probe: unmatched ROZ ≤18 · false 0 |
| 5 | Dopiero wtedy P2 EPIC CLOSE / AC-P2.6 |

**Ryzyka CONTINUE:**

| Ryzyko | Mitygacja |
|--------|-----------|
| False match przy EXTEND „ścianek pełnych” / barierki | Pełne frazy ≥3 słów · OV semantic gate |
| Cap NEW | Max 3–4 nowe ID; reszta legacy EXTEND |
| Grupa B nadal w residual | Akceptacja floor ~14; **nie** leczyć classifierem w P2 |
| Obróbki exact nie mapują dziś | RCA score przed seedem nowego ID |

---

### Alternatywa: **RECOMMEND WAIVE AC-P2.6** — kiedy?

Wybierz **WAIVE**, jeśli Owner uzna że:

- kolejny cykl amend+OPS nie jest wart ~15 linii przy **niskim PLN** residual (~7 k),  
- albo nie akceptuje flooru szumu B (~14 linii „wiecznie” unmatched bez zmiany classifiera),  
- albo nie chce ryzyka false-match przy EXTEND dach/barierki.

**Uzasadnienie WAIVE (gdyby):** P2-A/B dostarczyły depth + Quotes + false 0 + K-P2-2/3; K-P2-1 blokowany w istotnej części przez **artefakt bucketa** (B1) i **OUT P1/DROGI** (B3–B4), nie przez brak woli depth ROZ. Waive = świadome domknięcie epiku bez change classifiera.

**Werdykt analityka (domyślny): CONTINUE P2**, nie WAIVE — bo cel ≤18 jest osiągalny w scope ROZ bez naruszania zakazów.

---

## 6. Decyzja Ownera (do zaznaczenia)

| Opcja | |
|-------|--|
| **□ CONTINUE P2** — GO na amend DF residual pack + OPS | |
| **□ RECOMMEND WAIVE AC-P2.6** — P2 EPIC CLOSE z K-P2-1 wyjątkiem | |
| **□ HOLD** — bez zmian do dalszego triage | |

---

## 7. Zakazy (powtórzenie)

Bez GO Ownera: **brak** IMPLEMENT, **brak** mutacji `kw-wgdom-work-catalog`, **brak** P3, **brak** zmian AI-COST / scoring / Bid / Cloud CORE / parser.
