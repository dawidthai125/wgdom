# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-15 · **SESSION CLOSEOUT — Odbiory WM Druk P0**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (repo `main`)** | **2.59.18** · commit **`01211d6`** |
| **Poprzedni feature** | WM Druk cleanup EXECUTED · `16ee8f8` |
| **Stream WM Druk P0** | Template pollution **CLOSED** · ZI PDF **OPEN** |
| **RELEASE GO** | **TAK** — hotfix 2.59.18 pushed |
| **PRODUCTION VERIFIED** | Sprawdź `version.json` — może być DEPLOY PROPAGATING |

## SKOŃCZONE — Odbiory WM Druk P0 (v2.59.15 → v2.59.18)

| Etap | Wersja | Status |
|------|--------|--------|
| Seed guard (anti-pollution) | 2.59.15 | **CLOSED** |
| Cleanup script + dry-run | 2.59.16 | **CLOSED** |
| Prod KV cleanup 99→15 | 2.59.17 | **CLOSED** |
| Hotfix `parseWmPrintTemplates` runtime | 2.59.18 | **CLOSED** |

**★ Handoff SSOT modułu:** [`docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md)

### Testy regresji WM Druk

```bash
npx vite-node scripts/test-wm-print-p0-seed-guard.mjs
npx vite-node scripts/test-wm-print-template-cleanup.mjs
npm run build
```

## OTWARTE — P0 bloker

| ID | Temat | Status |
|----|-------|--------|
| **ZI-PDF-001** | PDF ZI pokazuje placeholdery `{{JOB_*}}` w Edge/Acrobat mimo poprawnych `/V` w audycie | **OPEN** |

Seria P0.1A–1G (2.59.9–2.59.14) — audyt PASS, UX FAIL. Następna sesja: RCA warstw AP/Im0, ten sam plik pipeline vs user download.

Artefakty: `audit/p0-1f2-proof.zip`, `scripts/audit-p0-1f*.mjs`.

## NASTĘPNE — tylko na polecenie

| Priorytet | Temat |
|-----------|-------|
| **P0** | ZI PDF placeholdery (ZI-PDF-001) |
| P3 Export | PDF · DOCX · Email notatki operacyjne |
| Przetargi backlog | P2-G.3D/E · P2-F.6 · P2-H.7 |

## POPRZEDNIE RELEASY (CLOSED)

- **Notatki operacyjne** — v2.57.0–2.58.1 · [`SESSION-HANDOFF-OPERATIONAL-NOTES.md`](docs/SESSION-HANDOFF-OPERATIONAL-NOTES.md)
- **P3 / P2-H / UX.1 / P2-F** — [`PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)

## WZNOWIENIE (checklist agenta)

```text
1. AGENTS.md → PROJECT-HANDOFF-CURRENT.md
2. docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md  ← ★★ WM Druk
3. CURRENT-TASK.md (ten plik) → docs/ARCHITECTURE.md § 12.1.8
4. curl -s https://www.wgdom.fun/version.json  → baseline 2.59.18+
5. Hasło „kontynuuj WGDOM” → .cursor/rules/wgdom-stan-projektu.mdc
```

## COMMIT / PUSH

Ostatni release: **`01211d6`** `fix: P0 hotfix WM Druk parseWmPrintTemplates runtime (2.59.18)`  
Kolejna praca: **ZI-PDF-001** — dopiero po poleceniu użytkownika.
