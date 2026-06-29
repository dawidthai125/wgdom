# P0 — Cloud Sync + Egress Audit Report

**Data:** 2026-06-29 · **Status:** AUDIT COMPLETE · FIX OPEN  
**SSOT techniczny:** [`docs/SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md`](../docs/SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md)

---

## Executive summary

1. Toast **„Failed to fetch”** przy sync = Supabase projekt **`bdpygdvfgbggermvqtys`** zablokowany (**`exceed_egress_quota`**, HTTP 402 na bramce).
2. W przeglądarce brak statusu HTTP (`net::ERR_FAILED`); w Node/curl widać 402 + JSON.
3. Główny generator egress (code model): **wielokrotne pełne `batch-get`** (`runCloudSync` + `pullFromCloudAndMerge` na focus).
4. „Zapisz tydzień” triggeruje pełny auto-sync bundle — nie bezpośredni `persistKey`.
5. **Najpierw:** odblokować billing Supabase. **Potem (na polecenie):** refactor sync (delta / throttle).

---

## Fazy audytu

| Faza | Zakres | Wynik |
|------|--------|-------|
| **P0-A** | Ścieżka kodu UI → batch-set | Awaria na `fetch batch-set`; `persistKey` nie na ścieżce save week |
| **P0-B** | Runtime HTTP + Playwright z wgdom.fun | 402 quota; browser `Failed to fetch` |
| **P0-C** | Model egress per endpoint | `batch-get` dominuje; pełny bundle co sync |

---

## TOP 10 egress (szac. %)

1. `runCloudSync` batch-get — 35–45%  
2. `pullFromCloudAndMerge` focus — 25–35%  
3. `kw-archive` volume — 10–15%  
4. `kw-jobs` volume — 8–12%  
5. Przetargi zip/document bytes — 5–15%  
6. Inspektor poll — 3–8%  
7. BZP search — 2–5%  
8. CloudLoader bootstrap — 2–4%  
9. kosztorys-preview — 1–5%  
10. send-backup-email — <2% egress OUT  

---

## Następne kroki

| Kto | Akcja |
|-----|-------|
| Właściciel | Supabase billing / upgrade / spend cap |
| Agent (na polecenie) | P1 delta-sync design + implement |
| Agent | **Nie** zmieniać merge guardów bez briefu |
