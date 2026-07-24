# 01 — AI Onboarding (WGDOM)

> **ID:** WGDOM-AI-KNOWLEDGEBASE-01 / 01  
> **Dla:** Cursor Agents, ChatGPT, nowe AI bez historii projektu  
> **Następny:** [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md) (przeczytaj **przed** kodem) · Index: [`README.md`](README.md)

---

## 1. Cel projektu

**W&G DOM** (`https://www.wgdom.fun`) — monolit operacyjny firmy remontowej (Wrocław):

| Obszar | Co robi |
|--------|---------|
| **Lista Płac** | Godziny, tygodnie, archiwum, sync między urządzeniami — **priorytet produkcyjny #1** |
| **Roboty** | Joby, zdjęcia, dokumenty, przypisania, Inspektor WM |
| **Przetargi** | Pipeline BZP → discovery → heavy dossier → wycena → Autonomous Gate |
| **WM Druk** | Odbiory ZI Tauron, pomiary elektryczne, schematy |
| **Pulpit / Grafik / Notatki / Audit Hub** | Operacje dzienne, uprawnienia, audyt read-only |

Role: **Admin** (Dawid / Stanisław / Pawel), **Inspektor** (Szymon), **Pracownik** (telefon + PIN).

---

## 2. Historia (skrót)

| Era | Co |
|-----|-----|
| 20.x / 2.50.x | Billing, Roboty, Files Hub, PWA, stabilizacja platformy |
| 2.51–2.59 | Przetargi 3.0, WM Druk / ZI 2026, Notatki, Pomiary |
| 2.62–2.63 | Workflow V4, TEUX, NG-02…NG-10, Payroll Domain Push, Mobile Recovery |
| 2.64–2.65 | NG11 pipeline performance, Jobs/Photos sync, Payroll fence/rollover, Theme-01 |
| **2026-07-23/24** | **Incident 23.07** — Sync Storm → CF 522 / DB stress → fix **TENDERS-SYNC-STORM-P0** (**2.65.38**) + cleanup diag (**2.65.39**) |

Szczegóły: [`04_INCIDENTS_HISTORY.md`](04_INCIDENTS_HISTORY.md).

---

## 3. Stack

| Warstwa | Technologia |
|---------|-------------|
| Frontend | **React + Vite + TypeScript** (to **nie** jest Next.js) |
| UI | Tailwind · Radix · theme (`WgdomThemeProvider`) |
| Deploy FE | **Vercel** Git Integration (`push origin main`) |
| Backend | **Supabase** Edge Function `make-server-0afb8820` + KV + Storage |
| Sync | `src/lib/cloud-sync.ts` — LocalStorage ↔ KV (`batch-get` / `batch-set`) |
| Mobile | PWA + Capacitor (Android/iOS) |
| Testy | `vite-node` scripts · Playwright · `npm run test:infra` |

**Projekt Supabase:** `bdpygdvfgbggermvqtys`.

---

## 4. Jak uruchomić

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build
```

Env (lokalnie `.env`, na Vercel secrets): `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_ANON_KEY`.  
Service role / Owner pass — tylko lokalnie / Owner; **nie** commitować.

---

## 5. Jak wygląda repo

```text
AGENTS.md                 ← jak pracować
PROJECT-GUIDE.md          ← jak działa + Known Issues
CURRENT-TASK.md           ← status sesji
src/app/                  ← UI (App.tsx = monolit shell — NIE czytaj od zera)
src/lib/                  ← logika domenowa (sync, payroll, tenders, …)
supabase/functions/       ← Edge (osobny deploy Action)
docs/                     ← handoffy, RCA, DF, closeouty
docs/AI/                  ← TA baza wiedzy dla AI
docs/architecture/        ← Design Freeze, RCA, Production Verification
scripts/                  ← smoke / harness vite-node
```

**Nie analizuj `App.tsx` linia po linii** — użyj [`docs/AGENT-APP-MAP.md`](../AGENT-APP-MAP.md).

---

## 6. Najważniejsze moduły

| Moduł | Wejście |
|-------|---------|
| Cloud Sync | `src/lib/cloud-sync.ts` · `CloudLoader.tsx` |
| Payroll | `PayrollView.tsx` · `payroll-*` · PWRB · resurrection fence |
| Jobs | `JobsView.tsx` · merge photos / tombstones |
| Tenders | `TendersModule` · `useTenderPipelineRuntime` · heavy lazy |
| Work Catalog | `src/lib/work-catalog/` |
| WM Print | `WmPrintView.tsx` · `src/lib/wm-print/` |
| Auth | `admin-auth.ts` · panele worker/inspector |

Pełny przewodnik: [`05_MODULE_GUIDE.md`](05_MODULE_GUIDE.md).

---

## 7. Architektura (1 obraz)

```text
Browser PWA
  → React views / hooks
  → LocalStorage (working copy)
  ↔ cloud-sync (merge + persistKey / Domain Push)
  → Edge make-server-0afb8820 (batch-get/set, upload)
  → Supabase KV + Storage (+ Postgres via PostgREST dla KV store)
```

Szczegóły: [`02_ARCHITECTURE.md`](02_ARCHITECTURE.md).

---

## 8. Produkcja (baseline skrót)

| Pole | Wartość (2026-07-24) |
|------|----------------------|
| URL | https://www.wgdom.fun |
| UI tip (changelog) | **2.65.40** |
| Feature commit | **`23d7723`** |
| Docs tip | **`96d44d0`** |
| Status | **PRODUCTION VERIFIED · GREEN** |
| HARDENING-01A | **CLOSED** (Persist SSOT) |
| HARDENING-01D | **CLOSED** (546 monitor · D-V3 DEFER · M-EDGE-546 MONITOR) |
| Sync Storm fix | **2.65.38** |
| Final audit Sync Storm | **PRODUCTION READY** (klasa 23.07) |
| STABILIZATION WINDOW | **ACTIVE** — brak nowych epiców bez Owner GO |

Aktualny stan: [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md).

---

## 9. Cloud Sync (intuicja)

1. Bootstrap: `CloudLoader` fetch KV → merge → (payroll: **resurrection fence**) → mount App.  
2. Runtime: mutacje → LS → `persistKey` / Domain Push / coalesce.  
3. **Nigdy** trwałe dane tylko w React state.  
4. Partial push **musi** iść przez `prepareKeysForCloudPush`.  
5. Payroll shrink → **Payroll Guard**.  

Guide: [`docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md).

---

## 10. Release (skrót)

```text
AUDIT → PLAN → DESIGN FREEZE → ARCH REVIEW → Owner GO → IMPLEMENT
→ TEST / smoke → Owner Verification → COMMIT → PUSH → PRODUCTION VERIFY FAST → POST → CLOSE
```

- Frontend: **tylko** `git push origin main` (nie `vercel deploy`).  
- VERIFY: **jedno** `curl https://www.wgdom.fun/version.json` — bez pollingu.  
- Wersja UI: `src/app/changelog-data.ts` → `CHANGELOG[0].version`.

Pełny proces: [`06_RELEASE_PROCESS.md`](06_RELEASE_PROCESS.md).

---

## 11. Owner Verification vs Production Verification

| Pojęcie | Znaczenie |
|---------|-----------|
| **Owner Verification (OV)** | Checklist Ownera / harness po implementacji: scenariusz domenowy (np. MOPS, dual-session payroll) — często lokalny + częściowo live |
| **Production Verification** | Prod: `version.json` = bump + smoke na `www.wgdom.fun` + (dla CORE) gate payroll/jobs |
| **RELEASE GO** | build + smoke + commit + push PASS — **nie** wymaga czekania na Vercel |
| **PRODUCTION VERIFIED** | Jedno sprawdzenie `version.json` = oczekiwana wersja |

---

## 12. Od czego zacząć pracę (nowe AI)

```text
1. docs/AI/README.md              ← INDEX
2. docs/AI/08_AI_GUARDRAILS.md    ← zakazy
3. docs/AI/09_PRODUCTION_BASELINE.md
4. CURRENT-TASK.md
5. docs/AGENT-CONTINUITY-GUIDE.md §0
6. Tematycznie: Payroll Guide / WORKFLOW-ARCHITECTURE / Sync Storm RCA
```

**Hasło Ownera „kontynuuj WGDOM”** → czytać też `.cursor/rules/wgdom-stan-projektu.mdc`.

**Nie implementuj** bez jawnego polecenia Ownera (szczególnie CORE / Payroll / Sync / Edge / Pipeline).
