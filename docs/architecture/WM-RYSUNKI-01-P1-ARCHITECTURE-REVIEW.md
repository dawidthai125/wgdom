# WM-RYSUNKI-01 P1 — ARCHITECTURE REVIEW

> **ID:** WM-RYSUNKI-01-P1-ARCHITECTURE-REVIEW  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P1 — Toolset MVP (symbole)**  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **STATUS:** **COMPLETE**  
> **WERDYKT:** **PASS WITH MINOR RECOMMENDATIONS**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO ARCHITECTURE REVIEW**  
> **Źródła:** [`WM-RYSUNKI-01-P1-AUDIT.md`](./WM-RYSUNKI-01-P1-AUDIT.md) (**ACCEPTED**) · [`WM-RYSUNKI-01-P1-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P1-DESIGN-FREEZE.md) (**FROZEN**)  
> **Kontekst P0 (read-only):** `wm-technical-drawings/*` · tip **2.65.96** / **`028e4819`** · [`WM-RYSUNKI-01-P0-CLOSEOUT.md`](./WM-RYSUNKI-01-P0-CLOSEOUT.md)  
> **EPIC AR (parent):** [`WM-RYSUNKI-01-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-ARCHITECTURE-REVIEW.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P1 — ARCHITECTURE REVIEW

WERDYKT: PASS WITH MINOR RECOMMENDATIONS

Blokery: BRAK
DF spójny z AUDIT · SSOT/REUSE/ZERO DUP/THIN OK
schemaVersion 1 · jeden renderSymbol · P0 nienaruszone
PDF/ZIP/Punkty/Payroll OUT

Gotowy do Owner GO IMPLEMENT P1
IMPLEMENT / COMMIT / PUSH: NIE (ten dokument)
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | P1 DF ↔ P1 AUDIT ↔ P0 kod (read-only) ↔ zasady WGDOM |
| Mutacje | **tylko** ten dokument AR (+ opcjonalny status pointer w DF) |
| Kryterium **FAIL** | blocker: drugi renderer · breaking schema · payroll/sync CORE · PDF-as-SSOT · naruszenie P0 kontraktu |
| Kryterium **PASS** | brak blokerów · DF kompletny |
| **PASS WITH MINOR RECOMMENDATIONS** | brak blokerów + MR-* do IMPLEMENT / OV |

---

## 1. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy architektura P1 jest spójna? | **TAK** |
| Czy są blokery? | **NIE** |
| Czy DF zamyka AUDIT + decyzje Ownera? | **TAK** |
| Czy wolno iść w IMPLEMENT po Owner GO? | **TAK** |
| Czy wymagany amend DF przed IMPLEMENT? | **NIE** (MR nie wymuszają amend) |
| Czy P1 narusza P0? | **NIE** (additive) |

**WERDYKT: PASS WITH MINOR RECOMMENDATIONS**

---

## 2. Zgodność DF ↔ AUDIT

| Temat AUDIT / Owner | DF P1 | Wynik |
|---------------------|-------|--------|
| schemaVersion = 1 | §2 #1 · §3.1 | **PASS** |
| symbols/ zamknięta · zero npm | §2 #2 · §4 | **PASS** |
| Door rotation + flipH · wallRefId OUT | §2 #3 · §3.3.1 | **PASS** |
| Window stamp + rotation | §2 #4 · §3.3.2 | **PASS** |
| Dimension 2-click · label bez jednostki | §2 #5 · §3.3.3 | **PASS** |
| Arrow IN · type `arrow` | §2 #6 · §3.3.4 | **PASS** (amend vs EPIC DF — jawny) |
| Opis = text preset | §2 #7 · §3.3.5 | **PASS** |
| Toolbar 9 narzędzi | §6 | **PASS** |
| AC-P1-08 renderSymbol pipeline | §5 · §9 | **PASS** |
| PDF / ZIP / Punkty / Payroll OUT | §8.2 | **PASS** |
| Autosave / undo / LWW reuse P0 | §7 | **PASS** |

**Werdykt sekcji: PASS**

---

## 3. Kontrole zasad

### 3.1 SSOT FIRST

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| Geometria w `objects[]` | **PASS** | DF §3 · P0 entity |
| SVG = derivat | **PASS** | `renderDrawingSvg` + `renderSymbol` |
| PDF nie SSOT | **PASS** | OUT P1 · EPIC D3 na P2 |
| `renderedSvg` cache odrzucalny | **PASS** | bump `renderVersion` przy P1 |

**PASS**

### 3.2 REUSE FIRST

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| KV / flag / tab / panel | **PASS** | P0 CLOSED — bez nowego DATA_KEY |
| Autosave debounce | **PASS** | DF §7 · editor P0 |
| `DrawingUndoStack` | **PASS** | snapshot dokumentu |
| LWW `mergeWmTechnicalDrawings` | **PASS** | bez zmiany semantyki |
| Snap / grid / 2-click wall | **PASS** | reuse gesture → dimension/arrow |
| Stamp text → door/window/… | **PASS** | AUDIT mapa |

**PASS**

### 3.3 ZERO DUPLICATE LOGIC

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| Opis ≠ nowy type | **PASS** | text preset |
| Jeden `renderSymbol` | **PASS** | AC-P1-08 · zakaz ad-hoc renderer |
| Brak kopi IEC Schematów | **PASS** | DF §4.1 #5 |
| Wall linia vs symbole | **PASS*** | *DF: wall specjalizacja OK; symbole stamp/arrow → `renderSymbol` |

**PASS** (+ **MR-P1-01** doprecyzowanie wall/text vs symbol)

### 3.4 THIN SLICE

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| PDF / ZIP / points OUT | **PASS** | §8.2 |
| wallRefId / auto-attach OUT | **PASS** | §3.3.1 |
| Jedna flaga (bez `-p1`) | **PASS** | §7 |
| Allowlist bez cloud-sync rewrite | **PASS** | §10 |

**PASS**

---

## 4. Checklist techniczna (Owner GO)

| Obszar | Ocena | Uwagi |
|--------|-------|--------|
| **schemaVersion = 1** | **PASS** | additive `arrow` · `flipH` · typed parsers |
| **renderSymbol()** | **PASS** | obowiązkowy tor AC-P1-08 |
| **symbols/** | **PASS** | zamknięty katalog ID + `unknown` |
| **arrow** | **PASS** | type + `arrow-straight` · 2-click |
| **dimension** | **PASS** | 2-click · label bez jednostki · markery proceduralne |
| **door flipH** | **PASS** | + rotation · wallRefId strip |
| **toolbar** | **PASS** | 9 tools w kolejności DF |
| **autosave** | **PASS** | bez redesignu |
| **undo** | **PASS** | ten sam stack · max 50 |
| **LWW / Cloud** | **PASS** | ten sam klucz · merge per drawing id |
| **renderer SVG** | **PASS** | rozszerzyć `render-svg.ts` · bump renderVersion |
| **przyszły PDF** | **PASS** | czysty SVG (`showGrid` off) · brak PDF w P1 |
| **AC-P1-01…08** | **PASS** | kompletne · testowalne |

---

## 5. Pytania dodatkowe Ownera

### 5.1 Czy wszystkie symbole mogą używać jednego lokalnego modelu: `viewBox` + `localBounds` + `transform`?

| Werdykt | **TAK (zalecany kontrakt IMPLEMENT)** |
|---------|--------------------------------------|

**Proponowany model lokalny (nie wymaga amend DF — doprecyzowanie AR):**

```text
SymbolDef {
  symbolId
  viewBox: { x, y, w, h }      // lokalny układ symbolu
  localBounds: { x, y, w, h }  // hit-test / selection box w lokalnych j.u.
  paths / content                // SVG fragment w viewBox
}

SymbolPlacement (runtime z obiektu) {
  // stamp (door/window/vent/boiler):
  origin: { x, y }               // z object.x/y
  rotationDeg
  flipH?
  scale?                         // z width / defaultSize

  // line-oriented (arrow; opcjonalnie grot wymiaru):
  // origin = midpoint lub start
  // rotationDeg = atan2(y2-y1, x2-x1)
  // scaleX = length / localLength
}
```

| Typ | Jak mapować |
|-----|-------------|
| door / window / vent / boiler | stamp: translate(origin) · rotate · scale(flipH → scaleX=-1) |
| arrow | line: transform z odcinka `(x1,y1)–(x2,y2)` + grot w `renderSymbol` |
| dimension adornments | markers na końcach w tym samym helperze; **linia wymiaru + label** mogą być proceduralne *wewnątrz* jednego wywołania renderu obiektu (nie drugi renderer) |
| text / opis | `<text>` w world coords (P0) — **nie musi** mieć path w viewBox; selection/drag jak P0 (**MR-P1-02**) |
| wall | linia P0 — poza `renderSymbol` (DF §5) |

**Wniosek:** jeden lokalny model **dla biblioteki symboli**; wall/text to specjalizacje dokumentu, nie złamanie AC-P1-08.

### 5.2 Czy implementacja wymaga drugiego renderer’a?

| Werdykt | **NIE** |
|---------|---------|

| Warstwa | Rola |
|---------|------|
| `renderDrawingSvg(drawing)` | **jedyny** entry SVG dokumentu (P0) |
| `renderSymbol(...)` | helper **wewnątrz** domeny — nie osobny „editor canvas renderer” |
| Editor | pointer + hit na SVG z `data-id` — bez Canvas SSOT |

**Zakaz:** osobny Konva/Fabric · drugi string-builder „tylko do edycji” rozjeżdżający się z export path.

### 5.3 Czy P1 narusza P0?

| Werdykt | **NIE** |
|---------|---------|

| Kontrakt P0 | P1 |
|-------------|-----|
| `schemaVersion: 1` | zostaje |
| wall + text | bez usuwania · toolbar zachowuje |
| passthrough nieznanych / przyszłych typów | `arrow` + typed door… = rozszerzenie; P4 nadal skip render |
| flaga / tab / KV / LWW / autosave / undo | bez redesignu |
| tip 2.65.96 dokumenty w polu | roundtrip AC-P1-07 |
| hard-delete list | bez tombstone (P0 MR-02) |

**Ryzyko residualne:** starszy klient P0-only nie renderuje drzwi (pusty string) — akceptowalne (flaga OFF / tip upgrade); dane nie giną.

---

## 6. Cloud · Sync · Payroll

| Check | Wynik |
|-------|--------|
| Nowy DATA_KEY | **NIE** |
| Zmiana `finalizePayrollBundleMerge` | **NIE** |
| Merge LWW per drawing id | **bez zmian semantyki** |
| Obiekty w dokumencie | całość wygrywa z `updatedAt` (jak Schematy) — **Accepted residual** (brak OT) |
| Edge | **OUT** |

**PASS** · Gate FEATURE.

---

## 7. Wydajność · SVG · PDF (przyszły)

| Temat | Ocena |
|-------|--------|
| Soft warn &gt;300 obiektów (EPIC MR-05) | **Should** w P1 (**MR-P1-03**) |
| Drag bez full undo/SVG storm | reuse P0 MR-06 (**MR-P1-04**) |
| Proste pathy w `symbols/` | **Must** |
| PDF P2 | ten sam SVG bez grid — architektura **gotowa**, implementacja **OUT** |

---

## 8. AC completeness

| ID | Architektura pokrywa? |
|----|----------------------|
| AC-P1-01 | **TAK** |
| AC-P1-01b | **TAK** |
| AC-P1-02 | **TAK** |
| AC-P1-03 | **TAK** (`validateForSave` P0 + UI) |
| AC-P1-04 | **TAK** |
| AC-P1-05 | **TAK** (flipH w transform) |
| AC-P1-06 | **TAK** (flaga P0) |
| AC-P1-07 | **TAK** |
| AC-P1-08 | **TAK** (+ model §5.1) |

**GOOD**

---

## 9. Minor Recommendations (nie blokują GO IMPLEMENT)

| ID | Rekomendacja | Gdzie | Amend DF? |
|----|--------------|-------|-----------|
| **MR-P1-01** | W kodzie: `renderObject` switch — wall/text specjalizacja; door/window/vent/boiler/arrow/(dimension via helper) → **tylko** `renderSymbol` / shared adornment helper; zero trzeciej ścieżki | IMPLEMENT render | Nie |
| **MR-P1-02** | Text/opis: selection+drag jak P0; nie forsować path-sprite dla glyphów | IMPLEMENT | Nie |
| **MR-P1-03** | Soft warn UI przy `objects.length > 300` | IMPLEMENT / OV | Nie |
| **MR-P1-04** | Podczas drag stamp: `replace` bez undo per frame; commit undo na pointerup | IMPLEMENT editor | Nie |
| **MR-P1-05** | Kolejność macierzy: `translate(origin) → rotate → scale(flipH ? -1 : 1, 1)` — jeden helper `symbolTransformAttr` + test flip | IMPLEMENT | Nie |
| **MR-P1-06** | Normalize: dodać `"arrow"` do `KNOWN_OBJECT_TYPES`; rozszerzyć listę editable P1; **strip** `wallRefId` | IMPLEMENT normalize | Nie |
| **MR-P1-07** | OV checklist: flip drzwi · 2-click wymiar/strzałka · opis preset · final · flaga OFF · roundtrip P0 JSON | OV | Nie |
| **MR-P1-08** | Dimension label auto = `String(Math.round(len))` bez suffix — assert w teście | IMPLEMENT test | Nie |

---

## 10. Allowlist IMPLEMENT (potwierdzenie AR)

Zgodnie z DF §10 — **bez** `cloud-sync` rewrite · Payroll · ZIP · PDF.

```text
src/lib/wm-technical-drawings/types.ts
src/lib/wm-technical-drawings/normalize.ts
src/lib/wm-technical-drawings/render-svg.ts
src/lib/wm-technical-drawings/symbols/**
src/lib/wm-technical-drawings/report.ts
src/lib/wm-technical-drawings/index.ts
src/app/WmPrintDrawingEditor.tsx
src/app/WmPrintDrawingsPanel.tsx
scripts/test-wm-rysunki-01-p1.mjs
changelog + docs P1-*
GuideView (opcjonalnie copy)
```

---

## 11. Checklista wejścia Owner GO IMPLEMENT

| # | Warunek | Stan |
|---|---------|------|
| 1 | AUDIT ACCEPTED | **TAK** |
| 2 | DF P1 FROZEN | **TAK** |
| 3 | AR PASS / PASS WITH MINOR | **TAK** (ten dokument) |
| 4 | Brak blokerów | **TAK** |
| 5 | Owner GO IMPLEMENT | **WAITING** |
| 6 | Slice = **P1 only** | obowiązek |
| 7 | Allowlist · nie `git add -A` | obowiązek |
| 8 | MR-P1-* uwzględnione bez amend DF | zalecane |

---

## 12. Ryzyka residualne (nie-blokery)

| ID | Residual | Status |
|----|----------|--------|
| Auto Save × LWW | last-write wins cały dokument | Accepted (P0) |
| Klient bez P1 | nie renderuje nowych typów | Accepted |
| Arrow vs dimension UX | podobny gesture | OV / copy narzędzi |
| CAD creep | wallRefId OUT mityguje | Mitigated |

---

## 13. NEXT

```text
ARCHITECTURE REVIEW COMPLETE
  WERDYKT: PASS WITH MINOR RECOMMENDATIONS
        ↓
Czekaj na Owner GO IMPLEMENT (P1)
        ↓
IMPLEMENT P1 (+ MR-P1-01…08)
        ↓
OV → COMMIT allowlist → PUSH → PV → CLOSE

IMPLEMENT: NIE
COMMIT: NIE
PUSH: NIE
```

**STOP.**
