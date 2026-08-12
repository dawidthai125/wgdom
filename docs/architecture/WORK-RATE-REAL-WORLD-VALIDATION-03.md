# WORK-RATE-REAL-WORLD-VALIDATION-03

> **DATA TESTU:** 2026-08-12  
> **LIVE:** `version.json` **2.66.35** / tip `ec99dbb` (przed poprawką parsera)  
> **Cel:** walidacja P2 na rzeczywistych stronach 4 zatwierdzonych źródeł

---

## Źródła (kanoniczne URL)

| Źródło | URL |
|--------|-----|
| KB.pl | https://kb.pl/cenniki/miejskie/remonty-mieszkan/wroclaw/ |
| SCCOT | https://sccot.pl/dobra-robota/cennik-uslug-budowlanych-i-remontowych/ |
| Extradom | https://www.extradom.pl/porady/artykul-cennik-uslug-budowlanych |
| CennikRemontow.pl | https://cennikremontow.pl/wroclaw-remonty-cennik/ |

---

## Stan przed poprawką

Parser oczekiwał wyłącznie markerów `data-wgdom-work-rate`.  
Rzeczywiste HTML: **tabele cennikowe**, bez markerów → **RATE_GAP** na wszystkich źródłach (poprawne fail-soft, ale nieużywalne produkcyjnie).

URL lookup budował `?s=query` (search) zamiast kanonicznych stron cenników wskazanych przez Ownera.

---

## Testowane roboty (ONE WORK)

Główny flow e2e:

**Malowanie ścian** (`m2`)

Dodatkowe sprawdzenia:

- Gruntowanie ścian (SCCOT → minimum `od …` → REJECT)
- Malowanie pokoju 10 m2 (SCCOT → package → REJECT)

---

## Wynik per źródło (po poprawce parsera)

### KB.pl — **PASS**

| Pole | Wartość |
|------|---------|
| Znaleziona pozycja | Malowanie ścian i sufitów (trzy warstwy) |
| Stawka | średnia min/max **21,80 zł/m²** (21,00–22,60) |
| Region | **WROCLAW** |
| Labor-only | TAK (opis nie wskazuje materiału w cenie) |
| Qualification | PASS |

### SCCOT — **RATE_GAP** (dla „Malowanie ścian” / m²)

| Pole | Wartość |
|------|---------|
| Oczekiwanie | regularna stawka zł/m² labor-only |
| Rzeczywistość | brak wiersza „Malowanie ścian” w zł/m²; są pakiety „Malowanie pokoju … od X zł” oraz pozycje `od … zł/m2` (minimum) |
| Qualification | pakiet → REJECT · `od` → REJECT (`minimum_excluded`) |
| Werdykt | **RATE_GAP** — nie inventujemy ceny za m² |

### Extradom — **PASS**

| Pole | Wartość |
|------|---------|
| Znaleziona pozycja | Malowanie ścian i sufitów |
| Stawka | midpoint widełek **20 zł/m²** (15–25) |
| Region | **POLSKA** |
| Qualification | PASS |

### CennikRemontow.pl — **PASS**

| Pole | Wartość |
|------|---------|
| Znaleziona pozycja | Malowanie ścian dwukrotne (farba-biała) |
| Stawka | midpoint **24 zł/m²** (14–34) |
| Region | **WROCLAW** |
| Qualification | PASS |

---

## Flow e2e (Malowanie ścian)

```text
MISSING → research (fixture = real HTML, 0 live browser fetch w harness)
→ qualify
→ mediana (preferencja Wrocław): KB 21,80 + CR 24 → 22,90
→ Owner Accept → OUR RATE
→ drugi lookup → REUSE · HTTP = 0
companyPricePln = 35 UNCHANGED
```

Extradom (POLSKA) nie wszedł do mediany Wrocław (zgodnie z region preference) — pozostaje w puli POLSKA gdy brak WROCLAW.

---

## Poprawki kodu (w zakresie P2)

| Zmiana | Opis |
|--------|------|
| Kanoniczne URL | `WORK_RATE_CANONICAL_CENNIK_URL` + Edge `workRateBuildSelectiveUrl` |
| Parser tabel | tabele HTML + scalanie `m<sup>2</sup>` |
| Identity | pierwsze słowo nazwy musi pasować (anty-false-positive „gruntowanie … malowaniem”) |
| Minimum / package | `od …` → `minimum` · „Malowanie pokoju” → `package` → REJECT w qualify |

**NIE:** full catalogue · nowe źródła · Bid/Offer · Price Memory · companyPricePln

---

## HTTP

| Krok | HTTP |
|------|------|
| Otwarcie katalogu | 0 |
| Research ONE (Edge prod) | do 4 requestów (1 URL / źródło) |
| Drugi lookup CURRENT | **0** |

Harness RW-03: fixture real HTML · `fetchCalls` live = 0.

---

## CODE CHANGES

```text
YES — parser + canonical URLs + Edge URL builders
(+ harness RW-03 + docs)
```

---

## Testy

- `test-work-rate-real-world-validation-03.mjs`
- regresja P2 / P0 / P1 / Legal (+ pozostałe w release)

---

## STOP

Brak P3 · brak Bid/Offer · brak nowych źródeł.
