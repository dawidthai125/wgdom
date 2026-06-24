# ZI Tauron 2026 — Handoff implementacji

> **Status:** **PRODUCTION STABLE** — zastępuje legacy LiveCycle ZI (CLOSED)  
> **Data:** 2026-06-24 (aktualizacja mapping §4) · **Prod:** **2.62.47+** · mapping §4 **95–97** · TP203 parser  
> **Master handoff:** [`MASTER-HANDOFF-POST-ZI-2026.md`](MASTER-HANDOFF-POST-ZI-2026.md)  
> **Sesja WM/ZI:** [`SESSION-HANDOFF-WM-ZI-TP203-P4-2026-06-24.md`](SESSION-HANDOFF-WM-ZI-TP203-P4-2026-06-24.md)

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

## Mapping §4 (OKREŚLENIE OBIEKTU — strona 2, **górny wiersz** y≈728)

| Zmienna WGDOM | Pole PDF | Etykieta wizualna | Uwagi |
|---------------|----------|-------------------|-------|
| **JOB_STREET** | `Pole tekstowe 95` | Ulica (górny wiersz) | rect y≈728 · **SSOT od 2.62.46** |
| **JOB_BUILDING** | `Pole tekstowe 96` | Numer budynku | max 2 znaki (`formatBuildingForZi2026`) |
| **JOB_APARTMENT** | `Pole tekstowe 97` | Numer lokalu | |

**Parser adresu (TP203, 2.62.47):** `parseJobAddressParts` w `address-vars.ts` — np. `Kleczkowska 26 m.3` → 95/96/97.

### §5 zgłaszający — **nie nadpisywać** (preservation)

| Pola | Rola | Przykład ze szablonu WM |
|------|------|-------------------------|
| 39, 40 | Imię, nazwisko | Dawid / Thai Thanh |
| 99, 111, 112 | Ulica, budynek, lokal zgłaszającego | Szkolna / 5 / (puste) |
| 101, 102, 110 | Miasto, kod | Stróża / 55-081 |

**Historycznie (audyt 2026-06-15):** dolny wiersz 99/111/112 był kandydatem na JOB_* — **odrzucone** po hotfixie §5 (2.62.45→2.62.46). Patrz [`SESSION-HANDOFF-WM-ZI-TP203-P4-2026-06-24.md`](SESSION-HANDOFF-WM-ZI-TP203-P4-2026-06-24.md).

~~Mapping dolny wiersz 99/111/112 jako JOB_* — **SUPERSEDED**~~

---

## Generator prod

| Element | Plik |
|---------|------|
| **Nowa ścieżka** | `src/lib/wm-print/generate-pdf-zi-tauron2026.ts` → `generatePdfZiTauron2026()` |
| **Routing** | `generate-zip.ts` → `generateFromTemplateBytes()` gdy `t.name === "ZI"` |
| **Legacy (CLOSED)** | `generate-pdf.ts` → `generatePdfFormFromTemplate`, overlay, flatten — **nie używać dla ZI** |
| **Housekeeping P0.5B** | `wm-print-pdf-fonts.ts` · `wm-print-pdf-static.ts` — aktywne helpery prod wydzielone z legacy pliku |

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
4. Patch wyłącznie **95 / 96 / 97** z `JOB_*` (§4 obiekt, górny wiersz).

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

Mapping: **Sępa Szarzyńskiego / 83 / 7** → **95 / 96 / 97** (górny wiersz §4).  
Preservation: wypełniony `ZI.pdf` (Dawid / Thai Thanh / Stróża …) + nowy §4.

Gate prod (manual): Edge · Chrome · Adobe — dane użytkownika + adres §4 **widoczne**.

---

## Powiązane

- [`docs/MASTER-HANDOFF-POST-ZI-2026.md`](MASTER-HANDOFF-POST-ZI-2026.md)
- [`docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md)
- [`audit/P0.5B-HOUSEKEEPING-REPORT.md`](../audit/P0.5B-HOUSEKEEPING-REPORT.md)
- [`audit/tauron-audit-2026-06-15/ZI-2026-LIBRARY-AUDIT-REPORT.md`](../audit/tauron-audit-2026-06-15/ZI-2026-LIBRARY-AUDIT-REPORT.md)
- [`docs/ZI-2026-IMPACT-REPORT.md`](ZI-2026-IMPACT-REPORT.md)
