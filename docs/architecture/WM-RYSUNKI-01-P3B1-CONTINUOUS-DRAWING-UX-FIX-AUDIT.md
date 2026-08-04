# WM-RYSUNKI-01 P3B.1 — CONTINUOUS DRAWING UX FIX · AUDIT

> **STATUS:** **PASS** · **ACCEPTED** · DF → [`WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-DESIGN-FREEZE.md) (**FROZEN**)  
> **ID:** WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-AUDIT  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3B.1 — CONTINUOUS DRAWING UX FIX**  
> **FAZA:** **AUDIT** → **ACCEPTED**  
> **MODE:** AUDIT ARCHIVE · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO AUDIT** (P3B.1)  
> **Baseline prod tip:** UI **2.66.02** / **`abe57f9a`** · P3B **CLOSED** · [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Parent P3B:** [`WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-CLOSEOUT.md`](./WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-CLOSEOUT.md) · DF [`WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-DESIGN-FREEZE.md) (**FROZEN** — continuous ON · **SUPERSEDED** przez P3B.1 DF)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3B.1 — AUDIT

STATUS: PASS / ACCEPTED
DF: FROZEN → WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-DESIGN-FREEZE.md
Problem: po 2. kliku auto-start kolejnej ściany (chain)
Oczekiwane: idle po wall · tool wall ON · nowy 1. klik

Root cause: P3B D-P3B-05 / finishLine setLineStart(end)
Fix: thin · editor-only · clearWallPreview po wall commit

OUT: JSON · schemaVersion · PDF · ZIP · Cloud · AppSettings
IMPLEMENT / COMMIT / PUSH: NIE
NEXT: OWNER GO ARCHITECTURE REVIEW
════════════════════════════════════════════════════════
```

---

## 0. Kontekst wejściowy

| Element | Stan |
|---------|------|
| **P3B** | **CLOSED** · **PRODUCTION VERIFIED** · tip **2.66.02** / **`abe57f9a`** |
| **Ghost / Live Length / ESC / rAF** | **ZOSTAJĄ** (poza zmianą post-commit wall) |
| **Continuous chain** | **IN w P3B** (celowo) → **Owner zgłasza UX mismatch** → slice **P3B.1** |
| **Model** | `schemaVersion = 1` · N × `DrawingWallObject` (nie polyline) |
| **Gate Owner** | bez JSON / schema / PDF / ZIP / Cloud / AppSettings |

### 0.1 Problem (Owner)

```text
AKTUALNIE (prod P3B):
  klik → klik → wall · setLineStart(end) → Ghost od razu od end
  (= automatyczny start kolejnej ściany)

OCZEKIWANE (P3B.1):
  klik → klik → wall utworzona
       → previewWall usunięty
       → tool === "wall" pozostaje aktywny
       → kolejna ściana dopiero po NOWYM pierwszym kliknięciu
```

### 0.2 Zasady (wiążące)

| Zasada | Jak stosujemy w P3B.1 |
|--------|------------------------|
| **SSOT FIRST** | SSOT trwały = JSON rysunku — **bez zmian**. Ghost nadal ephemeral (`lineStart` / `previewEnd` / option `previewWall`) |
| **REUSE FIRST** | REUSE istniejącego `clearWallPreview()` · `finishLine` · `snapCoord` · Ghost path P3B |
| **ZERO DUPLICATE LOGIC** | jedna ścieżka commit wall; **nie** drugi tryb wall / nowy state machine / osobny renderer |
| **THIN SLICE** | tylko semantyka **po** udanym wall commit · bez SHIFT · bez P4 · bez arrow Ghost |

---

## 1. Dowód — stan obecny (kod)

### 1.1 Root cause

Po udanym `finishLine("wall", …)` P3B **celowo** ustawia start następnej ściany na `end`:

```520:527:src/app/WmPrintDrawingEditor.tsx
    /* MR-P3B-02 — continuous tylko wall; arrow/dimension → clear. */
    if (type === "wall") {
      setLineStart(end);
      setPreviewEnd(null);
      pendingPreviewEndRef.current = null;
    } else {
      clearWallPreview();
    }
```

Skutek UX:

| Krok | Zachowanie |
|------|------------|
| 1. klik | `lineStart = p` · Ghost po move |
| 2. klik | commit wall · **`lineStart = end`** |
| move | od razu Ghost od `end` → użytkownik widzi **auto-start łańcucha** |
| ESC | dopiero wtedy `clearWallPreview()` (D-P3B-08) |

Helper idle już istnieje:

```177:185:src/app/WmPrintDrawingEditor.tsx
  const clearWallPreview = useCallback(() => {
    setLineStart(null);
    setPreviewEnd(null);
    pendingPreviewEndRef.current = null;
    // … cancel rAF …
  }, []);
```

### 1.2 Kontrakt P3B (historia — nie błąd implementacji)

| Źródło | Treść continuous |
|--------|------------------|
| P3B DF §5.2–5.3 · **D-P3B-05** | Continuous **ON** · `setLineStart(endPoint)` · ESC kończy |
| P3B AC-P3B-06 | po wall kolejny Ghost od end |
| P3B OV / PV | Continuous **PASS** (zgodne z DF) |
| Guide | „kolejne odcinki od ostatniego punktu; Esc = koniec” |
| Hint edytora | przy `lineStart`: „Esc = koniec rysowania ścian.” |

**Werdykt RCA:** zachowanie = **zgodne z P3B FROZEN**. P3B.1 = **świadoma zmiana produktu** (amend continuous), nie hotfix regresji kodu względem DF P3B.

---

## 2. Docelowy kontrakt UX (propozycja AUDIT → DF)

```text
tool wall aktywny (bez zmiany tool)

1. klik  → setLineStart(snap(p)) · Ghost po move
move     → previewWall (bez zmian P3B)
2. klik  → finishLine wall · commit (jak dziś)
         → clearWallPreview()   ← ZMIANA P3B.1
         → tool pozostaje "wall"
         → brak Ghost do nowego 1. kliknięcia
ESC      → nadal clear gdy lineStart (anuluj w trakcie Ghost)
```

| Po 2. kliku | P3B (prod) | P3B.1 (docelowo) |
|-------------|------------|------------------|
| wall w `objects[]` | TAK | TAK (bez zmian) |
| `previewWall` | start od `end` | **brak** |
| `lineStart` | `= end` | **`null`** |
| `tool` | `wall` | **`wall`** (bez zmian) |
| Następna ściana | move / bez Esc | **nowy 1. klik** |
| ESC po idle | no-op (brak lineStart) | no-op |
| ESC w trakcie Ghost | clear | clear (REUSE) |

**„Continuous” w P3B.1** = tool wall **pozostaje wybrany** (można rysować wiele ścian sesją), **bez** auto-chain od ostatniego punktu.

---

## 3. Zakres IN / OUT

### 3.1 IN (thin)

| IN | Uwagi |
|----|--------|
| `finishLine` branch wall → **`clearWallPreview()`** zamiast `setLineStart(end)` | 1 ścieżka · REUSE helper |
| Hint edytora (string gdy wall) | usunąć / zmienić „Esc = koniec łańcucha” → np. 1./2. punkt |
| `GuideView` copy rysunki | bez „kolejne odcinki od ostatniego punktu” |
| Testy | zaktualizować semantykę continuous (patrz §5) · regresja P0–P3B smoke |
| Changelog UI | patch (np. **2.66.03**) — dopiero IMPLEMENT |

### 3.2 OUT (Owner + Gate)

| OUT | Powód |
|-----|--------|
| JSON / `objects[]` shape | SSOT nietknięty |
| `schemaVersion` bump | zakaz |
| PDF / ZIP / `export-pdf` / `previewWall` w export | P3B OUT zostaje; P3B.1 nie rusza export |
| Cloud merge / `DATA_KEY` / `CloudLoader` | zakaz |
| `AppSettings` / flaga `wmRysunkiEnabled` | zakaz |
| SHIFT angles · P4 punkty · CAD | poza slice |
| Arrow / dimension continuous | już clear; bez zmian semantyki |
| Drugi renderer / tymczasowy wall w JSON | ZERO DUP |
| Usuwanie Ghost Line / Live Length / rAF | **zostają** |

---

## 4. Zasady — checklist

| Zasada | Werdykt | Uzasadnienie |
|--------|---------|--------------|
| **SSOT FIRST** | **PASS** | Zmiana tylko React preview state po commit; model wall bez pól Ghost/length |
| **REUSE FIRST** | **PASS** | `clearWallPreview` już używane dla arrow/dimension / ESC / tool change |
| **ZERO DUPLICATE LOGIC** | **PASS** | Nie dodawać flagi `continuousMode`; wall post-commit = ten sam clear co inne linie |
| **THIN SLICE** | **PASS** | ~edytor + copy + testy; bez Cloud/PDF/schema |

---

## 5. Wpływ na testy / AC

| Artefakt | Skutek P3B.1 |
|----------|----------------|
| `scripts/test-wm-rysunki-01-p3b.mjs` T24 | Dziś: „2 wall objects” (model) — **nadal PASS**; **nie** dowodzi UX chain |
| Nowy test P3B.1 (rekomendacja DF) | Dokumentacja zachowania: po wall commit edytor **musi** iść w idle (`lineStart=null`) — unit/smoke na poziomie kontraktu edytora **lub** komentarz + static assert w skrypcie P3B.1 |
| AC-P3B-06 | **SUPERSEDED** dla chain Ghost — DF P3B.1 musi to jawnie zapisać |
| D-P3B-05 | **AMEND** — continuous chain OFF; tool sticky ON |
| AC-P3B-01…05, 07…15 | **bez regresji** (Ghost, length, PDF OUT, schema 1) |
| ESC AC | nadal clear **gdy** `lineStart` (anuluj mid-draw); po idle Esc niepotrzebny do „końca łańcucha” |

---

## 6. Ryzyka

| ID | Ryzyko | Mitygacja |
|----|--------|-----------|
| R1 | Użytkownicy przyzwyczajeni do łańcucha P3B | Guide + changelog · Esc hint update |
| R2 | Pomyłka: `setTool("select")` zamiast clear preview | DF: **tool wall zostaje** |
| R3 | Reject `L < 1` — dziś zostawia `lineStart` | **bez zmian** (nadal mid-draw) |
| R4 | Scope creep „polyline” / snap to last vertex | OUT — tylko clear po success |
| R5 | Docs tip / P3B CLOSEOUT stale o continuous | DF + CLOSEOUT P3B.1 · sync 09 przy release |

---

## 7. Allowlist (szkic IMPLEMENT — nie robić teraz)

| Plik | Rola |
|------|------|
| `src/app/WmPrintDrawingEditor.tsx` | wall post-commit → `clearWallPreview()` · hint string |
| `src/app/GuideView.tsx` | copy continuous |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | wersja UI |
| `scripts/test-wm-rysunki-01-p3b1.mjs` *(opcjonalnie)* | kontrakt idle po wall |
| `docs/architecture/WM-RYSUNKI-01-P3B1-*` | DF / AR / OV / PV / CLOSEOUT |

**Nie w allowlist:** `cloud-sync.ts` · `CloudLoader` · `export-pdf.ts` · `zip-entries.ts` · `app-settings` · typy JSON · Payroll.

---

## 8. Relacja do P3B FROZEN

| Decyzja | P3B | P3B.1 |
|---------|-----|-------|
| Ghost `previewWall` | IN | **IN** (bez zmian) |
| Live Length / grid label | IN | **IN** |
| Continuous chain `setLineStart(end)` | **ON** | **OFF** (amend) |
| Tool wall sticky po wall | (implikowane) | **ON** (jawne) |
| ESC mid-Ghost | clear | **clear** |
| PDF/ZIP Ghost OUT | FROZEN | **nietknięte** |

**Konflikt dokumentów:** dla continuous UX **DF P3B.1 wygrywa** nad D-P3B-05 / AC-P3B-06; reszta P3B zostaje.

---

## 9. Decyzje do zamrożenia w DF (Owner)

| ID | Temat | Rekomendacja AUDIT |
|----|-------|---------------------|
| **D-P3B1-01** | Po udanym wall | **`clearWallPreview()`** — nie `setLineStart(end)` |
| **D-P3B1-02** | Tool po wall | **pozostaje `wall`** |
| **D-P3B1-03** | Następna ściana | tylko **nowy 1. klik** |
| **D-P3B1-04** | ESC | clear gdy `lineStart` (anuluj Ghost) · **nie** wymagany do „końca łańcucha” |
| **D-P3B1-05** | JSON / schema / PDF / ZIP / Cloud / AppSettings | **OUT** |
| **D-P3B1-06** | D-P3B-05 / AC-P3B-06 | **SUPERSEDED** przez P3B.1 |

---

## 10. ACCEPTANCE CRITERIA (szkic → DF)

| ID | Kryterium |
|----|-----------|
| **AC-P3B1-01** | Po 2. kliku (wall OK): wall w `objects` · `lineStart === null` · brak `previewWall` |
| **AC-P3B1-02** | `tool` nadal `wall` |
| **AC-P3B1-03** | Move bez nowego 1. kliknięcia **nie** pokazuje Ghost |
| **AC-P3B1-04** | Nowy 1. klik → Ghost jak P3B |
| **AC-P3B1-05** | ESC podczas Ghost → clear · tool wall ON |
| **AC-P3B1-06** | `L < 1` → reject · `lineStart` zostaje (jak P3B) |
| **AC-P3B1-07** | schemaVersion 1 · PDF/ZIP bez Ghost · Cloud/AppSettings nietknięte |
| **AC-P3B1-08** | Regresja unit P0–P3B (poza continuous chain) **PASS** |

---

## 11. PAYROLL / Cloud Gate

```text
PAYROLL SAFETY GATE — WM-RYSUNKI-01 P3B.1

G1–G9: FEATURE thin · editor UX only
Cloud drawings merge: ZERO
AppSettings: ZERO
Payroll: OUT
schemaVersion / PDF / ZIP builders: ZERO

Wynik: FEATURE continuous UX fix only
```

---

## 12. Werdykt AUDIT

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy problem jest zdiagnozowany? | **TAK** — `setLineStart(end)` po wall |
| Czy to bug vs DF P3B? | **NIE** — DF P3B wymagał chain; P3B.1 = **zmiana UX** |
| FEASIBLE thin? | **TAK** |
| Zgodność SSOT / REUSE / ZERO DUP / THIN? | **PASS** |
| Potrzeba Cloud / schema / PDF? | **NIE** |
| **STATUS** | **PASS** · **ACCEPTED** |

```text
NEXT: OWNER GO ARCHITECTURE REVIEW
IMPLEMENT / COMMIT / PUSH: NIE
```

---

*AUDIT zakończony · DF FROZEN · bez implementacji · bez commit · bez push.*
