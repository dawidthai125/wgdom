# PROJECT HANDOFF CURRENT — W&G DOM

> **★ Główny handoff projektu (SSOT)** · **Data closeout:** 2026-06-15 (WM Druk P0 **COMPLETE** · v2.59.19 · `1a8c892`)  
> **Hasło agenta:** „kontynuuj WGDOM”  
> **Poprzedni handoff końcowy serii:** [`PROJECT-HANDOFF-FINAL-20.5Z.md`](PROJECT-HANDOFF-FINAL-20.5Z.md) — nadal ważny dla architektury platformy 20.5Z; **ten dokument** aktualizuje baseline prod i releasy **po** 20.5Z.

**Wejście dla nowego GPT / Cursor:**

```text
1. docs/PROJECT-HANDOFF-CURRENT.md        ← TEN PLIK (baseline prod)
2. docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md  ← ★★ Odbiory WM Druk (P0 **COMPLETE**)
3. docs/SESSION-HANDOFF-OPERATIONAL-NOTES.md  ← ★★ Notatki operacyjne P0→HF (COMPLETE)
4. docs/SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md  ← ★★ P3 wycena · BZP pipeline · P3.6 · P1 WM
5. docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md  ← ★★ P2-H dokumenty · ZIP · 7Z · Marketplanet
6. docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md  ← ★★ UX.1A/1B workspace + ARCH-001
7. docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md  ← P2-F kwalifikacja ofertowa (COMPLETE)
8. docs/SESSION-HANDOFF-DASHBOARD-V3.md   ← Pulpit V3 (COMPLETE — referencja)
9. CURRENT-TASK.md                         ← status sesji / wznowienie
10. docs/WORKFLOW-RELEASE-DEPLOY.md         ← workflow A/B/C
11. AGENTS.md → docs/ARCHITECTURE.md § 12.1.8 WM Druk · § Notatki · § 12.1.1–12.1.7
```

---

## 1a. Completed Epics (P1 + P2-F + P3 CLOSED)

| Epic | Wersja | Status | SSOT |
|------|--------|--------|------|
| **Odbiory WM Druk P0** | 2.59.15–**2.59.19** (`1a8c892`) | **COMPLETE** | [`SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md) |
| **P3 Wycena · Baza cen · filtry** | 2.56.0–**2.56.10** (`7acbecf`) | **P3.0–P3.6 CLOSED** | [`SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md`](SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md) |
| **Notatki operacyjne** | **2.57.0–2.58.1** (`1f8e2bd`) | **COMPLETE** (P0→P2C+HF) · P3 Export OPEN | [`SESSION-HANDOFF-OPERATIONAL-NOTES.md`](SESSION-HANDOFF-OPERATIONAL-NOTES.md) |
| **P2-H Tender Documents** | 2.55.0–**2.55.10** | **CLOSED** (H.7 OPEN) | [`SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md) |
| **UX.1 Tender Workspace** | 2.53.1–**2.53.4** (`3b5da74`) | **COMPLETE** | [`SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`](SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md) |
| **P2-F Tender Qualification** | 2.51.19–**2.51.24** (`e015453`) | **COMPLETE** | [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md) |
| **Dashboard V3** | 2.50.74 (`5a54399`) | **COMPLETE** | [`SESSION-HANDOFF-DASHBOARD-V3.md`](SESSION-HANDOFF-DASHBOARD-V3.md) |
| **Command Center Removal** | 2.51.0 (`39b1892`) | **COMPLETE** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.3 |
| **Przetargi 3.0** | 2.51.0–2.51.1 | **COMPLETE** | `TendersModule` · `TendersProvider` |

**Command Center removed in v2.51.0** — archiwum docs: [`archive/command-center/`](archive/command-center/).

### Architektura produktu (główne domeny)

```text
Dashboard
Roboty
Notatki operacyjne          ← COMPLETE v2.58.1 (admin · ACK · widget · audit · inspektor · backup)
Do Rozliczenia
Przetargi (+ Karta ofertowa P2-F, Wycena P3, Baza cen, Profil wykonawcy)
```

**Przetargi 3.0** — zakładki: Lista · Strategia · Mapa · Profil firmy · **Baza cen** · Ustawienia.  
Strategia (GO/HOLD/NO-GO, prognoza, health) wyłącznie w **Przetargi → Strategia**.  
Pulpit: operacje + `TendersShortcutPanel` (CTA → Strategia).

---

## 1. PROJECT

**W&G DOM** — React/Vite, monolit UI + panele w `src/app/`, sync LocalStorage ↔ Supabase KV.

| Element | Wartość |
|---------|---------|
| **Repo** | https://github.com/dawidthai125/wgdom · branch `main` |
| **Prod** | https://www.wgdom.fun · https://www.wgdom.online |
| **Backend** | Supabase Edge `make-server-0afb8820` |
| **Sync** | `src/lib/cloud-sync.ts` |
| **Wersja UI (SSOT)** | `CHANGELOG[0].version` w `src/app/changelog-data.ts` |

---

## 2. PRODUCTION BASELINE

```text
Version (repo / prod):      2.59.19       ← WM Druk P0.2A ZI-PDF-001 CLOSED
Feature commit (prod):      1a8c892        fix: P0.2A strip ZI demo ULICA/BUD/LOK
WM Druk hotfix:             01211d6        v2.59.18 normalizeWmPrintTemplates runtime
WM Druk cleanup:            16ee8f8        v2.59.17 KV 99→15 templates
WM Druk seed guard:         0c6b804        v2.59.15 template pollution fix
Notatki HF:                 1f8e2bd        v2.58.1 backup completeness
Notatki P2A:                7c291d9        v2.58.0 Inspektor UI
Notatki P2C:                b56e628        v2.57.5 Audit UI
Notatki P2B:                60876a8        v2.57.4 Widget Pulpit
Notatki P0:                 2.57.0         CRUD · sync · job link
Poprzedni prod (P3):        7acbecf        v2.56.10 WM false exclude + P3.6
P3.6:                       2.56.9         Filtry klientów strategicznych (d3ecbe4)
P2-G.3C:              2.56.8         Benchmark klasyfikacji prod (66a619e)
P3 UX Stabilization:  2.56.7         Wycena cleanup + słowniki 3.1 (9759ef9)
P3.4A:                2.56.6         Historia materiałów
P3.3D:                2.56.5         Benchmark Impact
P3.3B:                2.56.4         Benchmark robocizny PRO
P3.3A:                2.56.3         Benchmark robocizny MVP
P3.5B / P3.5 / P3.2:  2.56.0–2.56.2  Override · pozycje · Baza cen
Feature commit (P2-H.5C/5D): 0683e05  PDF no-text CASE 3 + multi-ATH ranking
P2-H.5B:              2.55.9         Heurystyki KNR PDF
P2-H.6:               2.55.7         filtr folderów ZIP/7Z
P2-H.4:               2.55.6         UX copy archiwów 7Z
Feature commit (P2-H.3): d725c24      P2-H.3: obsługa archiwów 7Z w dossier
P2-G.2D:              329d883         v2.55.4 klasyfikacja C.O.
P2-G.2C:              5b257ce         v2.55.3 WM/ZZK wod-kan + gaz
UX.1B:                3b5da74         v2.53.4 workspace tabs
P2-F baseline:        e015453         v2.51.24 P2-F.5 Works Register
Feature commit (P1):  39b1892         CC removal + TendersProvider
Dashboard V3:         5a54399         v2.50.74
Git tag backup:       pre-next-feature-2.50.64 → c7bc58f
E2E (origin/main):    8906485         20.5Z.2B
```

| Status | Wartość |
|--------|---------|
| **RELEASE GO (2.59.19)** | **TAK** — pushed `1a8c892` |
| **RELEASED (prod)** | **2.59.19** — verify `version.json` |
| **STABLE** | TAK (moduł wmprint) |
| **PRODUCTION VERIFIED** | `version.json` = **2.59.19** |
| **WM Druk P0** | **COMPLETE** (2.59.15–2.59.19) |
| **WM Druk P0 pollution** | **CLOSED** |
| **WM Druk KV cleanup** | **CLOSED** (99→15) |
| **WM Druk runtime hotfix** | **CLOSED** (2.59.18) |
| **ZI PDF placeholdery (ZI-PDF-001)** | **CLOSED** (v2.59.19 P0.2A) |
| **Notatki operacyjne** | **COMPLETE** (P0→P2C+HF) · **P3 Export OPEN** |
| **P3 (Wycena / Baza cen / filtry)** | **P3.0–P3.6 CLOSED** · benchmark materiałów rynku **HOLD** |
| **P1 WM pipeline** | **CLOSED** (v2.56.10 false exclude przebudowa) |
| **P2-H (Dokumenty / ZIP / 7Z / PDF)** | **H.1–H.6 + H.5A–H.5D CLOSED** · **H.7 OPEN** (magic bytes) |
| **UX.1 (Tender Workspace)** | **CLOSED** (UX.1A → UX.1B + ARCH-001) |
| **P2-F (Kwalifikacja ofertowa)** | **CLOSED** (F.0 → F.5) |
| **P2-G.2C/2D (Klasyfikacja WM/ZZK)** | **CLOSED** (v2.55.3–2.55.4) |
| **P1 (Dashboard V3 + CC removal + Przetargi 3.0)** | **CLOSED** |
| **Inspector 2.1** | **2.1.0 + 2.1.1 COMPLETE** · **2.1.2 CANCELLED** |

**Verify prod (bez pollingu API):**

```bash
curl -s https://www.wgdom.fun/version.json
# oczekiwane: { "version": "2.59.19" }
```

---

## 2a. P1-B — Przetargi 3.0 / Command Center removal (**CLOSED**)

**Command Center removed in v2.51.0** — brak runtime `CommandCenterProvider`, `TenderCenterProView`, `OwnerDashboard`.

| ETAP | Wersja | Skrót |
|------|--------|-------|
| 1 | 2.50.75 | Usunięcie legacy UI CC (Morning Briefing, AI Insights, …) |
| 2 | 2.50.76 | `TendersModule` — 5 zakładek |
| 3 | 2.51.0 | `TendersProvider` + `TendersShortcutPanel`; hard delete CC shell |
| 4 | 2.51.1 | Rename: `src/app/tenders/strategy/`, lib `tenders-strategy-*` |

**Architektura:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.3 · **Archiwum CC (SUPERSEDED):** [`archive/command-center/`](archive/command-center/)

---

## 3. KEY RELEASES (po [`PROJECT-HANDOFF-FINAL-20.5Z.md`](PROJECT-HANDOFF-FINAL-20.5Z.md))

Chronologia releasów aplikacyjnych na `main` po baseline **2.50.65** (20.5Z.5C):

| Wersja | Sprint | Commit | Skrót |
|--------|--------|--------|-------|
| **2.50.66** | 20.7C.2 Dashboard V2 Complete | `3e46ae8` | Hero DZIŚ SSOT, dedupe Uwaga dziś, E2E hero |
| **2.50.67** | 20.7D.1 Hero Compression | `f94b530` | KPI first, Hero accordion compact |
| **2.50.68** | 20.7E Dashboard IA Cleanup | `65f3a8d` | Najważniejsze dziś, Uwaga accordion, Hero standalone, Przetargi — skrót |
| *(hotfix)* | Payroll extraCostStatus | `add9338` | `extraCostStatus is not defined` w WeekEmployeeDetail |
| *(docs)* | Workflow Release/Deploy | `79174b3` | SSOT: [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) |
| **2.50.69** | 2.1.0 Inspector Communication Templates | `5391d03` | Szablony A–D, modal, `isInspector`, Edge `inspector_template` |
| **2.50.70** | 2.1.1 Default Inspector Recipient | `ee2cd72` | `isDefaultInspector`, domyślny odbiorca, modal UX |
| *(housekeeping)* | `.gitignore` P0+P1 | `77e1052` | untracked 49 → 19 (diag/smoke artifacts) |
| **2.50.72–73** | Hero filtry operacyjne | `4426c72` / `ad859e6` | Prognoza tylko w CC; Hero bez CC |
| **2.50.74** | **Dashboard V3 (P1-A)** | `5a54399` | Usunięto Hero; Braki + Pilne uwagi; liczniki policzalne |
| **2.50.75–76** | P1-B ETAP 1–2 | `098f651` / `58b4cd7` | CC legacy UI out; TendersModule 5 zakładek |
| **2.51.0** | P1-B ETAP 3 | `39b1892` | CC runtime removal; TendersProvider; TendersShortcutPanel |
| **2.51.1** | P1-B ETAP 4 | `45ad21e` | Rename `tenders/strategy/`, `tenders-strategy-*` lib |
| **2.51.19** | P2-F.0 | `a2d0f8a` | Formal Requirements Extraction |
| **2.51.20** | P2-F.1 | `28c5602` | Warunki udziału vs `kw-company-profile` |
| **2.51.21** | P2-F.2 | `73683f8` | Experience & References Qualification |
| **2.51.22** | P2-F.3 | `7dd7563` | Company Experience Auto-Build |
| **2.51.23** | P2-F.4 | `77b352a` | Referencje upload + ATH Quick Access |
| **2.51.24** | **P2-F.5** | **`e015453`** | Works Register Generator PDF/DOCX |
| **2.53.1** | UX.1A | `8615d0b` | Tender Workspace Cleanup MIN |
| **2.53.2** | P0 hotfix | `7392c82` | Cykl ESM app-core (biały ekran) |
| **2.53.3** | ARCH-001 | `53451ed` | Circular dependency prevention |
| **2.53.4** | **UX.1B** | **`3b5da74`** | **5 workspace tabs · lazy render** |
| **2.55.0** | P2-H.1 | — | Marketplanet ezamawiajacy.pl |
| **2.55.1** | P2-H.1 hotfix | — | sourcePageUrl document-bytes |
| **2.55.2** | P2-H.2 | — | Double ZIP unpack fix |
| **2.55.3** | P2-G.2C | `5b257ce` | Klasyfikacja WM/ZZK wod-kan + gaz |
| **2.55.4** | P2-G.2D | `329d883` | Klasyfikacja C.O. |
| **2.55.5** | **P2-H.3** | **`d725c24`** | **7Z archive support (7z-wasm)** |
| **2.55.6** | P2-H.4 | — | UX copy archiwów 7Z |
| **2.55.7** | P2-H.6 | — | Filtr folderów ZIP/7Z inner |
| **2.55.8** | P2-H.5A | — | PDF przedmiar MVP discovery |
| **2.56.3** | **P3.3A** | **(release)** | **Benchmark robocizny MVP (read-only)** |
| **2.56.8** | **P2-G.3C** | **`66a619e`** | **Klasyfikacja prod UNKNOWN 16→0** |
| **2.56.9** | **P3.6** | **`d3ecbe4`** | **Filtry klientów strategicznych** |
| **2.56.10** | **P1 WM** | **`7acbecf`** | **Fix false exclude przebudowa budynku** |
| **2.57.0** | **Notatki operacyjne P0** | **(pre-commit)** | **Moduł · CRUD · komentarze · archiwum · audit · sync · job link** |
| **2.59.15** | WM Druk seed guard | `0c6b804` | Anti-pollution — seed tylko local+cloud puste |
| **2.59.17** | WM Druk KV cleanup | `16ee8f8` | Templates 99→15, tombstone |
| **2.59.18** | WM Druk runtime hotfix | `01211d6` | `normalizeWmPrintTemplates` w cloud-sync |
| **2.59.19** | **WM Druk P0.2A ZI-PDF-001** | **`1a8c892`** | **Strip demo ULICA/BUD/LOK + clean template storage/KV** |
| **2.56.2** | **P3.5B** | **f74fe1b** | **Override cen per przetarg** |
| **2.56.1** | **P3.5** | **16b792e** | **Ceny per pozycja kosztorysu (read-only)** |
| **2.55.10** | **P2-H.5C/5D** | **0683e05** | **PDF noTextLayer CASE 3 + multi-ATH ranking + discovery sync** |
| **2.55.9** | P2-H.5B | — | Heurystyki KNR — pozycje z PDF bez OCR |

**Handoff WM Druk:** [`SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md)  
**Handoff P3+BZP:** [`SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md`](SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md)  
**Handoff P2-H:** [`SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md)  
**Handoff UX.1:** [`SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`](SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md)  
**Handoff P2-F:** [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md)  
**Handoff Pulpit (SSOT):** [`SESSION-HANDOFF-DASHBOARD-V3.md`](SESSION-HANDOFF-DASHBOARD-V3.md)  
**Historyczny Dashboard V2:** [`SESSION-HANDOFF-20.7-DASHBOARD-V2.md`](SESSION-HANDOFF-20.7-DASHBOARD-V2.md) — **nie przywracać** rankera Hero  
**Architektura inspektor email:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § 9.2

---

## 3a. P2-F — Tender Qualification Pipeline (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Zakres** | P2-F.0–F.5 · SWZ → profil wykonawcy → dopasowanie → wykaz/referencje/ATH |
| **Wersja końcowa** | **2.51.24** · commit **`e015453`** |
| **Klucz chmury** | `kw-company-profile` — `CompanyQualificationProfile` schema **v4** |
| **Handoff** | [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.5 |
| **Test regresji** | `npx vite-node scripts/test-tender-dossier-pipeline.mjs` (161 PASS) |

**Kluczowe moduły:** `tender-formal-requirements.ts`, `tender-participation-check.ts`, `tender-experience-check.ts`, `company-experience-discovery.ts`, `tender-works-register.ts`, `tender-ath-quick-access.ts`.

**UI:** `TenderBidPrepPanel.tsx`, `TenderParticipationPanel.tsx`, `TenderWorksRegisterPanel.tsx`, `CompanyQualificationProfilePanel.tsx`.

**Nie zmieniaj bez polecenia:** merge `kw-company-profile`, semantyka `referenceStatus`, parsery SWZ, reuse ATH viewer.

---

## 3b. UX.1 — Tender Workspace (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Zakres** | UX.1A reorganizacja sekcji → UX.1B 5 workspace tabs · ARCH-001 · P0 hotfix cykli ESM |
| **Wersja końcowa** | **2.53.4** · commit **`3b5da74`** |
| **Handoff** | [`SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`](SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § UX.1A/1B · § 11.6 ARCH-001 |
| **Test regresji** | `npx vite-node scripts/test-tender-workspace-ux.mjs` (48 PASS) |

**Kluczowe pliki:** `tender-workspace-ux.ts`, `TenderDetailPanel.tsx`, `TenderWorkspaceTabBar.tsx`, `TenderDocumentsWorkspace.tsx`, `TenderQualificationWorkspace.tsx`, `TenderOverviewShortcuts.tsx`.

**5 workspace:** Przegląd · Dokumenty · Kwalifikacja · Wycena · Oferta — **max 5, lazy render, Anti-CC**.

**Nie zmieniaj bez polecenia:** struktura 5 tabs, P0 UX RULE (Przegląd ≤ 1 ekran), dedup UX.1A (wycena/kalibracja/ATH), lazy mount ciężkich paneli.

---

## 3c. P2-H — Tender Documents & Archives (**H.1–H.5B CLOSED**, H.7 OPEN)

| Pole | Wartość |
|------|---------|
| **Wersja końcowa** | **2.55.9** |
| **Handoff** | [`SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md) |
| **Kluczowe pliki** | `pdf-przedmiar-heuristic.ts`, `tender-cost-discovery.ts`, `wgdom-7z-archive.ts`, `tenders-bzp-doc-parse.ts` |

**Stream funkcjonalnie zamknięty.** Pozostały backlog techniczny: **P2-H.7** (Edge magic bytes 7z).

**Audyt referencyjny:** Kąty Wrocławskie — 7Z OK, `*_PR.pdf` wykrywany; P2-H.5B ekstrahuje pozycje KNR z natywnego tekstu PDF.

| Pole | Wartość |
|------|---------|
| **Zakres** | Marketplanet · ZIP · 7Z · PDF przedmiar (discovery + heurystyki KNR) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.7 |
| **Test 7Z** | `npx vite-node scripts/test-tender-7z-archive.mjs` (34 PASS) |
| **Test dossier** | `npx vite-node scripts/test-tender-dossier-pipeline.mjs` (195 PASS) |
| **Test PDF heuristic** | `npx vite-node scripts/test-pdf-przedmiar-heuristic.mjs` (26 PASS) |

**Kluczowe moduły:** `pdf-przedmiar-heuristic.ts`, `wgdom-7z-archive.ts`, `tender-document-resolver.ts`, `tender-cost-discovery.ts`, `tenders-bzp-doc-parse.ts`.

**Następny krok (techniczny):** **P2-H.7** — Edge magic bytes dla `.7z`.

---

## 3d. P3 — Wycena · Baza cen · Filtry (**P3.0–P3.6 CLOSED**)

| Pole | Wartość |
|------|---------|
| **Wersja końcowa** | **2.56.10** (P1 WM) · P3.6 **2.56.9** |
| **Handoff** | [`SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md`](SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.1 · § 12.1.3 · sekcja P3 w § 12.1.5+ |

**Zamknięte sprinty:** P3.1 Hero KPI Wycena · P3.2.0 Baza cen · P3.5 pozycje · P3.5B override · P3.3A–3.3D benchmark rbh · P3.4A historia materiałów · P2-G.3C klasyfikacja prod · **P3.6 filtry strategiczne**.

**Kluczowe moduły:** `wgdom-cost-catalog.ts`, `tender-bid-proposal.ts`, `tender-catalog-line-pricing.ts`, `tender-price-overrides.ts`, `labor-benchmark*.ts`, `material-history.ts`, `tenders-strategic-client-filters.ts`.

**Klucze chmury:** `kw-wgdom-cost-catalog`, `kw-wgdom-cost-catalog-history`, `kw-tender-price-overrides`, `kw-tenders-pipeline`.

**Testy:** `test-tenders-strategic-client-filters.mjs` (52) · `audit-p2g3c-classification-prod.mjs`.

**HOLD:** benchmark materiałów rynku (KB.pl / Leroy Merlin — audyt NO GO live).

**Nie zmieniaj bez polecenia:** benchmarki read-only nie wpływają na kalkulator; P3.6 filtry = UX-only.

---

## 3e. P1 — BZP Pipeline WM false exclude (**CLOSED** v2.56.10)

| Pole | Wartość |
|------|---------|
| **Commit** | **`7acbecf`** |
| **Problem** | `"przebudowa budynku"` mylone z exclude `"budowa budynku"` → score=0 |
| **Fix** | `matchesTenderExcludeKeyword()` w `tenders-bzp-keywords.ts` + `matchesBzpExcludeKeyword()` w Edge |
| **Deploy** | **Vercel + Supabase** — oba wymagane przy zmianie exclude |
| **Test** | `test-tender-exclude-renovation-budowa.mjs` (18 PASS) |
| **Audyt** | `audit-wm-exclude-120d.mjs` — 1 odzyskany aktywny WM (Sępa Szarzyńskiego) |

**Nie zmieniaj bez polecenia:** granica słowa `prze`/`roz`/`nad` + `budowa`; mirror klient↔Edge.

---

## 3f. Notatki operacyjne — P0→P2C+HF (**COMPLETE** v2.58.1)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.58.1** · commit **`1f8e2bd`** |
| **Status streamu** | **COMPLETE** — P0 · P1 · P2A · P2B · P2C · HF |
| **Handoff dedykowany** | [`SESSION-HANDOFF-OPERATIONAL-NOTES.md`](SESSION-HANDOFF-OPERATIONAL-NOTES.md) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) — sekcja Notatki operacyjne · § 15.1 (`operationalnotes`) |

### Timeline faz

| Faza | Wersja | Zakres |
|------|--------|--------|
| **P0** | 2.57.0 | Moduł admin, CRUD, komentarze, archiwum, audit log, sync 4× KV, panel Roboty |
| **P1** | 2.57.2 | ACK, badge menu, banner, read status, `contentRev` |
| **P2B** | 2.57.4 | Widget KPI na Pulpicie |
| **P2C** | 2.57.5 | Audit UI (Sheet, Super Admin) |
| **P2A** | 2.58.0 | Inspektor UI — overlay, header badge, sync w `InspectorPanel` |
| **HF** | 2.58.1 | Backup completeness — export/import/email/snapshot 4 kluczy |

### Klucze chmury (4) — SSOT backup `OPERATIONAL_NOTES_BACKUP_KEYS`

| Klucz | Zawartość |
|-------|-----------|
| `kw-operational-notes` | Tablica `OperationalNote[]` |
| `kw-operational-notes-audit-log` | Audit entries (cap 3000) |
| `kw-operational-notes-read-state` | Read receipts / ACK |
| `kw-operational-notes-deleted-ids` | Tombstone logical delete |

**Osobna domena:** ≠ `job.notes` (uwagi wewnętrzne roboty) ≠ `job.jobNotes[]` (WM / billing).

### Kluczowe pliki

`operational-notes.ts` · `operational-notes-read-state.ts` · `operational-notes-audit.ts` · `operational-notes-audit-filters.ts` · `operational-notes-dashboard.ts` · `OperationalNotesView.tsx` · `OperationalNotesAuditPanel.tsx` · `DashboardOperationalNotesWidget.tsx` · `JobOperationalNotesPanel.tsx` · `InspectorPanel.tsx` · `cloud-sync.ts` · `admin-nav.ts`

### Testy regresji

```bash
npx vite-node scripts/test-operational-notes-p0.mjs
npx vite-node scripts/test-operational-notes-p1.mjs
npx vite-node scripts/test-operational-notes-p2b.mjs
npx vite-node scripts/test-operational-notes-p2c.mjs
npx vite-node scripts/test-operational-notes-p2a.mjs
npx vite-node scripts/test-operational-notes-hotfix-2.58.1.mjs
```

### Następne etapy (OPEN — tylko na polecenie)

| Etap | Zakres |
|------|--------|
| **P3 Export** | PDF + DOCX + Email Export (ręczny; **bez** auto-notify) |
| **P2A.1** | Panel notatek w detalu roboty inspektora (opcjonalny) |

**Nie zmieniaj bez polecenia:** model KV, merge sync, granica od `job.notes` / `jobNotes`, ACL inspektora (create/comment/ACK only), brak zapisu do `kw-jobs`.

---

## 3g. Odbiory WM Druk — P0 (**COMPLETE** v2.59.19)

| Pole | Wartość |
|------|---------|
| **Zakres** | P0 pollution · KV cleanup · runtime hotfix · ZI-PDF-001 (P0.2A demo strip) |
| **Wersja końcowa** | **2.59.19** · commit **`1a8c892`** |
| **Handoff** | [`SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.8 |

**Stan końcowy:**

```text
Template Pollution      CLOSED
KV Cleanup              CLOSED
Runtime Hotfix          CLOSED
ZI-PDF-001              CLOSED
Stream WM DRUK P0       COMPLETE
```

**Test regresji:**

```bash
npx vite-node scripts/test-wm-print-p0-2a-zi-demo-strip.mjs
npx vite-node scripts/test-wm-print-p0-seed-guard.mjs
npx vite-node scripts/test-wm-print-template-cleanup.mjs
```

**Nie zmieniaj bez polecenia:** seed guard, merge po UUID, canonical ZI UUID `26f02c78-…`, strip demo @ y≈142 bez RCA.

---

## 4. DASHBOARD V3 — Pulpit operacyjny (**COMPLETE**, P1-A)

| Element | Wartość |
|---------|---------|
| **Wersja** | 2.50.74 · commit `5a54399` |
| **Cel** | „Co muszę dzisiaj zrobić?” — bez strategii CC na Pulpicie |
| **KPI** | Wypłata · Ekipa dziś · Aktywne WM · **Braki dokumentów** · **Pilne uwagi** |
| **Sekcje** | Roboty → Braki dokumentów · Pilne uwagi na dziś (7 kategorii) · Przetargi — skrót |
| **Liczniki SSOT** | `src/lib/dashboard-urgent-today.ts` · `buildUrgentTodayCategories()` |
| **Usunięte** | Hero stack, `attentionCount`, KPI „Do ogarnięcia”, `RecoverableChargesDashboardCard` |

**Kolejność Pulpicu (V3):** KPI → Braki dokumentów → Pilne uwagi → Przetargi — skrót → dolna siatka.

**Nie zmieniaj bez polecenia:** model liczników V3 (suma kategorii = badge), pełne listy bez `slice`, model scrollu 2.50.20.

**Seria 20.7 (V2) — historyczna:** Hero DZIŚ, dedupe Uwaga — **zamknięta** przez V3.

---

## 5. INSPECTOR COMMUNICATION TEMPLATES — seria 2.1 (**CLOSED**)

### 2.1.0 — MVP (v2.50.69 · `5391d03`) · **PRODUCTION VERIFIED**

| Element | Opis |
|---------|------|
| **UI** | `JobsView` → „Kontakt z inspektorem” → `JobInspectorContactModal.tsx` |
| **Szablony** | A–D w `inspector-message-templates.ts` (auto-sugestia, ready/missing) |
| **Odbiorca** | `EmailContact.isInspector` w `kw-contacts` |
| **Wysyłka** | `POST /send-job-email` · `mode: inspector_template` (Edge) |
| **Historia** | `activityLog` · `email_sent` + nazwa szablonu |
| **Smoke** | `scripts/smoke-test-inspector-templates-2.1.mjs` |

### 2.1.1 — Default Inspector Recipient (v2.50.70 · `ee2cd72`) · **PRODUCTION VERIFIED**

| Element | Opis |
|---------|------|
| **Model** | `EmailContact.isDefaultInspector` (max jeden, wymaga `isInspector`) |
| **Helpery** | `contactIsDefaultInspector`, `resolveDefaultInspectorContact`, `applyDefaultInspectorContact` |
| **Kontakty UI** | Checkbox „Domyślny odbiorca inspektora”, badge Inspektor + Domyślny |
| **Modal UX** | Auto-odbiorca (Szymon lub oznaczony), „Zmień odbiorcę”, hint wysyłki testowej |
| **Edge / Job / sync** | **Bez zmian** |

**Operacyjnie na prod:** oznacz Szymona jako „Domyślny odbiorca inspektora”; usuń duplikaty testowe „Walidacja 2.1” z Kontaktów (dane testowe z walidacji 2.1.0 — nie bug kodu).

### 2.1.2 — Job Correspondence Recipients · **CANCELLED**

| | |
|---|---|
| **Status** | **ANULOWANY — nie implementować** |
| **Powód** | Problem wynikał z danych testowych („Walidacja 2.1”), konfiguracji Kontaktów i chwilowego braku wpisu — **nie z architektury 2.1.0/2.1.1** |
| **Decyzja** | Zostaje: „Kontakt z inspektorem”, filtr `isInspector`, „Domyślny odbiorca inspektora” |

**Brak dalszych prac w obszarze Inspector Communication Templates do czasu nowego AUDIT.**

**Backlog zamknięty (bez polecenia):** szablon E (podziękowanie), CRM/historia konwersacji, 2.1.2 pełna lista kontaktów.

---

## 6. WORKFLOW WGDOM

### Proces pracy

```text
AUDIT → RCA → PLAN → IMPLEMENT
```

**Brak implementacji bez audytu.** Plan odrzucony (np. 2.1.2) = **zero kodu**.

### Release / deploy — SSOT

**[`docs/WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)**

| Wariant | Kroki |
|---------|-------|
| **A** Minor | build → commit → push → verify FAST |
| **B** Standard | build → smoke → commit → push → verify FAST |
| **C** Major | build → smoke → E2E → commit → push → verify FAST |

**Frontend:** tylko `git push origin main` → Vercel Git Integration.

**VERIFY DEPLOY FAST:** po push **jedno** `curl version.json` → PASS lub **DEPLOY PROPAGATING** → koniec raportu.

**Zakazane:** `vercel deploy`, `vercel --prod`, retry/sleep/polling `version.json`, polling GitHub/Vercel Deployments API.

**Werdykty:** **RELEASE GO** (build+smoke+push) ≠ **PRODUCTION VERIFIED** (`version.json` = oczekiwana wersja w jednym curl).

**Backend Edge:** tylko gdy zmiana `supabase/functions/**` → GitHub Action `deploy-supabase.yml`.  
2.1.0 wymagał deploy Edge dla `inspector_template`; **2.1.1 nie wymagał** deploy Supabase.

---

## 7. ARCHITEKTURA (skrót — bez zmian od 20.5Z)

Pełny opis: [`ARCHITECTURE.md`](ARCHITECTURE.md) · fundament platformy: [`PROJECT-HANDOFF-FINAL-20.5Z.md`](PROJECT-HANDOFF-FINAL-20.5Z.md) § 5–9.

| Temat | SSOT / pliki |
|-------|----------------|
| Pliki roboty (3 warstwy) | `jobFiles[]` · `workerReports[]` · `jobAttachments[]` · [`SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) |
| Files Hub | `files-hub-index.ts` · [`SESSION-HANDOFF-20.5A.12-FILES-HUB.md`](SESSION-HANDOFF-20.5A.12-FILES-HUB.md) |
| Sync / merge | `cloud-sync.ts` § 11 · **nie zmieniaj merge bez audytu** |
| Version Awareness | `app-version-check.ts` · E2E `version-awareness.spec.ts` |
| PWA | `sw.template.js` · `generate-service-worker.mjs` |
| Kontakt inspektora § 9.2 | `inspector-message-templates.ts`, `email-contacts.ts`, `JobInspectorContactModal.tsx` |
| **Pulpit V3** | `DashboardView.tsx`, `DashboardPilneUwagiSection.tsx`, `dashboard-urgent-today.ts` |
| Przetargi (strategia + lista + wycena) | `TendersModule` · `SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md` |
| **P2-F Kwalifikacja ofertowa** | `kw-company-profile` · § 12.1.5 · [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md) |
| **Notatki operacyjne P0** | `kw-operational-notes` (+ audit, read-state, tombstone) · § 10.1 · `OperationalNotesView.tsx` |

---

## 8. REPO HOUSEKEEPING (2026-06-11)

**Commit:** `77e1052` — `chore(git): ignore local audit and smoke artifacts`

| Przed | Po |
|-------|-----|
| 49 untracked (diag, smoke-output, UX audit PNG) | 19 untracked (gł. `smoke-prod-bundle-*` historyczne — celowo poza `.gitignore`) |

**Nie commitować:** backupy z hashami adminów, `restore-lista-plac-*.json`, artefakty lokalne (patrz `.gitignore`, ARCHITECTURE § 19).

---

## 9. E2E I TESTY

| Gate | Komenda |
|------|---------|
| Happy path | `npm run build` → preview `:4173` → `PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:happy` |
| Version | `PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:version` |
| Inspector 2.1 | `npx vite-node scripts/smoke-test-inspector-templates-2.1.mjs` |
| **P2-H regresja 7Z** | `npx vite-node scripts/test-tender-7z-archive.mjs` |
| **P3.6 filtry** | `npx vite-node scripts/test-tenders-strategic-client-filters.mjs` (52) |
| **P1 WM exclude** | `npx vite-node scripts/test-tender-exclude-renovation-budowa.mjs` (18) |
| **Notatki operacyjne P0** | `npx vite-node scripts/test-operational-notes-p0.mjs` (24) |
| **P2-G.3C klasyfikacja** | `npx vite-node scripts/audit-p2g3c-classification-prod.mjs` |
| **P2-F regresja** | `npx vite-node scripts/test-tender-dossier-pipeline.mjs` |
| **Dashboard V3** | `npx vite-node scripts/test-dashboard-v3-counts.mjs` |
| Mobile | `npm run test:mobile` |

**Ostatni znany CI E2E:** `#27260457990` (20.5Z.2B) — regresja po 20.7/2.1 lokalnie: build + smoke 2.1 PASS.

---

## 10. KNOWN ISSUES / RYZYKA (aktualne)

| Ryzyko | Uwagi |
|--------|-------|
| Stale LS nadpisuje KV | [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md) · Payroll Guard, admin passwords merge |
| Duplikaty „Walidacja 2.1” na prod | Dane testowe z walidacji biznesowej 2.1.0 — cleanup w Kontaktach |
| Brak domyślnego inspektora przy wielu `isInspector` | Oznacz Szymona „Domyślny odbiorca” w Kontaktach |
| 19 untracked `smoke-prod-bundle-*` | Lokalne historyczne smokes — opcjonalnie commit per release lub delete |

---

## 11. BACKLOG PRODUKTOWY

| Priorytet | Temat | Status |
|-----------|-------|--------|
| **P1** | Dashboard V3 + CC removal + Przetargi 3.0 | **CLOSED** (v2.51.x) |
| **P2-F** | Kwalifikacja ofertowa (F.0–F.5) | **CLOSED** (v2.51.19–2.51.24) |
| **UX.1** | Tender Workspace (UX.1A/1B) | **CLOSED** (v2.53.1–2.53.4) |
| **P2-H** | Dokumenty / ZIP / 7Z / PDF przedmiar | **STREAM CLOSED** (v2.55.0–2.55.10) · H.7 OPEN |
| **P3** | Wycena · Baza cen · benchmarki · filtry | **P3.0–P3.6 CLOSED** · materiały rynkowe **HOLD** |
| **Notatki operacyjne** | P0→P2C+HF admin/inspektor/backup | **COMPLETE** (v2.58.1) · **P3 Export OPEN** |
| **WM Druk P0** | Odbiory WM Druk — pollution + ZI PDF | **COMPLETE** (v2.59.19) |
| **P2** | Audit Center / Security Log (Super Admin) | **OTWARTY** |
| P2-G.3D/E | Benchmark jakości · RMS · AI validation | **OTWARTY** → slot **Wycena** |
| P2-F.6 | Kompletność oferty (checklist) | **OTWARTY** → slot **Oferta** |
| P2-F.6+ | investorName w profilu · auto-pakiet referencji | opcjonalnie, na polecenie |
| P3.7+ | Dalsze usprawnienia listy Przetargów | **OTWARTY** (bez polecenia) |

---

## 12. CO NIE ZMIENIAĆ BEZ POLECENIA

- Sync/merge `kw-contacts`, `kw-jobs`, payroll guard
- Model scrollu desktop 2.50.20, mobile shell
- **Przywracanie Hero / `attentionCount` / KPI „Do ogarnięcia”** — zamknięte przez V3
- Podłączanie CC (forecast, health) do `DashboardView`
- `inspector_template` Edge semantics (2.1.0)
- Seria 20.5Z zamknięta — patrz FINAL handoff
- **2.1.2** — plan odrzucony, nie wracać do pełnej listy kontaktów w modalu
- **P2-F merge/parsery** — `kw-company-profile`, filtry śmieci PDF SWZ, ATH viewer reuse
- **UX.1 workspace model** — max 5 tabs, lazy render, Anti-CC; nie doklejać paneli na scroll
- **ARCH-001** — brak static import cloud-sync w nowych lib w drzewie merge
- **Notatki operacyjne** — nie mieszać z `job.notes` / `job.jobNotes[]`; nie zapisywać do `kw-jobs`; ACL inspektora bez edit/delete

---

## 13. NASTĘPNY KROK (dla agenta)

**Ostatni release (repo):** **v2.59.19 WM Druk P0.2A ZI-PDF-001 CLOSED** — commit **`1a8c892`**.

**Priorytet produktu (WM Druk):** stream **P0 COMPLETE** — P1 regresja Edge ZIP tylko na polecenie.

**Notatki operacyjne — roadmap:**

```text
P0→P2C+HF COMPLETE (v2.58.1) — admin · ACK · widget · audit · inspektor · backup 4× KV
P3 OPEN — PDF + DOCX + Email Export (ręczny, bez auto-notify)
P2A.1 OPEN (opcjonalny) — panel w detalu roboty inspektora
```

```text
WM DRUK P0 COMPLETE (2.59.19) — pollution · KV cleanup · runtime hotfix · ZI-PDF-001 CLOSED
P2-H stream CLOSED (v2.55.10) · P2-H.7 OPEN (Edge magic bytes 7z).
P3.0–P3.6 CLOSED · P1 WM false exclude CLOSED (v2.56.10).
Notatki operacyjne COMPLETE (v2.58.1).
UX.1 CLOSED · P2-F CLOSED · P1 CLOSED.
Backlog techniczny (na polecenie): P2-G.3D/E · P2-F.6 · P2 Audit Center · Notatki P3 Export · WM Druk P1 regresja.
Benchmark materiałów rynku HOLD · Leroy/Castorama/OBI/KB scraping — NO GO.
Inspector 2.1 — CLOSED (2.1.2 CANCELLED).
```

Przy wznowieniu:

1. Przeczytaj **ten plik** + [`SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md) + `CURRENT-TASK.md`
2. `curl -s https://www.wgdom.fun/version.json` — prod **2.59.19**
3. Przed zmianami Notatki: testy z handoffu operacyjnego (P0–HF)
4. Przed zmianami Przetargów: `test-tenders-strategic-client-filters.mjs` + `test-tender-exclude-renovation-budowa.mjs`
5. Przed zmianami ZIP/7Z: `test-tender-7z-archive.mjs`
6. Przed release dossier: `test-tender-dossier-pipeline.mjs`
7. Stosuj workflow **B** (functional UI) — [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)
8. Hasło **„kontynuuj WGDOM”** → `.cursor/rules/wgdom-stan-projektu.mdc`

---

## 14. MAPA HANDOFFÓW (referencje)

| Temat | Dokument |
|-------|----------|
| **★ WM Druk P0 (COMPLETE)** | `SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md` |
| **★ Notatki operacyjne (COMPLETE)** | `SESSION-HANDOFF-OPERATIONAL-NOTES.md` |
| **★ P3 Wycena · BZP · filtry** | `SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md` |
| **★ P2-H Dokumenty / 7Z / Marketplanet** | `SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md` |
| **★ UX.1 Tender Workspace** | `SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md` |
| **★ P2-F Kwalifikacja ofertowa** | `SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md` |
| **★ Baseline prod (TEN)** | `PROJECT-HANDOFF-CURRENT.md` |
| **★ Pulpit V3 (SSOT)** | `SESSION-HANDOFF-DASHBOARD-V3.md` |
| Platform 20.5Z (architektura) | `PROJECT-HANDOFF-FINAL-20.5Z.md` |
| Dashboard V2 (historyczny) | `SESSION-HANDOFF-20.7-DASHBOARD-V2.md` |
| Inspector 2.1 § 9.2 | `ARCHITECTURE.md` |
| Workflow release | `WORKFLOW-RELEASE-DEPLOY.md` |
| Backup pre-feature | `SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md` |
| Billing / Roboty 20.5A | `SESSION-HANDOFF-20.5A-BILLING-JOBS.md` |
| Files Hub | `SESSION-HANDOFF-20.5A.12-FILES-HUB.md` |
| CC historyczny | `docs/archive/command-center/` (**SUPERSEDED**) |

| Legacy PROJECT-HANDOFF | `PROJECT-HANDOFF.md` (częściowo nieaktualny baseline — używaj CURRENT) |

---

**Werdykt closeout (2026-06-15 — WM Druk P0):**

```text
BASELINE v2.59.19 · WM DRUK P0 COMPLETE
COMMIT 1a8c892 · RELEASE GO · PRODUCTION VERIFIED
Template Pollution CLOSED · KV Cleanup CLOSED · Runtime Hotfix CLOSED · ZI-PDF-001 CLOSED
Open backlog (na polecenie): WM Druk P1 regresja · P3 Export notatki · P2-H.7 · P2-G.3D/E · P2-F.6
Ready for new GPT / new Cursor agent
```

**Werdykt closeout (2026-06-14 — Notatki):**

```text
BASELINE v2.58.1 · Notatki operacyjne COMPLETE (P0→P2C+HF)
COMMIT 1f8e2bd · RELEASE GO
P3 Export OPEN (tylko na polecenie)
Moduł Przetargi: PRODUCTION READY
P3.0–P3.6 CLOSED · P1 WM CLOSED · P2-H stream CLOSED (H.7 OPEN)
UX.1 CLOSED · P2-F CLOSED · P1 CLOSED · Inspector 2.1 CLOSED
Open backlog (na polecenie): P3 Export notatki · P2-H.7 · P2-G.3D/E · P2-F.6 · P2 Audit Center
Ready for new GPT / new Cursor agent
```
