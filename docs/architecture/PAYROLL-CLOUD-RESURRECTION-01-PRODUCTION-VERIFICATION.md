# PAYROLL-CLOUD-RESURRECTION-01 — PRODUCTION VERIFICATION

> **Status:** **CLOSED** · **RELEASED** · PRODUCTION VERIFIED  
> **Data:** 2026-07-20  
> **Tryb:** FAST RELEASE · Owner GO  
> **Commit:** `fce7b78` · `fix(payroll): PAYROLL-CLOUD-RESURRECTION-01 — bootstrap freshness fence (2.65.35)`  
> **Changelog:** **2.65.35**

---

## RELEASE MODE: FAST RELEASE

Powód: jeden hotfix bundle (fence + merge + CloudLoader + testy + docs), FINAL VERIFICATION PASS, Owner GO na push.

---

## 1. Git

| Kryterium | Wynik |
|-----------|--------|
| `git push origin main` | **PASS** (`e38610a..fce7b78`) |
| `HEAD == origin/main` | **YES** (`fce7b78173cf5330081be364b4f993de9d83be5a`) |

---

## 2. Deployment (`version.json` — VERIFY FAST)

### 2a. Pierwsze odczytanie (zaraz po push)

| Pole | Wartość |
|------|---------|
| URL | https://www.wgdom.fun/version.json |
| Odczyt | `version: 2.65.34` · `commit: e38610a` |
| Oczekiwane | `2.65.35` · `fce7b78` |
| Werdykt | **DEPLOY PROPAGATING** (bez retry/poll — WORKFLOW VERIFY FAST) |

### 2b. Potwierdzenie przy smoke (późniejszy odczyt w harnessie)

| Pole | Wartość |
|------|---------|
| Odczyt | `version: 2.65.35` · `commit: fce7b78` |
| Bundle marker | `PAYROLL-CLOUD-RESURRECTION-01` / `preferCloudEmptyRoster` **obecne** |
| Werdykt | **PRODUCTION VERIFIED** |

---

## 3. Smoke produkcyjny — dwie niezależne sesje

**Harness:** `.tmp/payroll-cloud-resurrection-01-prod-smoke.mjs`  
**Artefakt:** `.tmp/payroll-cloud-resurrection-01-prod-smoke-out/report.json`

```text
Session A  →  recovery (batch-set live=[] · strip archive 20–25 · keep 13–18)
Session B  →  stary LocalStorage (live = clone roster 13–18 + polluted archive 20–25)
           →  login admin · CloudLoader bootstrap · Lista Płac
```

| Check | Wynik | Dowód |
|-------|--------|--------|
| Session A recovery | **PASS** | Cloud live=0 · archive 20–25 = 0 |
| Fence blokuje push | **PASS** | `preferCloudEmptyRoster=true` · `shouldPush=false` · reason `stale_local_matches_historical_archive` |
| Session B bootstrap | **PASS** (Cloud) | Cloud po B: live=**0** · archive 20–25 = **0** · prev 13–18 = 14 |
| Brak odtworzenia live roster w Cloud | **PASS** | liveN pozostał 0 |
| Brak odtworzenia archive 20–25 | **PASS** | archiveCurN = 0 |
| Cloud KV niezmienione vs recovery | **PASS** | intentional empty zachowane |
| Session B LS live | **WARN** | LS nadal `live=14` lokalnie po bootstrap (UI mirror stale do odświeżenia) — **nie** poszło do Cloud |

**Werdykt smoke:** **PASS** (kryterium Cloud + fence). WARN na LS Session B nie stanowi resurrection Cloud.

---

## 4. Status końcowy

```text
PAYROLL-CLOUD-RESURRECTION-01
RELEASED
CLOSED

RELEASE GO: TAK
PRODUCTION STATUS: PRODUCTION VERIFIED (2.65.35 / fce7b78)
SMOKE DUAL-SESSION: PASS
HEAD == origin/main: YES
```

---

## HOTFIX CLASSIFICATION

```text
BUGFIX
```

---

## Operacyjny follow-up (opcjonalny)

Session B z residual LS `live=14` — po hard refresh / clear LS payroll keys klient powinien zobaczyć pusty live zgodny z Cloud. Fence już chroni Cloud przed re-seedem.
