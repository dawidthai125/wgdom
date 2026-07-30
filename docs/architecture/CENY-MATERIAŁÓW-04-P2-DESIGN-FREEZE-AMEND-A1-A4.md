# CENY-MATERIAŁÓW-04 P2 — DESIGN FREEZE AMEND A1–A4

> **ID:** CENY-MATERIAŁÓW-04-P2-DESIGN-FREEZE-AMEND-A1-A4  
> **Data:** 2026-07-30  
> **MODE:** DOCS ONLY · **bez IMPLEMENT / OPS / commit / push / zmian kodu**  
> **Wejście:** AR **CHANGES REQUIRED** ([`CENY-MATERIAŁÓW-04-P2-ARCHITECTURE-REVIEW.md`](CENY-MATERIAŁÓW-04-P2-ARCHITECTURE-REVIEW.md))  
> **DF (zaktualizowany):** [`CENY-MATERIAŁÓW-04-P2-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-P2-DESIGN-FREEZE.md)  
> **Zakres:** wyłącznie poprawki **A1–A4** · **bez** rozszerzania scope P2

```text
════════════════════════════════════════════════════════
AMEND A1–A4 → DF P2
Decyzja: READY FOR THIN ARCHITECTURE REVIEW
════════════════════════════════════════════════════════
```

---

## 1. Lista wykonanych zmian

### A1 — namePl / descriptionPl vs §6.2

| ID | Było | Jest |
|----|------|------|
| `p2a-zerwanie-tynkow-wewn-m2` | `Zerwanie tynków…` | **`Usunięcie tynków wewnętrznych ze ścian`** (+ desc analogicznie) |
| `p2a-demontaz-drzwi-wewn-szt` | `Demontaż drzwi…` | **`Zdjęcie drzwi wewnętrznych wraz z ościeżnicą`** (+ desc) |
| `p2b-scianka-gk-na-stelazu-m2` | `Ścianka działowa…` | **`Zabudowa działowa z płyt gipsowo-kartonowych na stelażu`** (+ desc) |

| Decyzja | Treść |
|---------|--------|
| Wyjątek Zerwanie/Demontaż/Ścianka | **NIE** dodano — rename zamiast wyjątku |
| Wyjątek `Rozebranie <obiekt≥2>` | **bez zmian** (P1-A) · `ścianek` ≠ `ścianka` |
| Keywords | pełne frazy z `zerwanie`/`demontaż`/`ścianka` **dozwolone** (nie są tokenami name) |
| ID CatalogWork | **bez zmian** (scope) |

### A2 — E6 ↔ `p2b-scianka-*`

| Zmiana | Szczegół |
|--------|----------|
| Usunięto z E6 | `płyty gipsowo-kartonowe na stelażu` |
| E6 zostaje | `zabudowa z płyt gipsowo-kartonowych` · `okładzina z płyt gipsowo-kartonowych` · **`płyty gipsowo-kartonowe wewnętrzne`** (bez stelaża) |
| Owner stelaż/ścianka GK | wyłącznie `p2b-scianka-gk-na-stelazu-m2` (+ keyword `płyty gipsowo-kartonowe na stelażu`) |

### A3 — E4 ↔ `p2b-3`

| Zmiana | Szczegół |
|--------|----------|
| Usunięto z E4 | `punkt oświetleniowy wewnętrzny` |
| E4 zostaje | `gniazdo wtyczkowe podtynkowe` · `łącznik instalacyjny podtynkowy` · **`osprzęt elektryczny podtynkowy sztukowy`** |
| Owner oświetlenia | wyłącznie `p2b-punkt-elektryczny-oswietleniowy-szt` (keywords: `punkt oświetleniowy*` · `punkt świetlny*` · `oprawa oświetleniowa*`) |

### A4 — E8 ↔ `p2b-5` (REUSE FIRST)

| Zmiana | Szczegół |
|--------|----------|
| E8 zachowuje | `podejście wodociągowe wewnętrzne` (**legacy REUSE**) |
| Usunięto z p2b-5 | `podejścia wodociągowe wewnętrzne` |
| p2b-5 zostaje | tylko `podejście wodociągowo-kanalizacyjne*` · `podejście wod-kan*` |

### Poza A1–A4

| Element | Status |
|---------|--------|
| Scope P2 / lista ID NEW | **bez zmian** |
| Pipeline P3.3 · KPI K-P2-1…3 · OUT · rollback | **bez zmian** |
| Quotes 100% kontrakt | **bez zmian** |

---

## 2. Tabela A1–A4 = PASS/FAIL

| ID | Uwaga AR | Po amend | Wynik |
|----|----------|----------|-------|
| **A1** | namePl: zerwanie / demontaż / ścianka ∈ §6.2 | Rename · skan name/desc = **0** trafień | **PASS** |
| **A2** | E6 `…na stelażu` ↔ p2b-scianka | Usunięte z E6 · owner = p2b-1 | **PASS** |
| **A3** | E4 ↔ p2b-3 „punkt oświetleniowy” | Usunięte z E4 · owner = p2b-3 | **PASS** |
| **A4** | E8 ↔ p2b-5 near-dup podejście wod* | E8 = wodociągowe · p2b-5 = wod-kan łączone | **PASS** |

Evidence: skan foldPolish + overlap check EXTEND↔NEW → **ALL_PASS** (2026-07-30).

---

## 3. Kontrola wewnętrzna (po amend)

| Check | Wynik |
|-------|--------|
| Parent DF §4.3 / §7.3 | **PASS** |
| P2 PLAN | **PASS** |
| SSOT FIRST | **PASS** |
| REUSE FIRST | **PASS** (A4: podejście wodociągowe → E8) |
| ZERO DUPLICATE LOGIC | **PASS** |
| Pełne frazy keywords | **PASS** |
| Brak kolizji EXTEND ↔ NEW | **PASS** |
| Brak kolizji NEW ↔ NEW | **PASS** |
| Brak kolizji z p1a/b/c / legacy ID | **PASS** |
| Quotes 100% (kontrakt) | **PASS** |
| Pipeline P3.3 | **PASS** (bez zmian) |
| KPI | **PASS** (bez zmian) |
| OUT | **PASS** (bez zmian) |
| Rollback L1–L3 | **PASS** (bez zmian) |

---

## 4. Wynik końcowy

| | |
|--|--|
| **Decyzja** | **READY FOR THIN ARCHITECTURE REVIEW** |
| **Nie** | CHANGES STILL REQUIRED |
| **Nie** | READY FOR OWNER GO / OPS / IMPLEMENT |

```text
Następny krok:
  THIN ARCHITECTURE REVIEW (re-check wyłącznie A1–A4)
    → PASS → Owner GO
    → FAIL → kolejny amend
```

**Zakaz:** OWNER GO · OPS · IMPLEMENT · commit · push · zmiany kodu.

---

**AMEND STATUS:** **COMPLETE** · **READY FOR THIN ARCHITECTURE REVIEW**
