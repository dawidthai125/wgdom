# CI GATE B REMEDIATION — CI-3 (LIB-PAYROLL-P11-BOOTSTRAP ENOENT)

> **Status:** **CLOSED** (IMPLEMENT + verify + commit + push)  
> **Data:** 2026-07-24  
> **Tip:** commit CI-3 (patrz raport sesji) · CI-2 `db7fc97`  
> **Zakaz (honorowane):** Payroll Core · Cloud Sync · D1–D5 · Theme · UI · `backups/` nie commitowane

---

## 1. AUDIT (summary)

| Fakt | Dowód |
|------|--------|
| Suite | `LIB-PAYROLL-P11-BOOTSTRAP` → `scripts/test-p11-bootstrap-payroll.mjs` |
| Pre-fix CI | `ENOENT` na `backups/auto/wgdom-full-2026-06-02T07-51-08/kv-data.json` |
| `.gitignore` | `backups/` — celowo (sekrety) |
| Root cause | Hard `readFileSync` bez `existsSync` / synthetic fallback |

---

## 2. RCA (CONFIRMED)

ENOENT **przed** `applyBootstrapPayrollMerge`. Test bug — zależność od gitignored lokalnego backupu. Nie production.

---

## 3. IMPLEMENT (DONE)

| Plik | Zmiana |
|------|--------|
| `scripts/test-p11-bootstrap-payroll.mjs` | `existsSync` → local backup **lub** synthetic `richRoster(12)`; asercje względne vs cloud (bez hardcode `194`) |
| Ten dokument | CLOSEOUT |

**OUT:** `cloud-sync.ts` · D1–D5 · Theme · UI · commit `backups/` · zmiana `.gitignore`

---

## 4. VERIFY

| Scenariusz | Wynik |
|------------|--------|
| Lokalnie z `backups/` | `fixtureSource: local-backup` · **pass** · 194h relative OK |
| Bez backupu (rename / CI) | `fixtureSource: synthetic` · **pass** · 540h relative OK |

---

## 5. Klasyfikacja

**test bug** — CLOSED.

---

## 6. Next

CI-3 **CLOSED**. Kolejne Gate B fails (np. tenders) — osobny GO.
