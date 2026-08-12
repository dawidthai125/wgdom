# EDGE-BATCH-SET-500-01 — OWNER VERIFICATION REPORT

> **★★ SUPERSEDED (2026-08-12):** epik naprawczy **CLOSED / PRODUCTION VERIFIED · GREEN** —  
> [`CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-CLOSEOUT.md`](./CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-CLOSEOUT.md) ·  
> [`CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-PRODUCTION-VERIFY.md`](./CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-PRODUCTION-VERIFY.md) ·  
> release Edge **`914c0095`** · GH Actions **`31635032340`**.  
> Poniższy raport = **historyczny FAIL** (2026-07-23) — zachowany jako evidence; **nie** traktuj jako aktualny stan prod.

> **Status:** **OWNER VERIFICATION COMPLETE** · **DECISION: FAIL** *(historyczny)*  
> **Data:** 2026-07-23T13:11Z (UTC)  
> **Incident:** EDGE-BATCH-SET-500-01  
> **Baseline tip:** `ef882d3` · UI prod **2.65.35**  
> **Commit / push:** **NIE** *(ówczesny etap)*

```text
══════════════════════════════════════
OWNER VERIFICATION COMPLETE

DECISION: FAIL

Powody:
  1) Deploy Edge — BLOCKED (brak SUPABASE_ACCESS_TOKEN lokalnie)
  2) Smoke prod — FAIL (batch-get i batch-set ≈20s → HTTP 500)
  3) Fix V-PERF Edge NIE jest na produkcji (tylko WT lokalny)

Następny krok NIE jest COMMIT — najpierw deploy + platforma KV.
══════════════════════════════════════
```

---

## 1. Deploy Edge Function

| Pole | Wynik |
|------|--------|
| Komenda | `npx supabase functions deploy make-server-0afb8820 --project-ref bdpygdvfgbggermvqtys --use-api` |
| Wynik | **FAIL / BLOCKED** |
| Przyczyna | `Access token not provided` — brak `SUPABASE_ACCESS_TOKEN` w env / `supabase login` |
| GitHub Actions secret | **ISTNIEJE** (`SUPABASE_ACCESS_TOKEN` w repo secrets) — ale **nieczytelny** z agenta |
| Kod fix na `origin/main` | **NIE** — tylko lokalny WT (`index.tsx`, `kv_store.tsx`, `kv-mset-chunk.ts` untracked/modified) |
| Workflow `Deploy Supabase Edge Functions` | **NIE uruchamiany** — wypchnąłby **stary** kod z `main` bez chunkingu |

**Wniosek:** poprawka Edge **nie została wdrożona**. Weryfikacja „po deployu” = **niemożliwa**.

### Jak Owner odblokuje deploy (bez tego COMMIT nie ma sensu dla Edge)

**Opcja A — lokalnie (zalecane przed COMMIT):**
```powershell
$env:SUPABASE_ACCESS_TOKEN = "<token z supabase.com/dashboard/account/tokens>"
npx supabase functions deploy make-server-0afb8820 --project-ref bdpygdvfgbggermvqtys --use-api
```

**Opcja B — po COMMIT+PUSH:** GitHub Actions auto-deploy przy zmianie `supabase/functions/**` (wymaga GO COMMIT/PUSH — **poza** tym etapem).

---

## 2. Smoke synchronizacji (prod — **aktualny** Edge, bez fix)

Skrypt: `scripts/smoke-edge-batch-set-500-01-owner-verification.mjs`  
Base: `https://bdpygdvfgbggermvqtys.supabase.co/functions/v1/make-server-0afb8820`

| Test | HTTP | Czas | Wynik |
|------|------|------|--------|
| `GET /health` | **200** | **559 ms** | **PASS** |
| `POST /batch-get` small (`kw-app-settings`, `kw-contacts`) | **500** | **20 073 ms** | **FAIL** |
| `POST /batch-set` small (re-push) | **500** | **19 708 ms** | **FAIL** |
| `POST /batch-get` `kw-tenders-pipeline` | **500** | **19 583 ms** | **FAIL** |
| `POST /batch-set` pipeline | **500** | **19 748 ms** | **FAIL** |
| `POST /batch-set` RS subset (4 keys) | **500** | **19 818 ms** | **FAIL** |
| `POST /batch-get` payroll week range | **500** | **19 551 ms** | **FAIL** |

**Smoke score:** **1 PASS / 17 FAIL**

### requestId (z body 500)

| Operacja | requestId |
|----------|-----------|
| batch-set small | `77f23e1b-5729-45fb-a224-dd87dd16ea20` |
| batch-set pipeline | `c355c080-c8ab-4ee4-9c1f-294500909617` |
| batch-set RS | `2081c4c4-1cfe-45b0-8658-5f56856fc46a` |

Body przykład:
```json
{"ok":false,"error":"","requestId":"c355c080-c8ab-4ee4-9c1f-294500909617"}
```
(`error` **pusty string** — Owner: Edge Logs po `requestId`)

### Interpretacja względem RCA

| Obserwacja | Wniosek |
|------------|---------|
| Health OK, KV paths ~20 s → 500 | **H2 SUPPORTED / CONFIRMED** (platform / PostgREST / origin ~20 s) — nie tylko fat `mset` |
| Fail także na **batch-get** małych kluczy | Problem **szerszy niż** sam chunked `mset` (H1) |
| Fix chunking **nie wdrożony** | Smoke **nie** weryfikuje IMPLEMENT |

---

## 3. Przetargi / zapis / sync (UI)

| Check | Wynik |
|-------|--------|
| Wejście w Przetargi (live Chrome) | **NIE wykonane** w tej sesji (brak browser E2E; API sync już FAIL) |
| Zapis + cloud sync | **Zablokowane** przez prod `batch-set` 500 |

---

## 4. Regresja (lokalne / unit — kod WT)

| Suite | Wynik |
|-------|--------|
| `test-edge-batch-set-500-01-mset-chunk.mjs` | **21 PASS** |
| `test-edge-opt-a-batch-get.mjs` | **12 PASS** |
| `test-payroll-edge-parity-b6.mjs` | **10 PASS** |
| `test-localstorage-arch-02f-p0-perf.mjs` | **30 PASS** |

| Obszar prod API | Wynik |
|-----------------|--------|
| batch-get | **FAIL** (~20 s / 500) |
| batch-set | **FAIL** (~20 s / 500) |
| Payroll KV read (week range) | **FAIL** (batch-get 500) |
| Cloud Sync path | **FAIL** |
| Dashboard-dependent sync | **FAIL** (ten sam Edge) |
| Health | **PASS** |

---

## 5. Decyzja

```text
DECISION: FAIL
```

| Kryterium Ownera | Status |
|------------------|--------|
| Deploy Edge | **FAIL** (blocked) |
| batch-set → 200 | **FAIL** |
| brak HTTP 500 | **FAIL** |
| brak timeout ~20 s | **FAIL** (~19.5–20.1 s) |
| sync / Przetargi | **FAIL** / niezweryfikowane UI |
| brak regresji batch-get | **FAIL** |

**NIE przechodzimy do OWNER GO → COMMIT** na podstawie tej weryfikacji.

---

## 6. Wymagane działania Ownera (kolejność)

1. **Platforma:** Dashboard → Edge Logs → filtr `77f23e1b` / `c355c080` / `batch-set FAILED` / `batch-get` — ustal `error` (pusty w HTTP body).  
2. **Sprawdź** Unified Logs / `kv_store_0afb8820` (historyczne GET **522**).  
3. **Ustaw** lokalnie `SUPABASE_ACCESS_TOKEN` **albo** wykonaj ręczny Dashboard deploy plików WT (w tym **nowy** `kv-mset-chunk.ts`).  
4. **Ponów** smoke:  
   `npx vite-node scripts/smoke-edge-batch-set-500-01-owner-verification.mjs`  
5. Dopiero przy smoke **PASS** → **OWNER GO → COMMIT** (Edge + ewentualnie powiązane docs).

---

## 7. Zakazy (ten etap)

- ❌ Commit  
- ❌ Push  

---

## 8. Następny krok

```text
OWNER VERIFICATION COMPLETE · FAIL

Czekam na: Owner (token/deploy + platforma KV) → re-run VERIFICATION
NIE czekam na OWNER GO → COMMIT (gate FAIL).
```
