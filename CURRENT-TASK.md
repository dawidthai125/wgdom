# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-13 · **P2-H.5B CLOSED — PDF przedmiar heurystyki (v2.55.9)**  
**★ Główny handoff (SSOT):** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)  
**★ P2-H dokumenty/dossier:** [`docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md)  
**★ UX.1 handoff:** [`docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`](docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md)  
**★ P2-F handoff:** [`docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md)  
**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## STATUS

```text
Production: 2.55.9 (release P2-H.5B)

P2-H stream funkcjonalnie CLOSED (H.1–H.6 + H.5A + H.5B)
P2-G.2C/2D Cost Classification COMPLETE
UX.1 · P2-F · Dashboard V3 · Przetargi 3.0 · P1 CLOSED
```

**Baseline prod (app):** v2.55.9 · commit po push (P2-H.5B)  
**Poprzedni:** v2.55.8 (P2-H.5A PDF discovery)  
**Prod:** https://www.wgdom.fun

---

## SKOŃCZONE W OSTATNIEJ SESJI (2026-06-13)

| Etap | Wersja | Skrót |
|------|--------|-------|
| P2-H.4 | 2.55.6 | UX copy 7Z — unpack fail vs brak ATH/XLS |
| P2-H.6 | 2.55.7 | Filtr folderów logicznych w listZipFiles/list7zFiles |
| P2-H.5A | 2.55.8 | PDF przedmiar MVP — discovery + FOUND_NO_VALUE |
| **P2-H.5B** | **2.55.9** | **Heurystyki KNR/KNNR — pozycje z natywnych PDF bez OCR** |

**Testy release:** heuristic 26 · 7z 34 · dossier 195 · cost-intelligence 357 · build PASS

---

## OPEN BACKLOG (priorytet dla agentów)

```text
P2-H.7   Edge magic bytes dla .7z (techniczny hardening)

P2-G.3C  Benchmark rynku        → workspace Wycena
P2-G.3D  AI Validation          → workspace Wycena
P2-G.3E  Benchmark RMS          → workspace Wycena
P2-F.6   Kompletność oferty     → workspace Oferta

P2       Audit Center / Security Log
P3       Dalsze usprawnienia Przetargów
```

**Bez polecenia:** nie startować P2/P2-G/P3 bez AUDIT → RCA → PLAN.

---

## Domeny produktu (aktualne)

```text
Dashboard
Roboty
Do Rozliczenia
Przetargi
  ├── Moduł: Lista | Strategia | Mapa | Profil | Ustawienia
  └── Pojedynczy przetarg: 5 workspace (Przegląd · Dokumenty · Kwalifikacja · Wycena · Oferta)
```

---

## Komendy szybkie

```bash
npm run build
npx vite-node scripts/test-pdf-przedmiar-heuristic.mjs
npx vite-node scripts/test-tender-7z-archive.mjs
npx vite-node scripts/test-tender-dossier-pipeline.mjs
npx vite-node scripts/test-tender-cost-intelligence.mjs
curl -s https://www.wgdom.fun/version.json
```
