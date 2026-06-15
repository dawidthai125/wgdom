# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-15 · **POST-RELEASE CLOSEOUT — WM Druk P0 COMPLETE**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (repo `main`)** | **2.59.19** · commit **`1a8c892`** |
| **Stream WM Druk P0** | **COMPLETE** |
| **ZI-PDF-001** | **CLOSED** (v2.59.19 · `1a8c892`) |
| **RELEASE GO** | **TAK** |
| **PRODUCTION VERIFIED** | `version.json` = **2.59.19** |

## WM Druk P0 — COMPLETE

| Etap | Status |
|------|--------|
| Template Pollution | **CLOSED** (2.59.15–2.59.17) |
| KV Cleanup | **CLOSED** (99→15, 2.59.17) |
| Runtime Hotfix | **CLOSED** (`normalizeWmPrintTemplates`, 2.59.18) |
| **ZI-PDF-001** | **CLOSED** (P0.2A demo strip, 2.59.19) |

**Szablon ZI UUID:** `26f02c78-871c-4d65-aeac-d0ca06bf060c`  
**Plik PDF (prod):** `2155cec9-6ca1-4eec-af1c-7b4d346487a3`

**★ Handoff SSOT modułu:** [`docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md)

### Testy regresji WM Druk

```bash
npx vite-node scripts/test-wm-print-p0-2a-zi-demo-strip.mjs
npx vite-node scripts/test-wm-print-p0-seed-guard.mjs
npx vite-node scripts/test-wm-print-template-cleanup.mjs
npm run build
```

## NASTĘPNE — tylko na polecenie

| Priorytet | Temat |
|-----------|-------|
| P1 | Regresja smoke prod WM Druk (ZIP end-to-end w Edge) |
| P3 Export | PDF · DOCX · Email notatki operacyjne |
| Przetargi backlog | P2-G.3D/E · P2-F.6 · P2-H.7 |

## WZNOWIENIE (checklist agenta)

```text
1. AGENTS.md → PROJECT-HANDOFF-CURRENT.md
2. docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md
3. CURRENT-TASK.md → docs/ARCHITECTURE.md § 12.1.8
4. curl -s https://www.wgdom.fun/version.json  → baseline 2.59.19+
```
