# RELEASE REPORT — ZI Tauron 2026 (v2.59.22)

**Data:** 2026-06-15  
**Workflow:** B functional UI (build + smoke) → commit → push → VERIFY DEPLOY FAST

---

## Werdykt

| Status | Wynik |
|--------|-------|
| **RELEASE GO** | **TAK** |
| **PRODUCTION VERIFIED** | **TAK** — `version.json` = **2.59.22** |
| **DEPLOY PROPAGATING** | NIE |

---

## Commit

| Pole | Wartość |
|------|---------|
| **Hash** | `9434787` |
| **Branch** | `main` |
| **Message** | `feat(wm-print): ZI Tauron 2026 with preservation gate (v2.59.22)` |
| **Push** | `3539300..9434787` → `origin/main` |

---

## Wersja

**2.59.22** — Odbiory WM Druk · ZI Tauron 2026 (GO)

---

## Zakres release

### Formularz

**TAURON ZI 2026** (FormMaker AcroForm) — zastępuje LiveCycle 2021 (**CLOSED**)

### Mapping §4 (końcowy)

| Zmienna | Pole PDF |
|---------|----------|
| JOB_STREET | Pole tekstowe 99 |
| JOB_BUILDING | Pole tekstowe 111 |
| JOB_APARTMENT | Pole tekstowe 112 |

### Preservation

- Źródło: aktywny `ZI.pdf` z WM Druk (Szablony)
- pdf.js graft ze szyfrowanego R6 + pdf-lib patch §4
- Dane użytkownika zachowane; nadpisywany tylko adres obiektu

---

## Pliki release (23 w commicie)

| Kategoria | Pliki |
|-----------|-------|
| **Generator** | `generate-pdf-zi-tauron2026.ts`, `zi-tauron2026-form-extract.ts`, `generate-zip.ts`, `default-templates.ts`, `generate-pdf.ts` |
| **Template** | `public/wm-print/zi-tauron-2026-template.pdf` |
| **Smoke** | `test-wm-print-zi-2026-smoke.mjs`, `test-wm-print-zi-2026-preservation-smoke.mjs` |
| **Docs** | `ZI-2026-HANDOFF.md`, `ZI-2026-IMPACT-REPORT.md`, `SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`, `PROJECT-HANDOFF-CURRENT.md`, `ARCHITECTURE.md`, `CURRENT-TASK.md` |
| **UI** | `changelog-data.ts`, `GuideView.tsx`, `CHANGELOG.md` |
| **Audit** | `ZI-2026-*-REPORT.md` (4 raporty), `legacy-zi-livecycle-2021/README.md` |

---

## Testy pre-release

| Test | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `test-wm-print-zi-2026-smoke.mjs` | **PASS** (mapping §4 Sępa 83/7) |
| `test-wm-print-zi-2026-preservation-smoke.mjs` | **PASS** (Dawid / Thai Thanh / Stróża + §4) |
| **Manual gate** | **PASS** (Edge — dane użytkownika + §4 widoczne) |

---

## VERIFY DEPLOY FAST

```text
GET https://www.wgdom.fun/version.json
→ { "version": "2.59.22" }
```

**PRODUCTION VERIFIED:** TAK

---

## CLOSED — ZI LiveCycle 2021

Nie wracać do: XFA · LiveCycle · ciphertext · AP RE · flatten · overlay · widgety 429/428/427 · TextField2[10/9/8]

**SSOT prod:** [`docs/ZI-2026-HANDOFF.md`](ZI-2026-HANDOFF.md)

---

## Następne kroki (opcjonalnie)

- Regresja WM Druk smoke prod (wejście modułu, ZIP multi-doc)
- Backlog: dual-fill górny wiersz §4 (pola 95/96/97) — tylko na polecenie
