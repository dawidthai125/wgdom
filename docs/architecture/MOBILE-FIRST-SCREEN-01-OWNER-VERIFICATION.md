# MOBILE-FIRST-SCREEN-01 — Owner Verification

> **STATUS:** **RELEASE IN PROGRESS** · Owner GO RELEASE **TAK** · Emulation **PASS** · Field Safari: Owner GO release (emulacja + GO)  
> **FINAL field scorecard:** [`MOBILE-FIRST-SCREEN-01-FINAL-OWNER-VERIFICATION.md`](MOBILE-FIRST-SCREEN-01-FINAL-OWNER-VERIFICATION.md)  
> **Release:** [`MOBILE-FIRST-SCREEN-01-RELEASE-REPORT.md`](MOBILE-FIRST-SCREEN-01-RELEASE-REPORT.md)  
> **Data:** 2026-07-25  
> **DF:** [`MOBILE-FIRST-SCREEN-01-DESIGN-FREEZE.md`](MOBILE-FIRST-SCREEN-01-DESIGN-FREEZE.md)  
> **Commit / push:** w toku (Owner GO RELEASE)

---

## 1. Diff summary

| Zmiana | Opis |
|--------|------|
| Operator Bar mobile | Wariant **A**: `flex-nowrap` + `overflow-x-auto`; bez `flex-1` / wrap; `data-mfs01-operator-layout="horizontal-scroll"` |
| Spacer OpBar | `4.75rem` → `3.25rem` + safe-area; slot PB `max(0.5rem, env(safe-area-inset-bottom))` |
| Process Strip | Collapsed chip `Proces · {etap}` na `max-lg`; expand inline; desktop `lg+` bez zmian |
| Shortcuts | `hidden lg:flex` |
| Primary CTA | Compact: 1px border mobile, nowrap, description/section/disabled-reason ukryte `max-lg`; busy **„Przetwarzam…”** |
| Scroll root | + klasa `.mobile-view-scroll` (SSOT momentum) |

**Bez zmian:** Upload/Analiza/Eksport handlers, scoring, pipeline, Payroll, Cloud Sync, MUX.

---

## 2. Pliki zmienione (`src/**`)

1. `src/app/TenderWorkflowOperatorActionBar.tsx`  
2. `src/app/TenderWorkflowPrimaryAction.tsx`  
3. `src/app/TenderDetailPage.tsx`  

Docs: DF status + ten OV. Artefakty: `.tmp/mfs01-verify/*` (nie do commit).

---

## 3. Build

| | |
|--|--|
| `npm run build` | **PASS** |

---

## 4. Screenshots

| | Path |
|--|------|
| **BEFORE** @390 | `.tmp/mfs01-verify/before-390-przetarg.png` (z smoke pre-MFS) |
| **AFTER** @390 | `.tmp/mfs01-verify/after-390-przetarg.png` |
| AFTER process expand | `.tmp/mfs01-verify/after-390-process-expanded.png` |
| AFTER desktop | `.tmp/mfs01-verify/after-1280-przetarg.png` |
| AFTER tablet | `.tmp/mfs01-verify/after-768-przetarg.png` |

---

## 5. Chrome Budget @390×844 (Chromium measure)

Źródło: `.tmp/mfs01-verify/measure-390.json`

| | BEFORE (DF model) | AFTER (zmierzony) |
|--|------------------:|------------------:|
| Topbar | ~103 | **69** (emul. bez notch) |
| Command Layer | ~288 | **213** |
| Operator | ~126 (2 rzędy) | **61** (1 rząd) |
| Nav | ~86 | **53** |
| **Chrome Σ** | ~603 | **396** |
| **Content px** | ~241 | **448** |
| **Content %** | ~29% | **53.1%** |
| CTA H | ~84 | **54** |
| Op rows | 2+ | **1** |

**AC content ≥38% @390:** **PASS** (53.1%).  
**AC Command ≤200±16:** 213 — **CONDITIONAL** (blisko; w limicie testu ≤240; field Safari z notch może być wyżej o safe-top w Topbar, nie w Command).

---

## 6. Emulation checklist

| AC | Wynik |
|----|--------|
| AC-1 Treść above the fold | **PASS** (emulacja) |
| AC-3 Operator 1 rząd | **PASS** |
| AC-4 CTA bez description / busy krótki | **PASS** |
| AC-5 Process collapsed + expand | **PASS** |
| AC-6 Akcje 1 tap (Upload/Analiza/Eksport w toolbar) | **PASS** (obecne w DOM, 1 rząd scroll) |
| AC-8 Desktop bez regresji | **PASS** (shortcuts + desktop OpBar + strip) |
| Tablet 768 = mobile rules | **PASS** |
| AC-7 / AC-9 Field Safari | **PENDING OWNER** |

Playwright: **3/3 PASS** (`.tmp/mfs01-playwright.config.ts`).

---

## 7. Owner field checklist (iPhone Safari)

- [ ] Otwórz wybrany przetarg @ produkcja po deploy  
- [ ] Bez scroll: widać początek treści hub  
- [ ] Operator = jeden rząd; Upload/Analiza/Eksport dostępne (scroll poziomy OK)  
- [ ] `Proces · …` collapsed; expand pokazuje etapy  
- [ ] CTA bez długiego opisu; busy = „Przetwarzam…” gdy busy  
- [ ] Home indicator / safe-area OK  
- [ ] Odpowiedź: **PASS iPhone** / **FAIL iPhone**

---

## 8. Boundary Check (po IMPLEMENT)

| | |
|--|--|
| Payroll / Cloud Sync / scoring | **NIE ruszane** |
| Upload / Analiza logika | **NIE ruszane** |
| Commit/push | **NIE** (czekamy na Owner) |

---

**Koniec OV MOBILE-FIRST-SCREEN-01.** Oczekiwanie: field Safari → commit/push na polecenie.
