# ZI Tauron 2026 — Handoff implementacji

> **Status:** **PRODUCTION STABLE** — zastępuje legacy LiveCycle ZI (CLOSED)  
> **Data:** 2026-06-15 · **Prod:** **2.59.24** · commit `65051a3`  
> **Walidacja prod:** [`audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md`](../audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md)

---

## Canonical template (KV prod)

| Pole | Wartość |
|------|---------|
| **UUID** | `2b22da48-46dc-42a0-8236-d42b5b5562dc` |
| **Plik** | `ZI.pdf` (Tauron 2026 · FormMaker) |
| **Legacy UUID (tombstone)** | `26f02c78-871c-4d65-aeac-d0ca06bf060c` |

---

## Formularz

| Pole | Wartość |
|------|---------|
| **FORM** | TAURON ZI 2026 |
| **Źródło oficjalne** | `https://www.tauron-dystrybucja.pl/-/media/offer-documents/dystrybucja/przylaczenie/druki-przylaczeniowe/zi.ashx` |
| **Bundled SSOT (decrypted)** | `public/wm-print/zi-tauron-2026-template.pdf` |
| **Typ** | AcroForm + FormMaker · **brak XFA** · **brak LiveCycle** |
| **Szyfrowanie blank** | R6 AESv3, puste hasło użytkownika — pdf-lib wymaga wersji odszyfrowanej |

---

## Mapping §4 (OKREŚLENIE OBIEKTU — strona 2, dolny wiersz)

| Zmienna WGDOM | Pole PDF | Etykieta wizualna | Uwagi |
|---------------|----------|-------------------|-------|
| **JOB_STREET** | `Pole tekstowe 99` | Ulica | rect y≈584.7, x≈24.5 |
| **JOB_BUILDING** | `Pole tekstowe 111` | Numer budynku | rect y≈584.9, x≈388.7 · max 2 znaki |
| **JOB_APARTMENT** | `Pole tekstowe 112` | Numer lokalu | rect y≈584.9, x≈486.7 |

**Korekta 2026-06-15:** ~~102~~ (Kod pocztowy) i ~~111 jako lokal~~ — patrz [`audit/tauron-audit-2026-06-15/ZI-2026-MAPPING-CORRECTION-REPORT.md`](../audit/tauron-audit-2026-06-15/ZI-2026-MAPPING-CORRECTION-REPORT.md).

**OPEN:** górny wiersz §4 (pola 95/96/97 @ y≈728) — pusty w smoke; ewentualny dual-fill po manual gate.

---

## Generator prod

| Element | Plik |
|---------|------|
| **Nowa ścieżka** | `src/lib/wm-print/generate-pdf-zi-tauron2026.ts` → `generatePdfZiTauron2026()` |
| **Routing** | `generate-zip.ts` → `generateFromTemplateBytes()` gdy `t.name === "ZI"` |
| **Legacy (CLOSED)** | `generate-pdf.ts` → `generatePdfFormFromTemplate`, `finalizeZiHybridForm` — nie używać dla ZI |

---

## Decyzja biblioteki (ETAP 5)

| Opcja | Werdykt |
|-------|---------|
| **pikepdf (Python)** | PoC PASS, ale brak Pythona w Vercel/Supabase Edge |
| **qpdf + pdf-lib** | PoC PASS — qpdf decrypt offline → bundled template + pdf-lib fill **w przeglądarce** |
| **PDFBox (Java)** | Nie wdrożono — wymaga JRE |

**Wybrano:** **pdf-lib** + **pdf.js graft** (preservation gate, 2.59.22):

1. Source = aktywny `ZI.pdf` z WM Druk (storage).
2. pdf-lib `< 50` pól (R6 encrypted) → pdf.js odczyt wszystkich `/V` ze source.
3. pdf-lib zapis na odszyfrowanej bazie (upload decrypted **lub** bundled FormMaker — ten sam układ 59 pól).
4. Patch wyłącznie **99 / 111 / 112** z `JOB_*`.

Patrz: [`audit/tauron-audit-2026-06-15/ZI-2026-PRESERVATION-GATE-REPORT.md`](../audit/tauron-audit-2026-06-15/ZI-2026-PRESERVATION-GATE-REPORT.md).

---

## Stary ZI LiveCycle

**CLOSED** — archiwum: [`audit/archive/legacy-zi-livecycle-2021/`](../audit/archive/legacy-zi-livecycle-2021/)  
RCA SSOT: [`audit/ZI-FINAL-HANDOFF.md`](../audit/ZI-FINAL-HANDOFF.md)

**Nie wracać do:** XFA · ciphertext · AP · flatten · overlay · TextField2[*] · widgety 429/428/427

---

## Test smoke

```bash
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
npx vite-node scripts/test-wm-print-zi-2026-preservation-smoke.mjs
npx vite-node scripts/test-wm-print-zi-2026-tombstone-smoke.mjs
```

Mapping: **Sępa Szarzyńskiego / 83 / 7** → **99 / 111 / 112**.  
Preservation: wypełniony `ZI.pdf` (Dawid / Thai Thanh / Stróża …) + nowy §4.

Gate prod (manual): Edge · Chrome · Adobe — dane użytkownika + adres §4 **widoczne**.

---

## Powiązane

- [`docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md)
- [`audit/tauron-audit-2026-06-15/ZI-2026-LIBRARY-AUDIT-REPORT.md`](../audit/tauron-audit-2026-06-15/ZI-2026-LIBRARY-AUDIT-REPORT.md)
- [`docs/ZI-2026-IMPACT-REPORT.md`](ZI-2026-IMPACT-REPORT.md)
