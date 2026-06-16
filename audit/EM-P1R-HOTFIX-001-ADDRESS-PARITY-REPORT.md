# EM-P1R-HOTFIX-001 — ADDRESS Parity Report

**Data:** 2026-06-16  
**Wersja:** 2.59.44  
**Status:** **COMPLETE**

---

## 1. Objaw

| Dokument | Przed fix | Po fix |
|----------|-----------|--------|
| Protokół | Kleczkowska 26 m.3 ✓ | Kleczkowska 26 m.3 ✓ |
| Dane informacyjne | Sępa Sarzyńskiego 83/7 ✗ | Kleczkowska 26 m.3 ✓ |
| ADSC | Sępa Sarzyńskiego 83/7 ✗ | Kleczkowska 26 m.3 ✓ |
| Rezystancja | Sępa Sarzyńskiego 83/7 ✗ | Kleczkowska 26 m.3 ✓ |
| RCD | Sępa Sarzyńskiego 83/7 ✗ | Kleczkowska 26 m.3 ✓ |

---

## 2. Root Cause

**Payload OK** — `buildElectricalMeasurementDocxPayload()` ustawia jedno pole:

```typescript
ADDRESS: jobDisplayTitle(job)
```

Brak `SITE_ADDRESS` / `JOB_ADDRESS` — nie dotyczy.

**Szablony wadliwe** — w 4 plikach (ADSC, Rezystancja, RCD, Dane) pozostał **hardcoded** tekst SSOT:

`Miejsce pomiaru: Wrocław, ul. Sępa Sarzyńskiego 83/7`

Przyczyny nieudanej templatyzacji EM-P1R:

1. **Literówka w skrypcie:** `Szarzyńskiego` zamiast `Sarzyńskiego` (SSOT Desktop)
2. **Split-run Word:** adres rozbity na dwa `<w:t>` — literal replace nie trafił

Protokół działał, bo używa innego formatu (`{{ADDRESS}}` bez prefiksu „Miejsce pomiaru”).

---

## 3. Fix

`scripts/templatize-em-p1r-from-ssot.mjs`:

- Poprawiona pisownia `Sarzyńskiego`
- Nowa funkcja `applyMiejscePomiaruPlaceholder()` — merge split-run + wymuszenie `Miejsce pomiaru: {{ADDRESS}}`
- Regeneracja 4 szablonów (+ protokół bez zmian treści)

**Bez zmian:** `em-docx-payload.ts`, silnik generacji, measurement value engine.

---

## 4. Weryfikacja placeholderów (po fix)

| Szablon | `{{ADDRESS}}` count | Hardcoded Sępa |
|---------|---------------------|----------------|
| protokol.template.docx | 1 | brak |
| dane-informacyjne.template.docx | 1 | brak |
| badanie-adsc.template.docx | 1 | brak |
| badanie-rezystancji.template.docx | 1 | brak |
| parametry-rcd.template.docx | 1 | brak |

---

## 5. Smoke

| Test | Wynik |
|------|-------|
| `test-em-p1r-hotfix-001-address-parity.mjs` | **23/23 PASS** |
| `test-electrical-measurements-p1.mjs` | **32/32 PASS** |
| `npm run build` | **PASS** |

Job testowy: `{ address: "Kleczkowska 26 m.3" }` · RAP: `TEST-RAP-KLECZ`  
Artefakty: `audit/em-p1r-hotfix-001-out/`

---

## 6. Werdykt

**PASS** — adres roboty identyczny we wszystkich 5 dokumentach.

---

*EM-P1R-HOTFIX-001 · v2.59.44 · 2026-06-16*
