# CENY-MATERIAŁÓW-04 P2-A — OPS COMPLETE

> **ID:** CENY-MATERIAŁÓW-04-P2-A-OPS-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** OPS IMPLEMENTATION · Owner GO **APPROVED**  
> **Grupa:** **P2-A — ROZBIÓRKI / WYBURZENIA**  
> **Klasa:** FEATURE-DATA / OPS · **bez** AI-COST / scoring / Bid / Cloud Sync CORE / parser  
> **Pipeline Quotes:** CSV → `previewMarketCsvImport` → **`commitMarketQuotesImport`** → WC  
> **Evidence:** `.tmp/ceny-materialow-04-p2a-*.json` · `.tmp/ceny-materialow-04-p2-gap-probe.json`

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P2-A OPS COMPLETE
Decyzja: READY FOR OWNER VERIFICATION → PASS → READY FOR P2-B
════════════════════════════════════════════════════════
```

---

## 1. Decyzja

| | |
|--|--|
| **Decyzja slice** | **READY FOR P2-B** |
| Owner Verification | **PASS** ([`…-P2-A-OWNER-VERIFICATION-COMPLETE.md`](CENY-MATERIAŁÓW-04-P2-A-OWNER-VERIFICATION-COMPLETE.md)) |

---

## 2. EXTEND (E1–E3)

| ID | Keywords ADD (pełne frazy DF) | Status |
|----|-------------------------------|--------|
| `legacy-rozbiorki-m2` | prace/roboty rozbiórkowe powierzchniowe · rozbiórka elementów betonowych powierzchniowych | **OK** |
| `legacy-rozbiorki-mb` | prace/roboty rozbiórkowe liniowe · rozbiórka elementów liniowych | **OK** |
| `legacy-rozbiorki-m3` | prace/roboty rozbiórkowe objętościowe · wyburzenia objętościowe betonu | **OK** |

Product Quotes legacy E1–E3 — utrzymane (P0 heal).

---

## 3. NEW `p2a-*` + Quotes

| ID | Unit | PLN | Quotes |
|----|------|-----|--------|
| `p2a-rozebranie-scianek-dzialowych-m2` | m2 | 48 | **wgdom 100%** |
| `p2a-rozebranie-obrobek-blacharskich-m2` | m2 | 42 | **wgdom 100%** |
| `p2a-zerwanie-tynkow-wewn-m2` | m2 | 32 | **wgdom 100%** |
| `p2a-rozebranie-okladzin-sciennych-m2` | m2 | 38 | **wgdom 100%** |
| `p2a-demontaz-drzwi-wewn-szt` | szt | 95 | **wgdom 100%** |
| `p2a-rozebranie-posadzek-wewn-m2` | m2 | 36 | **wgdom 100%** |

**Keywords:** zgodne z DF §6.3 (pełne frazy).  
**namePl (P2-A.F2):** zwężone vs DF §6.3 / A1 — izolacja false-match (lekcja P1-F2: nameTok + CM-01 alias `stolark*` / soft unit). ID i keywords **bez** zmiany kontraktu depth.

| ID | namePl OPS (F2) | Powód |
|----|-----------------|-------|
| scianki | `Przegrody działowe ceglane 1/4–1/2` | bez `rozebranie`/`ścianek`/`grub` |
| obróbki | `Kołnierze okapowe i gzymsy dachowe` | bez gołych `obróbki`/`blacharskie` |
| tynki | `Usunięcie warstw tynkarskich ze stropów` | bez `ścian` (substring `ścianki`) |
| okładziny | `Glazura i okładziny płytkowe` | bez `ścienne` ⊂ `przyścienne` |
| drzwi | `Zdjęcie ościeżnic mieszkaniowych` | bez `wraz`/`drzwi`/`stolark*` (alias CM-01) |
| posadzki | `Posadzki mieszkaniowe (wylewki / okładziny)` | bez gołego `wewnętrzne` |

---

## 4. Readonly re-probe + KPI

| Metryka | Przed P2-A | Po P2-A | Notatka |
|---------|------------|---------|---------|
| Residual ROZBIORKI linie (18) | **36** | **33** | −3 · K-P2-1 target ≤18 **SOFT PENDING** |
| C1 (linie → `p2a-*`) | 0 | **8** | PASS (H-A1 coverage) |
| CM avg 18 | 73.2% | **73.2%** | stabilne |
| HE avg 18 | 26.8% | **26.8%** | stabilne |
| False matches | — | **0** | PASS |
| P1 intact | 10/7/7 | **10/7/7** | PASS |
| Token scan §6.2 | — | **0** | PASS |

K-P2-1 (≤50% residual linii) — **nie** domknięty na samym P2-A; kontynuacja depth w residual + P2-B poza ROZBIORKI.

---

## 5. Regresje

| Typ | Wynik |
|-----|--------|
| P1-A/B/C roboty / Quotes | **brak regresji** |
| CM/HE avg | **brak regresji** |
| False semantic | **0** po F2 |

---

## 6. Następny slice

**P2-B:** EXTEND E4–E8 → NEW `p2b-*` (GK / elektryka / hydraulika) → Quotes → OV.

**Zakaz:** P3 INNE · AI-COST · scoring · Bid · Cloud CORE · parser.
