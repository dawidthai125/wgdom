# 09 — Production Baseline (WGDOM)

> **Aktualizacja tego pliku:** przy każdym domknięciu release / closeout.  
> Cross-check: `src/app/changelog-data.ts`, `git log -1`, `https://www.wgdom.fun/version.json`, `PROJECT-HANDOFF-CURRENT.md`.

**Snapshot dokumentacji:** 2026-07-24 (po **WGDOM-HARDENING-01D CLOSED** · UI **2.65.40** · docs tip **`96d44d0`**).

---

## 1. Production tip

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun · https://www.wgdom.online |
| **UI version (changelog tip)** | **2.65.40** |
| **Feature commit (app semantyka)** | **`23d7723`** — `fix(tenders): HARDENING-01A Persist SSOT (2.65.40)` |
| **Docs / tooling tip (`main` / Vercel)** | **`96d44d0`** — `docs(hardening): HARDENING-01D Edge 546 monitor` |
| **Status** | **PRODUCTION VERIFIED · GREEN** |
| **Sync Storm fix** | **2.65.38** · commit feature **`838e8e2`** |
| **Prior tip** | **2.65.39** · **`e666443`** (Incident 23.07 cleanup) |
| **Deploy FE** | Vercel Git Integration ← `push origin main` |
| **Supabase project** | `bdpygdvfgbggermvqtys` |
| **Edge** | `make-server-0afb8820` |
| **Protected Core** | **GREEN** (Sync Storm class READY · Persist SSOT 01A ACTIVE) |
| **STABILIZATION WINDOW** | **ACTIVE** |

> **Uwaga:** `version.json.commit` może wskazywać **docs tip** (`96d44d0`). **Feature baseline** = UI **2.65.40** / **`23d7723`**. Lokalne WT (ARCH-02F, Edge chunk, TEUX) ≠ prod tip.

---

## 2. Ostatnie releasy istotne

| Version / tip | Temat | Status |
|---------------|-------|--------|
| docs **`96d44d0`** | **WGDOM-HARDENING-01D** Edge 546 monitor (tooling/docs) | **CLOSED** · PV PASS |
| **2.65.40** / **`23d7723`** | **WGDOM-HARDENING-01A** Persist SSOT (H1+H2) | **CLOSED** · **PRODUCTION VERIFIED · GREEN** |
| **2.65.39** | Incident 23.07 cleanup — diag OFF | RELEASED |
| **2.65.38** | TENDERS-SYNC-STORM-P0 | RELEASED · Final Audit **PRODUCTION READY** |
| **2.65.35** | PAYROLL-CLOUD-RESURRECTION-01 · H5 tip | CLOSED |
| **2.65.34** | PAYROLL-P0-WEEK-ROLLOVER-01 | CLOSED |
| **2.65.33** | CLOUD-P0-DEADLOCK-N1 | CLOSED |
| **2.65.30** | THEME-01C | CLOSED |
| **2.65.28** | LOCALSTORAGE-ARCH-02 A–E | CLOSED · F gated |

---

## 3. Cloud / Sync stan

| Element | Stan |
|---------|------|
| Domain Push Payroll | ACTIVE |
| Resurrection fence | ACTIVE — nie usuwać |
| Sync Storm heavy | P0 ACTIVE — deps bez builtAt |
| **HARDENING-01A bootstrap persist** | **ACTIVE** — mid-flight local · ≤1 terminal cloud · flag `pipelineBootstrapPersistLocal` default ON |
| **HARDENING-01D 546 monitor** | **ACTIVE** tooling — smoke + ledger · **M-EDGE-546 = MONITOR** |
| Deadlock retry N1 | ACTIVE |
| ADR Cloud Sync | PROPOSED · Evidence Gate OPEN · DF BLOCKED |
| pipelinePerfDebouncePersist | default **false** (nie zmieniane w 01A/01D) |

---

## 4. Najważniejsze moduły (prod)

| Moduł | Stan |
|-------|------|
| Lista Płac | STABLE · priorytet #1 |
| Roboty / Photos | STABLE po Assets/Delete sync |
| Przetargi / Pipeline | STABLE vs Sync Storm · **01A persist SSOT ACTIVE** · **01D 546 MONITOR** |
| WM Druk / ZI | COMPLETE / STABLE |
| Work Catalog | MVP PROD |
| Theme | 01C VERIFIED |
| Audit Hub | MVP CLOSED |

---

## 5. Otwarte EPIC / gated

| Item | Status |
|------|--------|
| **WGDOM-HARDENING-01 EPIC A** | **CLOSED** @ 2.65.40 / `23d7723` |
| **WGDOM-HARDENING-01 EPIC D** | **CLOSED** @ docs tip `96d44d0` · D-V3 **DEFER** |
| **WGDOM-HARDENING-01 EPIC B / C / E** | PLAN ready · **czekaj Owner GO** (B0 prefer · C N2 CORE · E Autonomous FP) |
| **LOCALSTORAGE-ARCH-02F** | GO / **NOT STARTED** (IMPLEMENT only on command) |
| **TEST-HARNESS H0.x Persist Ledger** | READY · **GATED** |
| **H3-B/C** harness | **GATED** |
| **CLOUD-P0-DEADLOCK-N2** | READY · **GATED** |
| **Edge kv-mset-chunk** | lokalne / RCA — **nie** mieszać z FEATURE |
| **TWSL 2.63.91** | lokalny WIP hist. · RELEASE NOT READY |
| **ADR SYNC-ARCH implementation** | **BLOCKED** Evidence Gate |
| **INFRA-DB-BACKUP-01** | ON HOLD |
| **CI TEUX-7d GuideView `\bAI\b`** | **OPEN follow-up** · pre-existing · **nie** regresja 01A/01D |

---

## 6. Otwarte backlogi (HARDENING residual)

1. ~~Bootstrap tender `onUpdate` → local~~ → **CLOSED 01A**.  
2. ~~Legacy panel forward persist opts~~ → **CLOSED 01A** (adapter; panel emit nadal default cloud).  
3. Circuit breaker scope vs fingerprint churn → **EPIC B**.  
4. Fat pipeline chunking (osobny epic).  
5. Autonomous fingerprint vs builtAt → **EPIC E**.  
6. ~~Edge 546 monitoring~~ → **CLOSED 01D** (M2-A monitor; residual **M-EDGE-546 MONITOR**; D-V3 DEFER).  
7. Deadlock N2 / retry review → **EPIC C**.

---

## 7. Incident register (skrót)

| Incident | Status |
|----------|--------|
| 23.07 Sync Storm + platform | App **FIXED** · platform recovered · audit READY |
| Payroll resurrection / rollover | CLOSED |
| Egress 402 | CLOSED (ops) |
| Jobs photos delete/assets | CLOSED |
| Theme | CLOSED |

---

## 8. Jak zweryfikować baseline w 60s

```bash
git log -1 --oneline
curl -s https://www.wgdom.fun/version.json
# oczekiwane: version 2.65.40
# commit: docs tip 96d44d0 (lub nowszy docs) — feature baseline nadal 23d7723
# porównaj z CHANGELOG[0].version w changelog-data.ts
```

Health (opcjonalnie): Edge `/functions/v1/make-server-0afb8820/health`.

SSOT closeout 01A: [`docs/architecture/WGDOM-HARDENING-01A-CLOSEOUT.md`](../architecture/WGDOM-HARDENING-01A-CLOSEOUT.md).  
SSOT closeout 01D: [`docs/architecture/WGDOM-HARDENING-01D-CLOSEOUT.md`](../architecture/WGDOM-HARDENING-01D-CLOSEOUT.md).  
01D runbook: [`docs/architecture/WGDOM-HARDENING-01D-RUNBOOK.md`](../architecture/WGDOM-HARDENING-01D-RUNBOOK.md).
