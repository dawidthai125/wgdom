# W&G DOM — przewodnik ciągłości dla agentów AI

> **Cel:** jeden dokument odpowiadający na pytania: *co zrobiliśmy, co robimy teraz, jak wygląda struktura aplikacji i gdzie szukać SSOT.*  
> **Prod:** **2.62.72** · commit **`6cd8ebe`** · https://www.wgdom.fun  
> **Data:** 2026-06-26

**Nie zastępuje** `ARCHITECTURE.md` ani handoffów tematycznych — **linkuje** do nich.

---

## 1. Kolejność czytania (nowy agent)

```text
1. docs/AGENT-CONTINUITY-GUIDE.md     ← TEN PLIK (kontekst + mapa)
2. docs/AGENT-ONBOARDING.md          ← widoki, sync, smoke, workflow agenta
3. CURRENT-TASK.md                   ← ostatnia sesja / backlog bieżący
4. docs/PROJECT-HANDOFF-CURRENT.md   ← baseline prod, epici, commity
5. docs/WORKFLOW-ARCHITECTURE-v2.63.md  ← OBOWIĄZKOWE przy Przetargu
6. docs/ARCHITECTURE.md              ← pełna architektura techniczna
7. AGENTS.md                         ← zasady pracy, zakazy
```

Hasło użytkownika **„kontynuuj WGDOM”** → dodatkowo `.cursor/rules/wgdom-stan-projektu.mdc`.

---

## 2. Co zrobiliśmy (stan na 2026-06-26)

### Ostatnio zamknięte

| Epic | Wersja / commit | Status |
|------|-----------------|--------|
| **Recovery Pack off-site** | 2.62.72 · `6cd8ebe` | **COMPLETED** · OFFSITE READY · G7 PASS · `WGDOM-RP-2.62.72-20260626` |
| **Workflow Architecture V4** | 2.62.64–72 · `6cd8ebe` | **FINALIZED** — Hub, Process Strip, Sticky CTA, Summary Header |
| **Workflow Cleanup P0** | 2.62.72 | **RELEASED** — jedno CTA, bez duplikatu „Następny krok” |
| **Grouped Documents G7 fix** | `6cd8ebe` | `tender-grouped-documents.ts` + migracja `TenderAttachmentsPanel` |
| **Workflow EPIC A/B/C** | 2.62.68–69 | **CLOSED** — Hub · Process Strip · Sticky Primary Action |
| **Kosztorys Process UX P0** | 2.62.64 | **CLOSED** — 8 faz biznesowych |
| **Audit Hub MVP-0→1B** | 2.62.36–41 | **CLOSED** — 6 źródeł, security log |
| **WM Schematy + ZI 2026** | 2.59–2.62 | **CLOSED / STABLE** |

Szczegóły commitów i testów → `docs/PROJECT-HANDOFF-CURRENT.md` § 1a, § 2a (Recovery Pack).

### Recovery Pack (dla agentów — tylko odczyt)

| Pole | Wartość |
|------|---------|
| **Pack root** | `../WGDOM-RECOVERY-PACK/WGDOM-RECOVERY-PACK-2.62.72/` (poza repo) |
| **Orchestrator** | `scripts/run-recovery-pack-2.62.72.mjs` |
| **Baseline** | `RECOVERY_PACK_COMMIT = 6cd8ebe` |
| **Tag Git** | `wgdom-recovery-pack-2.62.72` |

**Nie modyfikuj** packa ani orchestratora bez wyraźnego polecenia użytkownika.

---

## 3. Co robimy teraz / następne

| Priorytet | Epic | SSOT |
|-----------|------|------|
| **★ Rekomendowany** | **P1 Audit Hub WM** — Pomiary/Schematy → Audit Hub | `SESSION-HANDOFF-AUDIT-HUB-WM-001.md` |
| Na polecenie | Workflow Cleanup P1 | `WORKFLOW-ARCHITECTURE-v2.63.md` |
| Na polecenie | TP200B kosztorys fidelity | `SESSION-HANDOFF-TP200-PLANNED.md` |
| Backlog | P3 Export notatki · P2-H.7 · P2-G.3D/E · P2-F.6 | `PROJECT-HANDOFF-CURRENT.md` § 11 |

**Deploy:** po push `main` → Vercel auto-build. Verify: `curl https://www.wgdom.fun/version.json` → `{ "version": "2.62.72", "commit": "6cd8ebe" }`.

---

## 4. Architektura aplikacji (skrót)

### 4.1 Warstwy

```text
┌──────────────────────────────────────────────────────────────┐
│  PWA (React + Vite + TypeScript)                             │
│  src/app/          — UI, routing, widoki                     │
│  src/lib/          — logika domenowa (SSOT biznesu)            │
├──────────────────────────────────────────────────────────────┤
│  LocalStorage  ←── merge/push ──→  Supabase KV (DATA_KEYS)   │
│  Pliki         ←── upload ──────→  Storage + Edge Function    │
└──────────────────────────────────────────────────────────────┘
```

| Warstwa | SSOT | Uwaga |
|---------|------|-------|
| Sync / merge | `src/lib/cloud-sync.ts` | **KRYTYCZNE** — ARCHITECTURE § 11 |
| Wersja UI | `src/app/changelog-data.ts` | `CHANGELOG[0].version` |
| Wersja deploy | `dist/version.json` | generowane w `vite.config.ts` |
| Backend API | `supabase/functions/make-server-0afb8820/` | KV, storage, email, BZP proxy |

### 4.2 Role użytkowników

| Rola | Dostęp |
|------|--------|
| **Admin** | Pełny panel — Pulpit, Roboty, Przetargi, WM Druk, Lista Płac, … |
| **Inspektor terenowy** | Osobny login — roboty, zdjęcia, checklista |
| **Pracownik** | Telefon + PIN — grafik, wypłata, zdjęcia |

### 4.3 Mapa widoków admina

**Pełna tabela:** ARCHITECTURE § 15.1 · **Router:** `AdminViewRouter.tsx` · **Menu:** `admin-nav.ts`

| `view` | Etykieta | Komponent główny |
|--------|----------|------------------|
| `dashboard` | Pulpit | `DashboardView.tsx` |
| `payroll` | Lista Płac | `PayrollView.tsx` |
| `schedule` | Grafik | `App.tsx` |
| `jobs` | Roboty | `JobsView.tsx` |
| `operationalnotes` | Notatki operacyjne | `OperationalNotesView.tsx` |
| `audit` | Audit Hub | `AuditHubView.tsx` (Super Admin) |
| `tenders` | Przetargi | `TendersModule.tsx` |
| `wmprint` | Odbiory WM Druk | `WmPrintView.tsx` (+ Pomiary, Schematy) |
| `recoverablecharges` | Do rozliczenia | `RecoverableChargesView.tsx` |
| `media` | Zdjęcia i pliki | `MediaView.tsx` |
| `inspector` | Inspektor (admin feed) | `InspectorAdminView.tsx` |
| `guide` | Zmiany / Instrukcja | `GuideView.tsx` |

**Mobile:** bottom nav — Pulpit · Lista Płac · Grafik · Roboty; reszta w „Więcej”.

**Nie czytaj** `App.tsx` od zera (~15k linii) — grep po nazwie widoku lub ARCHITECTURE § 15.

---

## 5. Moduł Przetargi — struktura funkcji

**SSOT Workflow:** `docs/WORKFLOW-ARCHITECTURE-v2.63.md` (obowiązkowe przed zmianą UI Przetargu).

### 5.1 Nawigacja modułu (`TendersModule.tsx`)

| Zakładka | Plik | Rola |
|----------|------|------|
| Lista | `tenders/tabs/TendersListTab.tsx` | Pipeline BZP, filtry, Client Bar |
| Strategia | `tenders/tabs/TendersStrategyTab.tsx` | GO/HOLD, prognoza, health — **jedyny** slot strategii |
| Mapa | `tenders/tabs/TendersMapTab.tsx` | Geolokalizacja przetargów |
| Profil firmy | `tenders/tabs/TendersProfileTab.tsx` | Profil wykonawcy |
| Baza cen | `tenders/tabs/TendersPriceBaseTab.tsx` | P3 pricing |
| Ustawienia | `tenders/tabs/TendersSettingsTab.tsx` | Konfiguracja modułu |

**Provider:** `TendersProvider.tsx` — wspólny pipeline dla Pulpitu (`TendersShortcutPanel`) i modułu Przetargi.

### 5.2 Detal przetargu (V4 Workspace)

```text
TenderDetailPanel.tsx          ← shell zakładek V4
├── TenderWorkflowHub          ← EPIC A: postęp, blokery, prep (Hub)
├── TenderWorkflowProcessStrip ← EPIC B: pasek Dokumenty→Oferta
├── TenderWorkflowPrimaryAction← EPIC C: jedno sticky CTA
├── TenderAttachmentsPanel     ← Dokumenty: grouped list (tender-grouped-documents.ts)
├── DocumentSummaryHeader      ← nagłówek podsumowania dokumentów
├── Kosztorys / Wycena / Oferta / Decyzja … (sloty V4)
└── buildTenderIntelligenceContext()  ← jedno źródło kontekstu (anti-duplikacja)
```

### 5.3 Kluczowe lib (Przetargi) — mapa tematyczna

| Temat | Pliki SSOT |
|-------|------------|
| Pipeline BZP / sync | `tenders-bzp.ts`, `tenders-sync.ts` |
| Dossier / parse / merge | `tender-dossier-pipeline.ts`, `tender-dossier-merge.ts`, `tenders-bzp-doc-parse.ts` |
| Workflow UI | `tender-workflow-hub.ts`, `tender-workflow-process-strip.ts`, `tender-workflow-primary-action.ts` |
| Intelligence / CTA | `tender-intelligence-context.ts`, `tender-intelligence-next-action.ts` |
| Dokumenty UI | `tender-grouped-documents.ts`, `tender-workspace-ux.ts`, `tender-document-summary-header.ts` |
| Kosztorys UX | `tender-kosztorys-process-phase.ts`, `tender-kosztorys-process-health.ts` |
| Strategia | `tenders-strategy-*.ts` (wiele modułów — grep przed nowym plikiem) |
| Owner View / P1 | `tender-executive-summary.ts`, `tender-work-scope-inference.ts` |

**Zasada:** rozszerzaj istniejące lib; nie duplikuj klasyfikatorów dokumentów.

### 5.4 Smoke regresji Przetargów

```bash
npx vite-node scripts/test-tender-workflow-hub.mjs
npx vite-node scripts/test-tender-workflow-primary-action.mjs
npx vite-node scripts/test-tender-workspace-ux.mjs
npx vite-node scripts/test-tender-kosztorys-process-phase.mjs
npm run build
```

---

## 6. Inne domeny (skrót)

| Domena | Widok | Lib / handoff |
|--------|-------|---------------|
| **WM Druk + ZI 2026** | `WmPrintView.tsx` | `ZI-2026-HANDOFF.md`, ARCHITECTURE § 12.1.8 |
| **Pomiary Elektryczne** | tab w WM Druk | `SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md` |
| **Schematy** | tab w WM Druk | `SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md` |
| **Notatki operacyjne** | `OperationalNotesView.tsx` | `SESSION-HANDOFF-OPERATIONAL-NOTES.md` |
| **Audit Hub** | `AuditHubView.tsx` | `SESSION-HANDOFF-AUDIT-HUB.md` — **WM jeszcze nie w Hub** |
| **Lista Płac** | `PayrollView.tsx` | `SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md` |
| **Roboty** | `JobsView.tsx` | `job-*.ts`, inspektor w `InspectorPanel.tsx` |

---

## 7. Struktura repozytorium

```text
WGDOM1/
├── src/
│   ├── app/                 UI — widoki, TendersModule, App.tsx (monolit shell)
│   │   ├── admin/           AdminViewRouter, admin-nav
│   │   └── tenders/         Przetargi 3.0 (tabs, strategy, provider)
│   ├── lib/                 ★ logika domenowa (~100+ plików tender-*)
│   └── config/supabase.ts
├── supabase/functions/make-server-0afb8820/   Edge API
├── scripts/                 testy vite-node, backup, recovery (nie commitować _tmp*)
├── docs/                    SSOT, handoffy, ARCHITECTURE
├── audit/                   raporty śledcze (wiele plików lokalnych)
├── public/                  PWA, szablony PDF/DOCX
└── e2e/                     Playwright
```

**Poza repo:** `../WGDOM-RECOVERY-PACK/` — Recovery Pack (off-site backup).

**Nie commitować:** `scripts/_tmp*`, większość `audit/*.pdf`, `.env`, artefakty packa.

---

## 8. Workflow agenta (skrót)

```text
AUDIT → PLAN → IMPLEMENT → BUILD → SMOKE → CHANGELOG
→ (ARCHITECTURE jeśli architektura) → CURRENT-TASK + PROJECT-HANDOFF-CURRENT
→ COMMIT → PUSH → VERIFY (version.json)
```

| Typ zmiany | Bump wersji? |
|------------|--------------|
| Feature / fix UI | Tak — `changelog-data.ts` + `CHANGELOG.md` |
| Docs only | Nie (chyba że user prosi o release) |
| Recovery Pack | Osobny proces — nie mieszać commitów |

Szczegóły: `docs/WORKFLOW-RELEASE-DEPLOY.md` · `AGENTS.md`

---

## 9. Czego nie ruszać bez polecenia

- `cloud-sync.ts` — merge, DATA_KEYS, Payroll Guard
- Parsery dossier / ATH / PDF — bez testów TP113/TP182
- Edge Function semantics (email, storage paths)
- Canonical ZI template KV (`2b22da48…`)
- Recovery Pack orchestrator / pack root
- Command Center — **usunięty**, nie przywracać

---

*Ostatnia aktualizacja: 2026-06-26 · prod 2.62.72 · commit 6cd8ebe · Recovery Pack OFFSITE READY*
