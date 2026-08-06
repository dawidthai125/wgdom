# NG-TENDERS-COST-KNOWLEDGE-01 — CLOSEOUT

> **STATUS:** **EPIC CLOSED** · **PRODUCTION VERIFIED**  
> **ID:** NG-TENDERS-COST-KNOWLEDGE-01-CLOSEOUT  
> **Production Version:** **2.66.20**  
> **Feature Commit:** **`9c0901d6`** (`9c0901d669b0d96b4fef4dee015af926a83faf4b`) · tip short **`9c0901d`**  
> **Docs / Version Commit:** **`f2b0fa1e`** (`f2b0fa1eba67ce4b41ca304e9a7b54ae499653ff`) · tip short **`f2b0fa1`**  
> **Data:** 2026-08-06  
> **Cold-start:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
NG-TENDERS-COST-KNOWLEDGE-01 — CLOSED

2.66.20 / f2b0fa1e (docs tip)
Feature tip: 9c0901d6

Thin Slice A0 + A1 ONLY
A0 — KPI Harness (RO) · TV-01 buckets · Overall Confidence
A1 — Library Fill FEATURE-DATA · Quotes REUSE · false-map hygiene

Knowledge Layer helpers (pure lib)
NO Bid rewrite · NO AI-COST rewrite · NO Cloud CORE

NEXT: WAITING FOR NEXT OWNER GO
════════════════════════════════════════════════════════
```

---

## 1. Delivered — Thin Slice A0 + A1

| Slice | Treść |
|-------|--------|
| **A0** | Pure lib Confidence Model v1 (Knowledge / Price / Overall) · KPI buckets `knowledge_qualified` \| `heuristic_priced` \| `unmapped` · TV-01 baseline **78.1%** · harness fixture (reprodukowalny) / `--live` |
| **A1** | 5 seedów TOP Library Gap (`ck-a1-*`) · multi-word keywords · bare-token hygiene (name/description) · Quotes via `previewMarketCsvImport` → `commitMarketQuotesImport` · false-map smoke |
| **Test** | `scripts/test-ng-tenders-cost-knowledge-01-a0a1.mjs` · A0 harness · A1 `--fixture` |
| **UI tip** | **2.66.20** (docs/version bump) — opis feature tip **`9c0901d6`** |

**Kluczowe pliki:** `src/lib/cost-knowledge/*` · `scripts/ng-tenders-cost-knowledge-01-a0-kpi-harness.mjs` · `scripts/ng-tenders-cost-knowledge-01-a1-ops.mjs` · `scripts/test-ng-tenders-cost-knowledge-01-a0a1.mjs`

---

## 2. Boundary — **NO TOUCH**

| Warstwa | Status |
|---------|--------|
| Cloud Sync CORE | **NO TOUCH** |
| Payroll | **NO TOUCH** |
| Edge (`make-server-0afb8820`) | **NO TOUCH** (A1 `--execute` ops optional; nie w release feature commit) |
| AI-COST rewrite | **NO TOUCH** |
| Bid rewrite | **NO TOUCH** |
| Workspace / Przetargi IA | **NO TOUCH** |
| Learning Loop | **OUT** (nie w A0+A1) |
| Match Quality (A2) | **OUT** |
| Quotes Depth (A3) | **OUT** |
| BOM · Knowledge Graph v2 · Supplier · Waste · Scraping · ORGBUD | **OUT** |

G1–G9: **ALL-NIE** (FEATURE-DATA + pure lib/scripts).

---

## 3. Lessons Learned

1. **FEATURE-DATA bez bumpa changelog** → tip UI zostaje na poprzedniej wersji; PV Owner AC musi rozdzielać **feature SHA** vs **UI version** (tu: bump docs **2.66.20** / `f2b0fa1e` po feature `9c0901d6`).
2. **False-map hygiene** wymaga nie tylko multi-word keywords, ale też **braku bare tokenów w `namePl`/`descriptionPl`** — mapper scoruje tokeny nazwy (≥4 znaków).
3. **KPI ≠ heuristic** — Overall Confidence deny dla `heuristic` / `company_model`; allowlist: `work_catalog` · `controlled_market` · `company_knowledge`.
4. **Allowlist-only commit** krytyczny przy dużym WIP lokalnym — nigdy `git add -A`.
5. CI residual (TEUX7E / Legacy E2E / Mobile) **nie** jest regresją A0+A1 — diff epiku wyłącznie `cost-knowledge` + skrypty.

---

## 4. Known Residuals — **NOT PART OF THIS EPIC**

| Residual | Uwaga |
|----------|--------|
| **TEST-INFRA** — `LIB-TENDER-STRATEGY-TEUX7E` | Gate B tenders · ShortcutPanel token imports · **pre-existed** · **NOT PART OF THIS EPIC** |
| **Mobile Smoke** — Jobs / Dokumentacja | historyczny residual · **NOT PART OF THIS EPIC** |
| **Legacy Happy Path E2E** | LEGACY workflow · **NOT PART OF THIS EPIC** |
| **A2 Match Quality / A3 Quotes Depth / Learning Loop** | backlog roadmapy DF — **nie** dostarczone w Thin Slice · tylko Owner GO → AUDIT |

Tip deploy **PRODUCTION VERIFIED** niezależnie od residual CI.

---

## 5. Production

| Pole | Wartość |
|------|---------|
| **UI** | **2.66.20** |
| **Deploy / docs tip** | **`f2b0fa1e`** |
| **Feature tip** | **`9c0901d6`** |
| **PV** | **PRODUCTION VERIFIED** · `version.json` `2.66.20` / `f2b0fa1` |
| **Feature GitHub** | https://github.com/dawidthai125/wgdom/commit/9c0901d669b0d96b4fef4dee015af926a83faf4b |
| **Docs GitHub** | https://github.com/dawidthai125/wgdom/commit/f2b0fa1eba67ce4b41ca304e9a7b54ae499653ff |

---

## 6. NEXT

**WAITING FOR NEXT OWNER GO.**

Backlog (nie auto-start): A2 Match · A3 Quotes Depth · Learning Loop (z Learning Gate) — zawsze **AUDIT** najpierw.

---

*CLOSEOUT · NG-TENDERS-COST-KNOWLEDGE-01 · 2026-08-06*
