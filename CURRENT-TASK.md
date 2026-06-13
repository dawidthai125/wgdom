# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-13 · **P2-H.4 CLOSED — UX copy 7Z (v2.55.6)**  
**★ Główny handoff (SSOT):** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)  
**★ P2-H dokumenty/dossier:** [`docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md)  
**★ UX.1 handoff:** [`docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`](docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md)  
**★ P2-F handoff:** [`docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md)  
**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## STATUS

```text
Production: 2.55.6 (lokalnie — do release)

P2-H.1–H.4 Tender Documents COMPLETE (Marketplanet · ZIP · 7Z · UX copy)
P2-G.2C/2D Cost Classification COMPLETE (WM/ZZK wod-kan · gaz · C.O.)

UX.1 Tender Workspace COMPLETE
P2-F Tender Qualification COMPLETE
Dashboard V3 COMPLETE
Przetargi 3.0 COMPLETE
P1 CLOSED
```

**Baseline prod (app):** v2.55.5 · commit **`d725c24`** (P2-H.3 7Z)  
**Poprzedni:** v2.55.4 · `329d883` (P2-G.2D C.O.)  
**Prod:** https://www.wgdom.fun

---

## SKOŃCZONE W OSTATNIEJ SESJI (2026-06-13)

| Etap | Wersja | Commit | Skrót |
|------|--------|--------|-------|
| P2-H.1 | 2.55.0 | — | Marketplanet ezamawiajacy.pl discover + download |
| P2-H.1 hotfix | 2.55.1 | — | sourcePageUrl → document-bytes |
| P2-H.2 | 2.55.2 | — | Double ZIP unpack fix |
| P2-G.2C | 2.55.3 | `5b257ce` | Klasyfikacja WM/ZZK wod-kan + gaz |
| P2-G.2D | 2.55.4 | `329d883` | Klasyfikacja C.O. INSTALACJE_CO |
| **P2-H.3** | **2.55.5** | **`d725c24`** | **7Z archive support (7z-wasm LGPL)** |

**Audyt prod READ ONLY:** Kąty Wrocławskie — P2-H.3 **działa**; brak kosztorysu = archiwum bez ATH/XLS (tylko PDF).  
**Dokumentacja:** `SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md` + aktualizacja SSOT.

---

## OPEN BACKLOG (priorytet dla agentów)

```text
P2-H.5   PDF przedmiar (*_PR.pdf) w cost discovery                         ← backlog produktowy
P2-H.6   list7zFiles — filtrować foldery bez rozszerzenia
P2-H.7   Edge magic bytes dla .7z

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
       └── Dokumenty: ZIP + 7Z inner · Marketplanet · Logintrade · BZP
```

---

## Decyzje wiążące

- **P2-H.3:** biblioteka **7z-wasm (LGPL)** — nie `archive-wasm` (GPL)
- **Marketplanet:** `sourcePageUrl` obowiązkowe przy pobieraniu bajtów
- **Inner archive:** pole `zipInnerPath` dla ZIP **i** 7Z (bez rename)
- **UX.1 Anti-CC:** max **5** workspace; nowe funkcje → sub-sekcja w tabie
- **ARCH-001:** zero static import `cloud-sync` w nowych lib merge
- **2.1.2 CANCELLED** — pełna lista odbiorców inspektora z Kontaktów

---

## Wznowienie pracy (agent) — kolejność czytania

1. [`docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md) — **przy dokumentach / ZIP / 7Z / dossier**
2. [`docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`](docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md) — **przy workspace przetargu**
3. [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)
4. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.7 · § UX.1B · § 11.6
5. `curl -s https://www.wgdom.fun/version.json` → **2.55.5**

**Testy przed release dokumentów:**

```bash
npx vite-node scripts/test-tender-7z-archive.mjs
npx vite-node scripts/test-tender-dossier-pipeline.mjs
npx vite-node scripts/test-tender-cost-intelligence.mjs
npm run build
```
