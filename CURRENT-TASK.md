# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-15 · **SESSION CLOSEOUT — Odbiory WM Druk P0.2A ZI-PDF-001**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (repo `main`)** | **2.59.19** · commit *(po push tej sesji)* |
| **Poprzedni feature** | WM Druk hotfix · `01211d6` (2.59.18) |
| **Stream WM Druk P0** | Template pollution **CLOSED** · **ZI-PDF-001 CLOSED** (P0.2A) |
| **RELEASE GO** | **TAK** — build + smoke P0.2A PASS |
| **PRODUCTION VERIFIED** | Sprawdź `version.json` → oczekiwane **2.59.19** |

## SKOŃCZONE — P0.2A ZI demo strip (v2.59.19)

| Etap | Status |
|------|--------|
| RCA demo ULICA/BUD/LOK @ y≈142 | **CLOSED** |
| `stripZiDemoDesignerFields` w pipeline | **CLOSED** |
| Clean szablonu ZI → storage + KV | **CLOSED** (`2155cec9-…`) |
| Smoke `test-wm-print-p0-2a-zi-demo-strip.mjs` | **14/14 PASS** |

**Szablon ZI UUID:** `26f02c78-871c-4d65-aeac-d0ca06bf060c` (bez zmiany)  
**Nowy plik PDF:** `2155cec9-6ca1-4eec-af1c-7b4d346487a3`

**★ Handoff SSOT modułu:** [`docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md)

### Testy regresji WM Druk

```bash
npx vite-node scripts/test-wm-print-p0-2a-zi-demo-strip.mjs
npx vite-node scripts/test-wm-print-p0-seed-guard.mjs
npx vite-node scripts/test-wm-print-template-cleanup.mjs
npm run build
```

## SKOŃCZONE wcześniej — P0 pollution (v2.59.15 → v2.59.18)

Seed guard · cleanup 99→15 · hotfix `normalizeWmPrintTemplates` — patrz handoff § 5.

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
