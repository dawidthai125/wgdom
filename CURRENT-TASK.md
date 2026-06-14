# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-14 · **SESSION CLOSEOUT — Notatki operacyjne COMPLETE (P0→P2C+HF)**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (repo `main`)** | **2.58.1** · commit **`1f8e2bd`** |
| **Poprzedni feature** | 2.58.0 P2A Inspektor UI · `7c291d9` |
| **Stream Notatki operacyjne** | **COMPLETE** (P0 · P1 · P2A · P2B · P2C · HF) |
| **RELEASE GO** | **TAK** — ostatni push v2.58.1 |
| **PRODUCTION VERIFIED** | Sprawdź `version.json` — może być DEPLOY PROPAGATING po push |

## SKOŃCZONE — Notatki operacyjne (v2.57.0 → v2.58.1)

| Faza | Wersja | Status |
|------|--------|--------|
| **P0** — moduł admin, CRUD, sync | 2.57.0 | **CLOSED** |
| **P1** — ACK, badge, banner | 2.57.2 | **CLOSED** |
| **P2B** — widget Pulpit | 2.57.4 | **CLOSED** |
| **P2C** — Audit UI Super Admin | 2.57.5 | **CLOSED** |
| **P2A** — Inspektor UI + sync | 2.58.0 | **CLOSED** |
| **HF** — backup completeness | 2.58.1 | **CLOSED** |

**★ Handoff SSOT modułu:** [`docs/SESSION-HANDOFF-OPERATIONAL-NOTES.md`](docs/SESSION-HANDOFF-OPERATIONAL-NOTES.md)

### Testy regresji (wszystkie PASS przy ostatnim release)

```bash
npx vite-node scripts/test-operational-notes-p0.mjs
npx vite-node scripts/test-operational-notes-p1.mjs
npx vite-node scripts/test-operational-notes-p2b.mjs
npx vite-node scripts/test-operational-notes-p2c.mjs
npx vite-node scripts/test-operational-notes-p2a.mjs
npx vite-node scripts/test-operational-notes-hotfix-2.58.1.mjs
npm run build
```

## NASTĘPNE — tylko na polecenie

| Priorytet | Temat | Status |
|-----------|-------|--------|
| **P3 Export** | PDF · DOCX · Email (ręczny) | **OPEN** |
| **P2A.1** | Panel notatek w detalu roboty inspektora | **OPEN** (opcjonalny) |
| **Przetargi** | P2-G.3D/E · P2-F.6 · P2-H.7 · P3.7+ | backlog — handoff P3 |
| **P2 Audit Center** | Security log Super Admin | **OPEN** |

## POPRZEDNIE RELEASY (bez zmian · CLOSED)

- **P3 Wycena · BZP · filtry** — v2.56.0–2.56.10 · [`SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md`](docs/SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md)
- **P2-H / UX.1 / P2-F / Dashboard V3** — handoffy w [`PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)

## WZNOWIENIE (checklist agenta)

```text
1. AGENTS.md → PROJECT-HANDOFF-CURRENT.md → SESSION-HANDOFF-OPERATIONAL-NOTES.md
2. CURRENT-TASK.md (ten plik) → docs/ARCHITECTURE.md (Notatki operacyjne)
3. curl -s https://www.wgdom.fun/version.json  → baseline 2.58.1+
4. Hasło „kontynuuj WGDOM” → .cursor/rules/wgdom-stan-projektu.mdc
5. WORKFLOW-RELEASE-DEPLOY.md — workflow A/B/C
```

## COMMIT / PUSH

Ostatni release modułu: **`1f8e2bd`** `fix(notatki): v2.58.1 backup completeness`  
Kolejna praca: **P3 Export** lub inny backlog — dopiero po poleceniu użytkownika.
