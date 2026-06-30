# W&G DOM — przewodnik ciągłości sesji deweloperskiej

> **Cel:** jeden dokument odpowiadający na pytania: *co zrobiliśmy, co robimy teraz, jak wygląda struktura aplikacji i gdzie szukać SSOT.*  
> **Prod:** **2.62.98** · commit **`aeecdc0`** · https://www.wgdom.fun  
> **Data:** 2026-06-30

**Nie zastępuje** `ARCHITECTURE.md` ani handoffów tematycznych — **linkuje** do nich.

---

## 1. Kolejność czytania (nowa sesja)

```text
1. docs/AGENT-CONTINUITY-GUIDE.md     ← TEN PLIK (kontekst + mapa)
2. docs/AGENT-ONBOARDING.md          ← widoki, sync, smoke, workflow deweloperski
3. CURRENT-TASK.md                   ← ostatnia sesja / backlog bieżący
4. docs/PROJECT-HANDOFF-CURRENT.md   ← baseline prod, epici, commity
5. docs/WORKFLOW-ARCHITECTURE-v2.63.md  ← OBOWIĄZKOWE przy Przetargu
6. docs/ARCHITECTURE.md              ← pełna architektura techniczna
7. AGENTS.md                         ← zasady pracy, zakazy
```

Hasło użytkownika **„kontynuuj WGDOM”** → dodatkowo `.cursor/rules/wgdom-stan-projektu.mdc`.

---

## 2. Co zrobiliśmy (stan na 2026-06-30)

### Epici zamknięte (nie rozpoczynaj bez nowego AUDIT + polecenia)

| Epic | Wersja / commit | Status |
|------|-----------------|--------|
| **NG-02 Tender Automation Pipeline** | 2.62.95–98 · **`aeecdc0`** | **CLOSED** · auto discovery → heavy → pricing · 177 test PASS |
| **Mobile Recovery** | 2.62.78–79 · `78582db`→`4397eac` | **CLOSED** · smoke 7 PASS / 1 BLOCKED · bugs **NONE** |
| **P1 Audit Hub WM** | 2.62.74–77 · `b4fde0c`→`21d4a1b` | **CLOSED** — 7 źródeł Hub · `wm_druk` · 10 akcji WM |
| **Recovery Pack off-site** | 2.62.72 · `6cd8ebe` | **CLOSED** · OFFSITE READY · `WGDOM-RP-2.62.72-20260626` |
| **Workflow Architecture V4** | 2.62.64–72 | **CLOSED** — Hub, Process Strip, Sticky CTA |
| **Workflow Cleanup P0** | 2.62.72 | **CLOSED** |
| **Kosztorys Process UX P0** | 2.62.64 | **CLOSED** |
| **Audit Hub MVP-0→1B** | 2.62.36–41 | **CLOSED** — security log, recovery events |
| **WM Schematy + ZI 2026 + EM-P1R** | 2.59–2.62 | **CLOSED / STABLE** |

**Epic closeout NG-02 Pipeline:** [`SESSION-HANDOFF-NG-02-EPIC-CLOSE.md`](SESSION-HANDOFF-NG-02-EPIC-CLOSE.md) · [`audit/NG-02-EPIC-CLOSE-REPORT.md`](../audit/NG-02-EPIC-CLOSE-REPORT.md)  
**Epic closeout Mobile Recovery:** [`SESSION-HANDOFF-MOBILE-RECOVERY-EPIC-CLOSE.md`](SESSION-HANDOFF-MOBILE-RECOVERY-EPIC-CLOSE.md)  
**Epic closeout P1 Audit Hub WM:** [`audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md`](../audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md)  
**SSOT techniczny wm_druk:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § **15.6**

### P1 Audit Hub WM — skrót (4 etapy)

| Etap | Wersja | Commit | Zakres |
|------|--------|--------|--------|
| 1 infra | 2.62.74 | `b4fde0c` | `kw-wm-druk-audit-log` · adapter `adaptWmDrukAudit` |
| 2 Pomiary | 2.62.75 | `c31e1bd` | `rap_*` · `docx_exported` · `zip_exported` |
| 3 Schematy | 2.62.76 | `36718cc` | `schematic_*` · `measurement_imported` · `pdf_exported` |
| 4 UX Hub | 2.62.77 | `21d4a1b` | filtr `wm_druk` · chip · deep link labels · Help |

**Rozdzielenie źródeł:** `wm_print` = Odbiory/historia generacji · `wm_druk` = Pomiary/Schematy/Katalog.  
**Wykluczone świadomie:** `schematic_edited` (anti-flood) — backlog P1.1.

Szczegóły commitów → `docs/PROJECT-HANDOFF-CURRENT.md` § 1a, § 2.

### Recovery Pack (dla programistów — tylko odczyt)

| Pole | Wartość |
|------|---------|
| **Pack root** | `../WGDOM-RECOVERY-PACK/WGDOM-RECOVERY-PACK-2.62.72/` (poza repo) |
| **Orchestrator** | `scripts/run-recovery-pack-2.62.72.mjs` |
| **Baseline** | `RECOVERY_PACK_COMMIT = 6cd8ebe` |
| **Tag Git** | `wgdom-recovery-pack-2.62.72` |

**Nie modyfikuj** packa ani orchestratora bez wyraźnego polecenia użytkownika.

---

## 3. Co robimy teraz / następne

**Zasada:** **nie rozpoczynaj nowych prac automatycznie.** Kolejny EPIC dopiero po świeżym **AUDIT** + wyraźnym poleceniu użytkownika.

| Priorytet | Epic / temat | Status | SSOT |
|-----------|--------------|--------|------|
| **Otwarty epic** | **P0 Payroll Cloud Recovery** — Etap 1 done | **OPEN** (P0.1–P0.4) | `CURRENT-TASK.md` |
| Na polecenie | Workflow Cleanup P1 | backlog | `WORKFLOW-ARCHITECTURE-v2.63.md` |
| Na polecenie | TP200B kosztorys fidelity | PLANNED | `SESSION-HANDOFF-TP200-PLANNED.md` |
| Backlog P1.1 | `schematic_edited` (sesja edycji schematu) | OPEN | epic report § 9 |
| Backlog | P3 Export notatki · P2-H.7 · P2-G.3D/E · P2-F.6 · Mobile Certification Pass 1 | OPEN | `PROJECT-HANDOFF-CURRENT.md` § 11 |
| Backlog mobile (future) | Inspector UX · WM Pomiary/Katalog · Jobs browser history | enhancements only | `SESSION-HANDOFF-MOBILE-RECOVERY-EPIC-CLOSE.md` § 6 |

**Deploy:** push `main` → Vercel. Verify: jedno `curl https://www.wgdom.fun/version.json` → oczekiwane `version` = `CHANGELOG[0].version`.

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
| **Audit Hub** | `AuditHubView.tsx` | **7 źródeł** — MVP-1B + **P1 wm_druk** · § 15.2, § 15.6 |
| **WM Druk audit** | `WmPrintView.tsx` + lib | `wm-druk-audit.ts` · `kw-wm-druk-audit-log` · `recordWmDrukAudit` |
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

## 8. Workflow deweloperski (obowiązujący)

```text
AUDIT → PLAN → IMPLEMENT → TESTY → BUILD → COMMIT → PUSH
→ VERIFY DEPLOY → HOUSEKEEPING → EPIC CLOSE
```

| Etap | Co robić |
|------|----------|
| **AUDIT** | Świeży przegląd SSOT + `git status` przed każdym nowym EPIC-em |
| **PLAN** | Zakres IN/OUT — nie rozszerzać bez polecenia |
| **IMPLEMENT** | Minimalny diff · chmura dla trwałych danych |
| **TESTY / BUILD** | Smoke relevant + `npm run build` |
| **VERIFY** | Jedno `version.json` — bez pollingu |
| **HOUSEKEEPING** | `CURRENT-TASK.md` + `PROJECT-HANDOFF-CURRENT.md` |
| **EPIC CLOSE** | Raport w `audit/` + Lessons Learned |

| Typ zmiany | Bump wersji? |
|------------|--------------|
| Feature / fix UI | Tak — `changelog-data.ts` + `CHANGELOG.md` |
| Docs only | Nie (chyba że user prosi o release) |

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

*Ostatnia aktualizacja: 2026-06-26 · prod 2.62.77 · runtime 21d4a1b · P1 Audit Hub WM EPIC CLOSED*
