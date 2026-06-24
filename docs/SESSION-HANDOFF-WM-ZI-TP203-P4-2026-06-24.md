# SESSION HANDOFF — WM Druk · ZI §4/§5 · TP203 · P4 (2026-06-24)

> **Status:** **CLOSED** (prod **2.62.48** · `5cef155`)  
> **Hasło agenta:** „kontynuuj WGDOM”  
> **SSOT projektu:** [`PROJECT-HANDOFF-CURRENT.md`](PROJECT-HANDOFF-CURRENT.md)  
> **Mapa systemu:** [`AGENT-ONBOARDING.md`](AGENT-ONBOARDING.md) § 6

---

## 1. Co zrobiliśmy (chronologia 2026-06-24)

| Wersja | Commit | Temat | Status |
|--------|--------|-------|--------|
| **2.62.46** | `a40381c` | ZI §5 hotfix — adres obiektu **tylko** pola **95–97**; §5 zgłaszający ze szablonu WM | **CLOSED** |
| **2.62.47** | `08178cc` | **TP203 M1** — parser adresu `parseJobAddressParts` (m.3, lok., slash) | **CLOSED** · manual gate Kleczkowska PASS |
| **2.62.48** | `5cef155` | **P4** — toast upload szablonu WM (bez „Dodano 0 plików”) | **CLOSED** |

### Audyty READ ONLY (bez release kodu)

| ID | Werdykt | Skrót |
|----|---------|-------|
| P0 verify active ZI template | GO | Hash storage = fixture · pole 53 = `D/517/374/22` |
| P0 forensics §4 visible fields | NO-GO wizualny (przed TP203) | Duplikat wiersza Ulica · user czyta dolny blok (99=Szkolna) |
| Decision audit §4/§5 | Rekomendacja **A** | Nie nadpisywać 99/111/112 (§5 zgłaszający) |
| TP203 manual gate Kleczkowska | GO | 95=Kleczkowska · 96=26 · 97=3 · Edge visual PASS |

---

## 2. ZI Tauron 2026 — §4 vs §5 (KRYTYCZNE dla agentów)

FormMaker **zduplikował** wiersz „Ulica | Numer budynku | Numer lokalu” na **stronie 2** PDF.

| Wiersz (y≈) | Pola PDF | Semantyka (prod 2.62.46+) | Kto wypełnia |
|-------------|----------|---------------------------|--------------|
| **728** (górny) | **95 / 96 / 97** | Adres **obiektu** §4 | WGDOM (`JOB_*`) |
| **758** | 94, 45, 92, 93 | Miasto / gmina / kod ze szablonu | Szablon WM |
| **584** (dolny) | **99 / 111 / 112** | Adres **zgłaszającego** §5 | Preservation graft |

**Decyzja (2.62.46):** Nie mapować `JOB_*` na 99/111/112 — nadpisuje §5 (regresja 2.62.45).

**Kod SSOT:** `generate-pdf-zi-tauron2026.ts` → pola **95, 96, 97**.

**Test preservation:** `test-wm-print-zi-2026-preservation-smoke.mjs`.

---

## 3. TP203 — Address Parser M1

**Plik:** `src/lib/wm-print/address-vars.ts` → `parseJobAddressParts`

**Przykład:** `"Kleczkowska 26 m.3"` → `Kleczkowska` / `26` / `3`

**Test:** `scripts/test-wm-print-address-parser-tp203.mjs`

---

## 4. P4 — upload toast

**Pliki:** `template-upload-toast.ts` · `WmPrintView.handleTemplateFilesPick`

Gdy storage OK a `added === 0` → komunikat bez „Dodano 0 plików…”.

**Test:** `scripts/test-wm-print-upload-toast-p4.mjs`

---

## 5. Smoke WM po zmianach

```bash
npm run build
npx vite-node scripts/test-wm-print-address-parser-tp203.mjs
npx vite-node scripts/test-wm-print-upload-toast-p4.mjs
npx vite-node scripts/test-wm-print-zi-2026-preservation-smoke.mjs
```
