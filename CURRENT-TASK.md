# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-13 · **UX.1 CLOSED — Documentation closeout**  
**★ Główny handoff (SSOT):** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)  
**★ UX.1 handoff:** [`docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`](docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md)  
**★ P2-F handoff:** [`docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md)  
**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## STATUS

```text
Production: 2.53.4 (RELEASE GO — PRODUCTION VERIFIED)

UX.1 Tender Workspace COMPLETE (UX.1A → UX.1B + ARCH-001)

Dashboard V3 COMPLETE

Przetargi 3.0 COMPLETE

P2-F Tender Qualification COMPLETE (F.0 → F.5)

Command Center REMOVED (v2.51.0)

P1 CLOSED
```

**Baseline prod (app):** v2.53.4 · commit **`3b5da74`** (UX.1B)  
**Poprzedni:** v2.53.3 · `53451ed` (ARCH-001)  
**Prod:** https://www.wgdom.fun

---

## SKOŃCZONE W OSTATNIEJ SESJI (2026-06-13)

| Etap | Wersja | Commit | Skrót |
|------|--------|--------|-------|
| UX.1A | 2.53.1 | `8615d0b` | Reorganizacja sekcji, sticky summary, dedup |
| P0 hotfix | 2.53.2 | `7392c82` | Cykl ESM → biały ekran |
| ARCH-001 | 2.53.3 | `53451ed` | Audyt cykli importów + docs § 11.6 |
| UX.1B | **2.53.4** | **`3b5da74`** | **5 workspace tabs, lazy render** |

Audyty READ ONLY: UX.1, UX.1B FINAL — werdykt GO dla implementacji.

---

## OPEN BACKLOG

```text
P2-G.3C  Benchmark rynku        → workspace Wycena (NIE nowy tab)
P2-G.3D  AI Validation          → workspace Wycena
P2-G.3E  Benchmark RMS          → workspace Wycena
P2-F.6   Kompletność oferty     → workspace Oferta

P2       Audit Center / Security Log

P2-F.6+  investorName w profilu · auto-pakiet referencji (opcjonalnie)

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

Strategia przetargowa wyłącznie: **Przetargi → Strategia** (`TendersModule`).

---

## Decyzje wiążące

- **UX.1 Anti-CC:** max **5** workspace w detail przetargu; nowe funkcje → sub-sekcja w istniejącym tabie
- **P0 UX RULE:** Przegląd ≤ 1 ekran desktop — duże panele tylko w innych workspace
- **ARCH-001:** zero static import `cloud-sync` w nowych plikach lib w drzewie merge; shell workspace = czysty UI
- **2.1.2 CANCELLED** — pełna lista odbiorców inspektora z Kontaktów
- **Dashboard V2 Hero** — nie przywracać (V3 SSOT)
- **Command Center** — usunięty v2.51.0; docs → [`docs/archive/command-center/`](docs/archive/command-center/)
- **P2-F referenceStatus** — domyślnie `unknown`

---

## Wznowienie pracy (agent)

1. [`docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`](docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md) — **przy Przetargi / workspace**
2. [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § UX.1B · § 11.6 ARCH-001
4. `curl -s https://www.wgdom.fun/version.json` → **2.53.4**
5. `npx vite-node scripts/test-tender-workspace-ux.mjs`
6. `npm run audit:import-cycles` — przed zmianami w `src/lib` sync-related
