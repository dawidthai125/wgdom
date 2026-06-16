# EM-P1R — Template Rebuild Report

**Data:** 2026-06-16  
**Wersja:** 2.59.43  
**Status:** **COMPLETE** · BUILD PASS · SMOKE 5/5 PASS  
**SSOT:** `Desktop\Dokumenty\Pomiary Elektryczne\` (5× DOCX)  
**Plan:** [`EM-P1R-TEMPLATIZATION-PLAN.md`](EM-P1R-TEMPLATIZATION-PLAN.md)

---

## 1. Executive Summary

EM-P1R zastąpił programowe szablony EM-P1B (`build-em-docx-templates.mjs`) pięcioma plikami `.template.docx` utworzonymi z **oryginalnych formularzy Word** (Desktop SSOT). Edycja to **chirurgiczna modyfikacja XML** (placeholdery + usunięcie wierszy przykładowych) — bez generowania layoutu od zera.

| Aspekt | Werdykt |
|--------|---------|
| Układ 1:1 vs SSOT | **PASS** — tblGrid, legendy T4, orientacja, marginesy zachowane |
| Placeholdery EM-P1.5 | **PASS** — kontrakt `em-docx-payload.ts` bez zmian |
| Silnik clone/substitute | **PASS** — bez zmian |
| Generacja TEST-RAP-001 / RAP-45-2026 | **PASS** — 10×5 dokumentów, XML valid |
| Build prod | **PASS** |

---

## 2. Rebuilt Templates

| Plik repo | Źródło Desktop | Bytes (template) | Bytes (SSOT) | Tabele | Orientacja |
|-----------|----------------|------------------|--------------|--------|------------|
| `protokol.template.docx` | PROTOKÓŁ Z POMIARTÓW OCHRONNYCH STR1.docx | 9 584 | 11 859 | 1 | portrait |
| `dane-informacyjne.template.docx` | DANE INFORMACYJNE.docx | 9 899 | 12 120 | 1 | portrait |
| `badanie-adsc.template.docx` | Badanie chrony… samoczynne wyłączenie1.docx | 11 643 | 15 288 | 4 | landscape |
| `badanie-rezystancji.template.docx` | Badanie rezystancji obwodów.docx | 11 004 | 14 483 | 3 | landscape |
| `parametry-rcd.template.docx` | parametry zabezpieczen roznicowo-pradowych.docx | 10 744 | 13 101 | 4 | landscape |

**Skrypt produkcyjny:** `scripts/templatize-em-p1r-from-ssot.mjs`  
**Retired:** `scripts/build-em-docx-templates.mjs` (tombstone — nie używać)

---

## 3. Placeholder Map

### Skalary (wszystkie pomiary T1 + protokół + dane)

| Placeholder | Dokumenty |
|-------------|-----------|
| `{{RAP_NO}}` | wszystkie 5 |
| `{{MEASUREMENT_DATE}}` | wszystkie 5 |
| `{{TECHNICIAN}}` | ADSC, Rezystancja, RCD, Dane |
| `{{TECHNICIAN_LICENSE}}` | Dane info |
| `{{ADDRESS}}` | wszystkie 5 |
| `{{METER_MODEL}}` / `{{METER_SERIAL}}` | ADSC, Rezystancja, RCD |
| `{{EXECUTOR}}` | ADSC, Rezystancja (T1 C2) — **nie RCD** |
| `{{EARTHING_SYSTEM}}` | ADSC T2 |
| `{{PROTOCOL_DATE}}` / `{{NEXT_MEASUREMENT_DATE}}` / `{{MEASUREMENT_CAUSE}}` / `{{VERDICT_TEXT}}` | Protokół |
| `{{INSPECTION_1}}`…`{{INSPECTION_7}}` | Dane info (kolumna OCENA) |

### Wiersze dynamiczne

| Dokument | Wiersze szablonu | Usunięte wiersze przykładowe |
|----------|------------------|----------------------------|
| ADSC T3 | R2 `ROW_SUPPLY_*` + R3 `ROW_*` | R4–R10 |
| Rezystancja T3 | R2 `ROW_SUPPLY_*` (16 kol.) + R3 `ROW_*` | R4–R9 |
| RCD T3 | R2 `ROW_*` (14 kol.) | — |
| Legendy ADSC T4 / RCD T4 | **statyczne, zero placeholderów** | — |

---

## 4. Visual Validation

| Test | RAP | Wynik |
|------|-----|-------|
| Generacja 5 DOCX | TEST-RAP-001 | **PASS** |
| Generacja 5 DOCX | RAP-45-2026 | **PASS** |
| `validateEmDocxBytes` | oba | **PASS** (bilans w:t/w:tr) |
| tableCount vs SSOT | 5/5 | **PASS** |
| Orientacja strony | portrait×2, landscape×3 | **PASS** |
| Brak `{{ROW_*}}` w output | 10/10 | **PASS** |

**Artefakty:** `audit/em-p1r-smoke-out/` (10 wygenerowanych DOCX)

**Weryfikacja Word (manual):** otworzyć pary ORYGINAŁ Desktop vs `audit/em-p1r-smoke-out/RAP-45-2026_*.docx` — kryterium: układ praktycznie identyczny (różnica = tylko dane RAP-45-2026).

---

## 5. Build

```
npm run build → PASS (18.35s)
```

---

## 6. Smoke

| Skrypt | Wynik |
|--------|-------|
| `scripts/test-electrical-measurements-p1.mjs` | **32/32 PASS** |
| `scripts/test-em-p1r-visual-smoke.mjs` | **60/60 PASS** |

**5/5 dokumentów** (Protokół, Dane, ADSC, Rezystancja, RCD): XML valid, poprawna liczba tabel, orientacja, brak rozjazdu placeholderów.

---

## 7. Known Limitations

1. **Protokół bez miernika** — SSOT Desktop nie zawiera `{{METER_MODEL}}` w protokole; test T01 zaktualizowany (ADDRESS zamiast METER).
2. **Templatyzacja programowa XML** — mimo edycji oryginałów Word, podmiana odbywa się skryptem (split-run merge), nie ręcznie w Word GUI; layout XML zachowany 1:1.
3. **Adres protokół vs dane** — protokół SSOT: „Wrocław ul. Sępa…” (bez przecinka); dane: „Wrocław, ul. Sępa…” — oba → `{{ADDRESS}}` (payload `jobDisplayTitle`).
4. **Visual diff Word** — automatyczny pixel-diff niedostępny w CI; wymaga manualnego otwarcia w Word (artefakty w `audit/em-p1r-smoke-out/`).

---

*EM-P1R IMPLEMENT COMPLETE · v2.59.43 · 2026-06-16*
