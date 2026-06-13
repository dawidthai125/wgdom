# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-13 · **P2-H STREAM FULLY CLOSED (v2.55.10)**  
**★ Główny handoff (SSOT):** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)  
**★ P2-H dokumenty/dossier:** [`docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md)  
**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## STATUS

```text
Production: 2.55.10 (release P2-H.5C + P2-H.5D)

P2-H STREAM FULLY CLOSED (H.1–H.6 + H.5A + H.5B + H.5C + H.5D)
P2-G.2C/2D Cost Classification COMPLETE
UX.1 · P2-F · Dashboard V3 · Przetargi 3.0 · P1 CLOSED
```

**Baseline prod (app):** v2.55.10 · commit po push (P2-H.5C/5D)  
**Poprzedni:** v2.55.9 (P2-H.5B PDF heurystyki)  
**Prod:** https://www.wgdom.fun

---

## SKOŃCZONE W OSTATNIEJ SESJI (2026-06-13)

| Etap | Wersja | Skrót |
|------|--------|-------|
| **P2-H.5C** | **2.55.10** | PDF CAD bez text layer → CASE 3 (nie mylący CASE 2) |
| **P2-H.5D.1** | **2.55.10** | Sync `costDiscovery.source` z faktycznym dossier |
| **P2-H.5D.2** | **2.55.10** | Multi-ATH tie-break: tytuł + depriorytetyzacja opcji/wentylacji |

**Testy release:** heuristic 30 · cost-discovery 8 · 7z 34 · dossier 200+ · cost-intelligence 357 · build PASS

---

## NASTĘPNE (tylko na polecenie)

- **P2-G.3C** Benchmark kosztorysowy
- OCR PDF przedmiarów (poza zakresem P2-H)
