# SESSION HANDOFF — PDF WM Recovery (TP196–TP198C)

> **Status:** **CLOSED** · prod **v2.62.10** · commit **`1992340`** · **2026-06-19**  
> **Benchmark:** TP182 **86 → 123 pozycji** (+37 vs v2.62.9 baseline)

---

## 1. Cel

Odzyskać pozycje kosztorysowe z natywnych PDF przedmiaru WM (Wrocławskie Mieszkania) bez OCR — heurystyka tekstowa na `pdf-przedmiar-heuristic.ts`.

**Fixture referencyjny:** TP182 · OCDS `ocds-148610-83a559be-df3f-4e5f-8935-44ef8bc31e15` · `Nowowiejska 86a_27 - przedmiar.pdf`

---

## 2. Chronologia milestone’ów

| ID | Wersja | Skrót |
|----|--------|-------|
| **TP196 M4** | 2.62.10 | WM `m` → `mb` (metry bieżące) |
| **TP197 M5** | 2.62.10 | `kalk. własna` / kalkulacja / wycena własna bez KNR |
| **TP198A** | 2.62.10 | Bezpieczniejszy klucz dedup: `lp\|code\|unit\|qty\|description` |
| **TP198B** | 2.62.10 | `kalk. własna` po kotwicy `KNR_IN_LINE` (bez Lp./d.X.Y) |
| **TP198C** | 2.62.10 | WM aliasy j.m. → `szt`: `wyp.` `otw.` `podej.` `aparat` `lokal.` |

**Powiązane (wcześniejsze):** TP190A (2.62.9) quality guard re-analyze · TP191–TP194 platformy/perf · P0/P1 merge (2.62.1).

---

## 3. Kluczowy plik

```text
src/lib/pdf-przedmiar-heuristic.ts   — parser + heurystyka UX case 1/2/3
src/lib/tender-document-resolver.ts — integracja w dossier
src/lib/tenders-bzp-brief.ts        — athPreviewToSnapshot (truncacja rows!)
```

**Funkcje eksportowane:** `parsePdfPrzedmiarHeuristic`, `parsePdfPrzedmiarLine`, `extractPdfPrzedmiarRows`, `pdfPrzedmiarRowDedupKey`, `normalizePdfBoqUnits`, `splitPdfBoqText`.

---

## 4. Testy regresji

```bash
npx vite-node scripts/test-pdf-przedmiar-heuristic.mjs    # TP196–TP198C, 63 PASS
npx vite-node scripts/test-tp182-pdf-wm-recovery.mjs      # live TP182, >=120 rows
```

---

## 5. Pułapki (nie regresować)

| Pułapa | Opis |
|--------|------|
| Dedup zbyt agresywny | Stary klucz `code\|desc[0:40]\|qty` gubił pozycje — naprawione TP198A |
| Kalk tylko z Lp./d.X.Y | Segment `KNR … kalk. własna …` był tracony — naprawione TP198B |
| WM jednostki skrótowe | `wyp. 2 wyp. 2.00` → `no_unit` — naprawione TP198C |
| SWZ false positive | `KALK_SWZ_FALSE_POSITIVE_RE` blokuje luźny tekst SWZ |

---

## 6. Co NIE jest w scope TP196–198

- PDF skan/CAD bez warstwy tekstowej (`uxCase 3`) — wymaga OCR (osobny epic)
- PDF poza WM (Kąty, UMiG) — osobne fixture’y
- Pełna wycena PLN z PDF ilościowego — nadal tryb `catalog` bez cen ATH

---

## 7. Werdykt

**PDF WM Recovery — CLOSED.** Cel >120 pozycji na TP182 osiągnięty (**123**).

**Następny logiczny krok:** [`SESSION-HANDOFF-TP200-PLANNED.md`](SESSION-HANDOFF-TP200-PLANNED.md) — świeżość dossier + fidelity snapshotu ATH.
