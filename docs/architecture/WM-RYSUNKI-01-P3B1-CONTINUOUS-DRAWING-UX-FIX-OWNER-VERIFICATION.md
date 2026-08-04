# WM-RYSUNKI-01 P3B.1 — OWNER VERIFICATION (CONTINUOUS DRAWING UX FIX)

> **ID:** WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-OWNER-VERIFICATION  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3B.1 — CONTINUOUS DRAWING UX FIX**  
> **FAZA:** **OWNER VERIFICATION** → **PASS**  
> **STATUS:** **OWNER VERIFICATION PASS**  
> **Wersja changelog:** **2.66.03**  
> **Data OV:** 2026-08-04  
> **Wejście:** Owner **GO OWNER VERIFICATION**  
> **IMPLEMENT:** COMPLETE · build PASS · re-run OV testów PASS  
> **AUDIT:** [`WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-AUDIT.md`](./WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-AUDIT.md) (**ACCEPTED**)  
> **DF:** [`WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-DESIGN-FREEZE.md) (**FROZEN**)  
> **AR:** [`WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **MODE:** VERIFICATION ARCHIVE · **NO COMMIT** · **NO PUSH** (czekaj Owner GO COMMIT)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3B.1 — OWNER VERIFICATION

STATUS: OWNER VERIFICATION PASS

FLOW:
  klik → Ghost → klik → ściana → STOP
  Ghost NIE auto · tool wall ON · nowy 1. klik

1 Flow STOP po wall .............. PASS
2 Brak auto-Ghost ................ PASS
3 Nowa ściana = nowy 1. klik ..... PASS
4 Tool Wall sticky ............... PASS
5 Ghost/Length/Grid OFF po SUCCESS PASS
6 Regresja P0–P3B ................ PASS
7 AUDIT/DF/AR/MR/AC .............. PASS

P3B.1 14 · P3B 24 · P3A 40 · P3 32 · P2 28 · P1B 32 · P1 44 · P0 33
changelog 2.66.03 · schemaVersion 1 · library 3 · render 3

COMMIT: NIE
PUSH: NIE
NEXT: OWNER GO COMMIT
════════════════════════════════════════════════════════
```

---

## 0. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy flow Owner 1–5 przechodzi? | **TAK** |
| Czy regresja P0–P3B PASS? | **TAK** (re-run OV 2026-08-04) |
| Czy AUDIT + DF + AR + MR + AC spełnione? | **TAK** |
| Blokery przed COMMIT? | **NIE** |
| JSON / PDF / ZIP / Cloud / Undo / AppSettings / P4? | **OUT** |
| **STATUS** | **OWNER VERIFICATION PASS** |

---

## 1. Metoda weryfikacji

| Warstwa | Zakres |
|---------|--------|
| Automatyczna (re-run OV) | `test-wm-rysunki-01-p3b1.mjs` (**14**) · P3B **24** · P3A **40** · P3 **32** · P2 **28** · P1B **32** · P1 **44** · P0 **33** |
| Build (IMPLEMENT) | `npm run build` **PASS** |
| Statyczna (kod) | `finishLine` · `clearWallPreview` · `svgMarkup` derive · ESC · hint · Guide |
| Kontrakt | DF D-P3B1-01…08 · AC-P3B1-01…08 · AR MR-P3B1-01…05 · D-P3B-05/AC-P3B-06 SUPERSEDED |

---

## 2. Flow Owner (punkty 1–5)

### 1. klik → Ghost → klik → ściana → STOP

| Krok | Dowód | Wynik |
|------|-------|--------|
| 1. klik | `onPointerDown` wall · `!lineStart` → `setLineStart(p)` | **PASS** |
| Ghost | `svgMarkup`: `tool===wall && lineStart && previewEnd` → `previewWall` | **PASS** |
| 2. klik | `finishLine("wall", …)` → commit wall | **PASS** |
| STOP | po SUCCESS **`clearWallPreview()`** — brak `setLineStart(end)` | **PASS** T04 · T05 |

```text
P3B (stare):  2. klik → setLineStart(end) → auto-Ghost
P3B.1:        2. klik → clearWallPreview() → STOP / idle
```

### 2. Ghost nie pojawia się automatycznie

| | |
|--|--|
| **Kod** | Po clear: `lineStart=null` · `previewEnd=null` → `previewWall=null` |
| **Move bez 1. klik** | warunek Ghost nie spełniony |
| **Test** | T11 idle SVG bez `data-ghost-wall` · T04 brak chain |
| **Wynik** | **PASS** |

### 3. Nowa ściana dopiero po NOWYM pierwszym kliknięciu

| | |
|--|--|
| **Kod** | kolejny wall wymaga ponownie `!lineStart` → `setLineStart` |
| **Guide** | „kolejna ściana od nowego pierwszego kliknięcia” |
| **AC** | AC-P3B1-04 |
| **Wynik** | **PASS** |

### 4. Tool Wall pozostaje aktywny

| | |
|--|--|
| **Kod** | `finishLine` **nie** wywołuje `setTool` · `setTool` tylko w toolbar (zmiana tool + clear) |
| **Test** | T06 |
| **MR** | MR-P3B1-02 |
| **Wynik** | **PASS** |

### 5. Ghost · Live Length · Grid Count znikają po wall SUCCESS

| Element | Mechanizm | Wynik |
|---------|-----------|--------|
| Ghost | brak `previewWall` option | **PASS** |
| Live Length | `lengthLabel` tylko w `previewWall` | **PASS** |
| Grid Count | część `wallPreviewMetrics(…).lengthLabel` przy Ghost | **PASS** |
| `setSelectedId(obj.id)` | zostaje (MR-P3B1-04) | **PASS** T07 |

---

## 3. Regresja (punkt 6) — re-run OV

| Suite | Wynik |
|-------|--------|
| **P3B.1** | **14 PASS** · 0 FAIL |
| **P3B** | **24 PASS** · 0 FAIL |
| **P3A** | **40 PASS** · 0 FAIL |
| **P3** | **32 PASS** · 0 FAIL |
| **P2** | **28 PASS** · 0 FAIL |
| **P1B** | **32 PASS** · 0 FAIL |
| **P1** | **44 PASS** · 0 FAIL |
| **P0** | **33 PASS** · 0 FAIL |

**Regresja:** **PASS**

---

## 4. Zgodność dokumentów (punkt 7)

| Dokument | Status | OV |
|----------|--------|-----|
| AUDIT | ACCEPTED | **PASS** — RCA `setLineStart(end)` naprawione |
| DESIGN FREEZE | FROZEN · Owner #1–8 | **PASS** — STOP · clear · tool sticky · nowy 1. klik |
| ARCHITECTURE REVIEW | PASS WITH MR | **PASS** — UI-only · OUT warstwy |
| MR-P3B1-01…05 | | **DONE** (patrz §5) |
| AC-P3B1-01…08 | | **PASS** (patrz §6) |
| D-P3B-05 / AC-P3B-06 | SUPERSEDED | **PASS** — chain OFF |

---

## 5. MR-P3B1 — mapa DONE

| ID | Rekomendacja | Wynik |
|----|--------------|--------|
| **MR-P3B1-01** | wyłącznie `clearWallPreview()` po SUCCESS | **DONE** |
| **MR-P3B1-02** | bez `setTool` po wall | **DONE** |
| **MR-P3B1-03** | Guide + hint w tym samym zakresie | **DONE** T08–T09 |
| **MR-P3B1-04** | `setSelectedId` bez zmian | **DONE** T07 |
| **MR-P3B1-05** | opcjonalny test P3B.1 | **DONE** (14 asercji) |

---

## 6. AC-P3B1 (FROZEN) — mapa

| ID | Kryterium | Wynik |
|----|-----------|--------|
| **AC-P3B1-01** | Po wall OK: wall w objects · `lineStart===null` · brak previewWall | **PASS** |
| **AC-P3B1-02** | tool nadal wall | **PASS** |
| **AC-P3B1-03** | move bez 1. klik → brak Ghost/Length/Grid | **PASS** |
| **AC-P3B1-04** | nowy 1. klik → Ghost jak P3B | **PASS** (T12 + kod) |
| **AC-P3B1-05** | ESC mid-Ghost → clear · tool wall | **PASS** |
| **AC-P3B1-06** | L&lt;1 reject · lineStart zostaje | **PASS** (early return) |
| **AC-P3B1-07** | schema 1 · PDF/ZIP/Cloud/Undo/AppSettings OUT | **PASS** |
| **AC-P3B1-08** | regresja + Guide/hint | **PASS** |

---

## 7. OUT (negatyw)

| Warstwa | Dowód | Wynik |
|---------|-------|--------|
| JSON / schemaVersion | T01 · T14 · P3B T21–23 | **PASS** |
| PDF / ZIP | brak diff export · P3B T15 | **PASS** |
| Cloud / AppSettings | poza allowlist | **PASS** |
| Undo API | `clearWallPreview` ≠ stack push | **PASS** |
| P4 | poza zakresem | **PASS** |

---

## 8. Allowlist COMMIT (po Owner GO COMMIT)

| Plik | Rola |
|------|------|
| `src/app/WmPrintDrawingEditor.tsx` | clear po SUCCESS · hint |
| `src/app/GuideView.tsx` | copy |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | **2.66.03** |
| `scripts/test-wm-rysunki-01-p3b1.mjs` | NEW |
| `docs/architecture/WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-AUDIT.md` | AUDIT |
| `docs/architecture/WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-DESIGN-FREEZE.md` | DF |
| `docs/architecture/WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-ARCHITECTURE-REVIEW.md` | AR |
| `docs/architecture/WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-OWNER-VERIFICATION.md` | OV |

**Nie commitować:** obce WIP (`CloudLoader`, `PayrollView`, `.tmp*`, `bid-time-load-guard`, …).

---

## 9. Wersja / git

| Pole | Wartość |
|------|---------|
| Changelog tip (local) | **2.66.03** |
| Prod tip (przed release) | **2.66.02** / `abe57f9a` |
| Commit P3B.1 | **PENDING** — czekaj **OWNER GO COMMIT** |
| Push | **NIE** |

---

## 10. NEXT

```text
STATUS: OWNER VERIFICATION PASS

NEXT: OWNER GO COMMIT
  → allowlist §8 only
  → bez push (osobny GO RELEASE / PUSH)

P4 / JSON / PDF / ZIP / Cloud: NIE
```

---

*OV zakończona · PASS · bez commit/push · 2026-08-04.*
