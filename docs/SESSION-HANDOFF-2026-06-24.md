# SESSION HANDOFF — 2026-06-24 (Audit Hub MVP-1 · TP200C · P0 cloud-sync)

> **Status sesji:** **CLOSED** (hotfix prod **2.62.42** zweryfikowany)  
> **Prod baseline:** **v2.62.48** · commit **`5cef155`** (dokumentacja zaktualizowana 2026-06-24)  
> **WM Druk follow-up:** [`SESSION-HANDOFF-WM-ZI-TP203-P4-2026-06-24.md`](SESSION-HANDOFF-WM-ZI-TP203-P4-2026-06-24.md) — ZI §4/§5 · TP203 · P4  
> **Hasło sesji:** „kontynuuj WGDOM”  
> **SSOT projektu:** [`PROJECT-HANDOFF-CURRENT.md`](PROJECT-HANDOFF-CURRENT.md)  
> **Mapa systemu:** [`AGENT-ONBOARDING.md`](AGENT-ONBOARDING.md)

---

## 1. Co zrobiliśmy (chronologia)

| Wersja | Commit | Temat | Status |
|--------|--------|-------|--------|
| **2.62.39** | `2b8980c` | **Audit Hub MVP-1** — `kw-security-audit-log`, 6. źródło Hub, hooki AUTH/PERMISSIONS/DATA | **CLOSED** · ⚠️ regresja importu (patrz §4) |
| **2.62.40** | `0d5b916` | **TP200C** — sync merge fidelity kosztorysu (`pickBetterKosztorys` SSOT, bez stale override) | **CLOSED** |
| **2.62.41** | `656a00c` | **Audit Hub MVP-1B** — RECOVERY restore + DATA import/directory_delete w security log | **CLOSED** |
| — | — | **ATH vs Strong PDF borderline AUDIT** — próg 5% (`STRONG_PDF_VS_ATH_ROW_MARGIN`) | **NO-GO** na zmianę progu |
| **2.62.42** | `d799033` | **P0 hotfix** — przywrócony import `mergeDeliveryPackagePublications` w `cloud-sync.ts` | **CLOSED** · **PRODUCTION VERIFIED** |

### Szczegóły kluczowych zmian

**TP200C (`tender-dossier-merge.ts`):**
- Usunięty `staleA/staleB` override wymuszający „świeżą” stronę kosztorysu.
- `kosztorys` = wyłącznie `pickBetterKosztorys()`.
- `winningDossier` napędza `scanSummary` + `parserVersion`.
- Test: `scripts/test-tp200c-sync-merge-fidelity.mjs` (17/17 PASS).

**Audit Hub MVP-1B (`security-audit-log.ts`, `App.tsx`, `DirectoryView.tsx`):**
- Kategoria `RECOVERY`: `restore_backup_*`.
- Kategoria `DATA`: `data_import_*`, `directory_delete`.
- Wszystko w istniejącym źródle `security_log` (bez nowego adaptera Hub).

**P0 cloud-sync (2.62.42):**
- **Symptom:** po odświeżeniu Pulpitu toast „Nie udało się wysłać do chmury” + `ReferenceError: mergeDeliveryPackagePublications is not defined`.
- **RCA:** commit `2b8980c` zastąpił import delivery-package importem Security Audit Log; `case "kw-delivery-package-publications"` w `mergeDataKey` pozostał.
- **Fix:** 1 linia importu w `cloud-sync.ts` — bez zmian logiki merge.

---

## 2. Co będziemy robić (backlog — tylko na polecenie)

| Priorytet | ID | Opis | SSOT |
|-----------|-----|------|------|
| **P1** | **TP200B** | Kosztorys fidelity — ATH `rows` cap, `pickBetterKosztorys` w parse loop | [`SESSION-HANDOFF-TP200-PLANNED.md`](SESSION-HANDOFF-TP200-PLANNED.md) |
| P1 | **Audit Hub MVP-1C** | Sync logging, eksport feedu, alerty | [`SESSION-HANDOFF-AUDIT-HUB.md`](SESSION-HANDOFF-AUDIT-HUB.md) §8 |
| P2 | **Audit Hub MVP-0C** | Eksport CSV/PDF unified feed | j.w. |
| P2 | P3 notatki export | Operational Notes P3 | [`SESSION-HANDOFF-OPERATIONAL-NOTES.md`](SESSION-HANDOFF-OPERATIONAL-NOTES.md) |
| P2 | P2-H.7 | Edge 7z magic bytes | [`SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md) |
| HOLD | ATH threshold | Zmiana `STRONG_PDF_VS_ATH_ROW_MARGIN` — dopiero po fixture hybrid ZIP | audyt borderline 2026-06-24 |

**Nie planowane:** Command Center (usunięty v2.51.0).

---

## 3. Architektura W&G DOM — skrót dla programistów

### 3.1 Czym jest aplikacja

**W&G DOM** — monolit **React + Vite + TypeScript** (PWA) dla firmy remontowej:

| Warstwa | Ścieżka | Rola |
|---------|---------|------|
| **Shell / routing** | `src/app/App.tsx` | Admin vs worker, auto-sync, stan globalny |
| **Widoki** | `src/app/*View.tsx` | Duże panele UI (Jobs, Payroll, Tenders, …) |
| **Moduł Przetargi** | `src/app/tenders/` | `TendersModule`, `TendersProvider` |
| **Logika domenowa** | `src/lib/*` | Sync, jobs, payroll, tenders, WM Druk, EM, … |
| **Konfig** | `src/config/` | Supabase project / anon key |
| **Backend** | `supabase/functions/make-server-0afb8820` | KV, storage, email, BZP proxy |
| **Dokumentacja** | `docs/` | Handoffy, ARCHITECTURE, workflow |
| **Testy smoke** | `scripts/*.mjs` | `npx vite-node scripts/...` |

**Dane trwałe:** LocalStorage ↔ merge ↔ **Supabase KV** (`src/lib/cloud-sync.ts`).  
**Pliki:** Supabase Storage przez Edge Function.  
**Deploy frontend:** `git push origin main` → Vercel (bez `vercel deploy`).  
**Wersja UI SSOT:** `CHANGELOG[0].version` w `src/app/changelog-data.ts` → build generuje `dist/version.json`.

### 3.2 Diagram wysokiego poziomu

```text
┌──────────────────────────────────────────────────────────────┐
│  Browser (PWA) · Vite · lazy chunks per widok                │
├──────────────────────────────────────────────────────────────┤
│  App.tsx ── AdminViewRouter ── *View.tsx                     │
│  CloudLoader (bootstrap CORE → ready → DEFERRED w tle)       │
├──────────────────────────────────────────────────────────────┤
│  src/lib/  jobs · payroll · tenders · wm-print · em · …      │
├──────────────────────────────────────────────────────────────┤
│  LocalStorage  ←mergeDataKey→  Supabase KV (DATA_KEYS)       │
│  Storage upload  ←→  Edge make-server-0afb8820               │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Główne domeny produktu (menu admina)

```text
Pulpit (dashboard)          — operacje, skróty, widgety
Lista Płac (payroll)        — tygodnie, wypłaty, przydziały robót
Grafik (schedule)           — harmonogram
Roboty (jobs)               — CRUD robót, dokumenty, WM, inspektor
Notatki operacyjne          — shared z inspektorem, ACK, audit
Audit Hub (audit)           — Super Admin · 6 źródeł logów (read-only)
Do rozliczenia              — recoverable charges
Przetargi (tenders)         — pipeline BZP, kosztorys, wycena, strategia
Odbiory WM Druk (wmprint)   — ZI Tauron 2026, pomiary elektryczne, ZIP
Inspektor (inspector)       — feed admina
Zmiany / Instrukcja (guide) — changelog + help
```

Pełna tabela widoków: **ARCHITECTURE.md § 15.1**.

### 3.4 Role użytkowników

| Rola | Login | Dostęp |
|------|-------|--------|
| **Admin** | hasło admin | Pełny panel (zależnie od `admin-auth`) |
| **Super Admin** | Dawid | + Audit Hub, ustawienia użytkowników |
| **Inspektor terenowy** | osobny login | `InspectorPanel` — roboty WM, dokumenty, publikacje odbiorowe |
| **Pracownik** | telefon + PIN | roboty, grafik, zdjęcia |

### 3.5 Sync — reguły krytyczne (`cloud-sync.ts`)

| Zasada | Szczegół |
|--------|----------|
| **DATA_KEYS** | Każdy nowy typ danych biznesowych → klucz + `mergeDataKey` case + **import merge helpera** |
| **AUX keys** | Np. `SECURITY_AUDIT_LOG_KEY`, tombstones — osobne pull/push, nie zawsze w `DATA_KEYS` |
| **Merge** | `mergeAllDataKeys` → `mergeDataKey(key, local, cloud)` — semantyka per klucz |
| **Auto sync** | `App.tsx` `runCloudSync` — pull+merge → push; błąd = toast „Nie udało się wysłać do chmury” |
| **Payroll Guard** | Blokuje push gdy lista płac kurczy się >50% |
| **Bootstrap** | `CloudLoader.tsx` — CORE keys przed `ready`, reszta w tle |

**Incydent 2.62.39→2.62.42:** przy dodawaniu importu Security Log **nie usuwać** istniejących importów merge — `mergeDataKey` woła funkcje z modułów feature; brak importu = `ReferenceError` przy każdym pełnym bundle merge (w tym `kw-delivery-package-publications`).

Pełna sekcja: **ARCHITECTURE.md § 11**.

### 3.6 Moduły — gdzie szukać SSOT

| Moduł | Handoff | Kluczowe pliki |
|-------|---------|----------------|
| **Audit Hub** | [`SESSION-HANDOFF-AUDIT-HUB.md`](SESSION-HANDOFF-AUDIT-HUB.md) | `src/lib/audit-hub/*`, `AuditHubView.tsx` |
| **Przetargi / kosztorys** | [`SESSION-HANDOFF-TP190-PARSER-V3.md`](SESSION-HANDOFF-TP190-PARSER-V3.md) | `tender-dossier-merge.ts`, `tenders-sync.ts` |
| **WM Druk / ZI** | [`ZI-2026-HANDOFF.md`](ZI-2026-HANDOFF.md) | `src/lib/wm-print/*` |
| **Pomiary EM** | [`SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md`](SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md) | `src/lib/electrical-measurements/*` |
| **Notatki** | [`SESSION-HANDOFF-OPERATIONAL-NOTES.md`](SESSION-HANDOFF-OPERATIONAL-NOTES.md) | `operational-notes*.ts` |
| **Delivery Package** | INSPECTOR-P1A/B raporty w `audit/` | `delivery-package-publications/*` |
| **Lista Płac** | [`SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md) | `PayrollView.tsx`, `payroll-job-assignments.ts` |

---

## 4. Pułapka P0 — cloud-sync import (nie powtarzać)

```text
2b8980c (2.62.39) — dodano security-audit-log import
                  — USUNIĘTO mergeDeliveryPackagePublications import
                  — case kw-delivery-package-publications ZOSTAŁ
                  → ReferenceError przy runCloudSync / pullAndMergeDataBundle

d799033 (2.62.42) — przywrócono import (1 linia)
```

**Checklist przy zmianie nagłówka `cloud-sync.ts`:**
1. Grep `mergeDataKey` → każda wywoływana funkcja ma `import` na górze pliku.
2. Smoke: `mergeDataKey("kw-delivery-package-publications", [], [])` nie rzuca.
3. Testy delivery package: `test-delivery-package-publications-p1a.mjs`, `test-inspector-delivery-package-p1b.mjs`.

---

## 5. Workflow deweloperski (skrót)

```text
AUDIT (read-only) → PLAN → IMPLEMENT → TESTY (vite-node) → BUILD
→ CHANGELOG (jeśli release) → COMMIT → PUSH → curl version.json (1×) → RAPORT
```

- **Release frontend:** tylko `git push origin main`.
- **Commit docs-only:** bez bumpu wersji UI (chyba że user prosi).
- **Nie commitować:** `scripts/_tmp*`, `audit/*.pdf`, artefakty lokalne.

Szczegóły: [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) · [`AGENTS.md`](../AGENTS.md).

---

## 6. Szybkie komendy (sesja 2026-06-24)

```bash
npm run build
npx vite-node scripts/test-tp200c-sync-merge-fidelity.mjs
npx vite-node scripts/test-security-audit-log.mjs
npx vite-node scripts/test-audit-hub-adapters.mjs
npx vite-node scripts/test-delivery-package-publications-p1a.mjs
curl -s https://www.wgdom.fun/version.json   # oczekiwane: 2.62.42 / d799033
```

---

## 7. Kolejność czytania dla nowej sesji

```text
1. docs/SESSION-HANDOFF-2026-06-24.md     ← TEN PLIK (ostatnia sesja)
2. docs/AGENT-ONBOARDING.md               ← mapa systemu
3. docs/PROJECT-HANDOFF-CURRENT.md        ← baseline prod + epiki
4. CURRENT-TASK.md                        ← status bieżący
5. docs/ARCHITECTURE.md                   ← pełna architektura (§11 sync, §15 widoki)
6. AGENTS.md                              ← zasady pracy
7. Handoff tematyczny wg zadania (Audit Hub, TP200, ZI, …)
```

---

*Ostatnia aktualizacja: 2026-06-24 · prod **2.62.42** (`d799033`)*
