# ZI-2026 — Mapping Correction Report

**Data:** 2026-06-15  
**Tryb:** READ ONLY · **STOP RELEASE** (manual gate FAIL)  
**Artefakty:** `c:/Users/dawid/Desktop/Dokumenty/ZI.pdf` · `audit/tauron-audit-2026-06-15/zi-2026-smoke-sepa-83-7.pdf`  
**Dane forensics:** `zi-2026-mapping-audit-data.json` · `zi-2026-mapping-spatial.json`

---

## 1. Root cause

**A) Zły mapping pól PDF → zmienne biznesowe** (pewność: **HIGH**)

Wdrożenie mapowało:

| Zmienna | Błędne pole | Rola rzeczywista pola |
|---------|-------------|------------------------|
| JOB_STREET | `Pole tekstowe 99` | **Ulica** — **POPRAWNE** |
| JOB_BUILDING | `Pole tekstowe 102` | **Kod pocztowy** (wiersz pośredni) — **BŁĄD** |
| JOB_APARTMENT | `Pole tekstowe 111` | **Numer budynku** (wiersz dolny) — **BŁĄD** |

**Nie** charLimit/comb (B), **nie** błąd zapisu `/V` (C), **nie** sam appearance (D).

Generator zapisał poprawne stringi (`83`, `7`) do **złych widgetów**. pdf.js i `/V` raportowały „PASS”, ale render wizualny umieszcza wartości pod **etykietami sąsiadujących pól** — stąd ulica OK, budynek i lokal źle.

### Dlaczego wcześniejszy audit mylił 102 = budynek?

W `ZI.pdf` (ręczny Edge) w polu **102** jest wartość `55` — interpretowano to jako numer budynku.  
Forensics pozycyjne pokazują: **102 leży pod etykietą „Kod pocztowy”** (y≈636, x≈206), **nie** pod „Numer budynku”. Wartość `55` w `/V` nie dowodzi roli biznesowej pola.

---

## 2. Poprawne mapowanie §4

Sekcja **„4. OKREŚLENIE OBIEKTU ZGŁASZANEGO DO PRZYŁĄCZENIA”** = **strona 2** (pdf.js `page=1`, viewer **TD ZI 2/2**).

Formularz ma **dwa bloki** „Ulica | Numer budynku | Numer lokalu” (duplikat layoutu FormMaker).  
Ręczny `ZI.pdf` wypełnia **dolny blok** (y≈584); górny blok (y≈728) pozostaje pusty.

### 2A. Dolny blok — **potwierdzony wizualnie** (ulica ze smoke PASS)

Etykiety nad wierszem pól: **y≈605** · pola: **y≈584**

| Pole PDF | Nr | Page | rect [x1,y1,x2,y2] | Etykieta nad polem (x,y) | Rola biznesowa |
|----------|-----|------|---------------------|---------------------------|----------------|
| **Pole tekstowe 99** | 99 | 2 | [24.52, 584.69, 375.73, 602.76] | **Ulica** (24.52, 605.08) | **JOB_STREET** |
| **Pole tekstowe 111** | 111 | 2 | [388.68, 584.92, 473.79, 602.99] | **Numer budynku** (388.68, 605.31) | **JOB_BUILDING** |
| **Pole tekstowe 112** | 112 | 2 | [486.72, 584.92, 571.69, 602.99] | **Numer lokalu** (486.72, 605.31) | **JOB_APARTMENT** |

### 2B. Górny blok — **kandydat alternatywny** (pusty w ZI.pdf i smoke)

Etykiety: **y≈748** · pola: **y≈728**

| Pole PDF | Nr | Page | rect | Etykieta nad polem | Rola (hipoteza) |
|----------|-----|------|------|-------------------|-----------------|
| **Pole tekstowe 95** | 95 | 2 | [24.52, 728.08, 375.73, 746.16] | **Ulica** (24.52, 748.48) | JOB_STREET? |
| **Pole tekstowe 96** | 96 | 2 | [388.68, 728.08, 473.61, 746.16] | **Numer budynku** (388.68, 748.48) | JOB_BUILDING? |
| **Pole tekstowe 97** | 97 | 2 | [486.72, 728.08, 571.75, 746.16] | **Numer lokalu** (486.72, 748.48) | JOB_APARTMENT? |

**Rekomendacja implementacyjna (po audycie):** na razie korygować **dolny blok 99 / 111 / 112** (dowód: ulica smoke + ręczny fill użytkownika).  
Górny blok wymaga **osobnego manual gate** — oba bloki mogą być widoczne na wydruku.

### 2C. Pola **poza** mappingiem JOB_* (informacyjnie)

Wiersz **y≈615** (etykiety Kod pocztowy / Miejscowość @ y≈636):

| Pole | rect | Etykieta | Rola |
|------|------|----------|------|
| 100 | [24.52, 615.69, 193.61, 633.77] | (szerokie pole pod „Ulica” dolnego rzędu) | nie JOB_STREET |
| **102** | [206.63, 615.69, 235.53, 633.77] | **Kod pocztowy** (206.62, 636.09) | kod — **tu trafiło „83” w smoke** |
| 110 | [248.64, 615.69, 291.64, 633.77] | Kod pocztowy (kontynuacja) | kod |
| 101 | [304.67, 615.69, 571.79, 633.77] | **Miejscowość** (304.67, 636.09) | miasto |

---

## 3. Dowód wizualny (pozycja, nie nazwa FormMaker)

### 3.1 Metoda

1. pdf.js: tekst strony 2 → pozycje etykiet.  
2. pdf.js: `getFieldObjects()` → rect widgetów.  
3. Dopasowanie **X etykiety ≈ X lewej krawędzi pola** + etykieta **nad** polem (Δy ≈ 15–25 pt).

Skrypt: `_readonly-spatial-mapping.mjs`

### 3.2 Schemat dolnego bloku §4

```text
y≈605   [ Ulica          ] [ Numer budynku ] [ Numer lokalu ]
y≈584   [ Pole 99        ] [ Pole 111      ] [ Pole 112     ]
        ← Sępa OK ────────   ← powinno 83 ─   ← powinno 7 ──

y≈636   [ Kod pocztowy   ] [ Miejscowość                    ]
y≈615   [ Pole 100       ] [ 102 ] [110] [ Pole 101        ]
                          ↑ smoke wpisał 83 TUTAJ (błąd)
```

### 3.3 Porównanie `/V` — oczekiwane vs smoke vs błędne mapowanie

Fixture: **Sępa Szarzyńskiego / 83 / 7**

| Pole | rect Y | Etykieta wizualna | ZI.pdf (user) | smoke (błędny gen) | Przy poprawnym mapowaniu |
|------|--------|-------------------|---------------|---------------------|--------------------------|
| 99 | 584.69 | Ulica | Szkolna | **Sępa Szarzyńskiego** ✓ | Sępa Szarzyńskiego |
| 111 | 584.92 | Numer budynku | 5 | **7** ✗ (to lokal) | **83** |
| 112 | 584.92 | Numer lokalu | (pusty) | (pusty) | **7** |
| 102 | 615.69 | Kod pocztowy | 55 | **83** ✗ | (puste / osobna zmienna) |

**Objaw użytkownika wyjaśniony:**

- Ulica OK → wartość w **99** pod właściwą etykietą.  
- Budynek zły → **83** w **102** renderuje się w kolumnie **Kod pocztowy** (wiersz niżej).  
- Lokal zły → **7** w **111** renderuje się pod **Numer budynku**, a **112** (lokal) puste.

---

## 4. Tabela zbiorcza — kandydaci §4 (Ulica / Budynek / Lokal)

| Pole PDF | Widoczna etykieta (dopasowanie X/Y) | Rola biznesowa | Status |
|----------|-------------------------------------|----------------|--------|
| **Pole tekstowe 99** | Ulica (dolny rząd) | **JOB_STREET** | **CONFIRMED** |
| **Pole tekstowe 111** | Numer budynku (dolny rząd) | **JOB_BUILDING** | **CONFIRMED (korekta)** |
| **Pole tekstowe 112** | Numer lokalu (dolny rząd) | **JOB_APARTMENT** | **CONFIRMED (korekta)** |
| Pole tekstowe 95 | Ulica (górny rząd) | JOB_STREET? | OPEN — blok pusty w dowodach |
| Pole tekstowe 96 | Numer budynku (górny rząd) | JOB_BUILDING? | OPEN |
| Pole tekstowe 97 | Numer lokalu (górny rząd) | JOB_APARTMENT? | OPEN |
| ~~Pole tekstowe 102~~ | Kod pocztowy | ~~JOB_BUILDING~~ | **REJECTED** |
| ~~Pole tekstowe 111~~ | Numer budynku | ~~JOB_APARTMENT~~ | **REJECTED** (to budynek, nie lokal) |

---

## 5. Klasyfikacja przyczyny smoke FAIL

| Hipoteza | Werdykt |
|----------|---------|
| **A) Zły mapping** | **TAK — root cause** |
| B) charLimit / comb | NIE (dotyczy 102 jako kod; nie wyjaśnia przesunięcia 7→111) |
| C) Błąd fill (/V) | NIE — `/V` zapisane zgodnie z błędnym mapowaniem |
| D) Błąd appearance | NIE — viewer pokazuje wartości w rect przypisanych widgetom |
| E) Inne | Duplikat dwóch bloków adresowych — ryzyko prod; wymaga decyzji po fixie dolnego bloku |

---

## 6. Pliki wymagające poprawki (lista — bez implementacji w tym etapie)

| Plik | Co zmienić |
|------|------------|
| `src/lib/wm-print/generate-pdf-zi-tauron2026.ts` | Mapping → **99 / 111 / 112**; usunąć **102** z JOB_BUILDING |
| `src/lib/wm-print/default-templates.ts` | `pdfFieldMapping` seed |
| `docs/ZI-2026-HANDOFF.md` | Mapping SSOT |
| `scripts/test-wm-print-zi-2026-smoke.mjs` | Asercje na 111/112 |
| `src/app/GuideView.tsx` | Copy ZI (jeśli wspomina 102) |
| `docs/ZI-2026-IMPACT-REPORT.md` | Wpływ |
| `docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md` | Status gate |

**Nie zmieniano w tym audycie:** kod, commit, push, deploy.

---

## 7. Następny krok (poza READ ONLY)

1. Popraw mapping na **99 / 111 / 112**.  
2. Regeneruj `zi-2026-smoke-sepa-83-7.pdf`.  
3. Manual gate: Edge / Chrome / Adobe — **83** pod „Numer budynku”, **7** pod „Numer lokalu”.  
4. Opcjonalnie: test czy trzeba **równolegle** wypełniać **95 / 96 / 97** (górny blok).

---

## 8. Odrzucone mapowanie (historyczne)

| Stare | Powód odrzucenia |
|-------|------------------|
| 99 → ulica | **Zachować** |
| 102 → budynek | Pole pod etykietą **Kod pocztowy**, y=615 ≠ wiersz budynku y=584 |
| 111 → lokal | Pole pod etykietą **Numer budynku**, x=388.68 |

**Poprzedni raport** (`zi-restart-audit-report.json`) opierał się na korelacji wartości `/V` bez dopasowania rect→etykieta — **niewystarczający dowód wizualny**.
