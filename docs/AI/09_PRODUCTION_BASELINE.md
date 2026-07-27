# 09 — Production Baseline (WGDOM)

> **★★ TIP SSOT — JEDYNE miejsce w docs z numerem wersji tipu dla AI.**  
> Inne pliki **linkują tutaj** — **nie** powielają UI version / commit tip.  
> **Aktualizacja:** przy każdym domknięciu release / docs tip na `main`.  
> **Live:** `https://www.wgdom.fun/version.json` · cross-check `git log -1` · `src/app/changelog-data.ts` (UI)

**Snapshot dokumentacji:** 2026-07-27 (**AI-COST-01-STAB-01** · FIELD READY) · feature UI **2.65.61** · live `version.json` — po deploy · prior **2.65.60** COST-S7.

---

## 0. Jak AI czyta tip

```text
1. Ten plik (docs/AI/09_PRODUCTION_BASELINE.md)
2. Opcjonalnie curl version.json
3. NIE kopiuj tipu do AI_ENTRY / AGENTS / Continuity / cursor rules
```

Po release: zaktualizuj **tylko §1** (i krótki wiersz w §2). Reszta Knowledge Base bez bumpów numerów.

---

## 1. Production tip

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun · https://www.wgdom.online |
| **UI version (changelog / version.json)** | **2.65.61** (STAB-01) · oczekiwane live po push |
| **Deploy tip commit (`main` / `version.json`)** | **Feature tip:** commit STAB-01 (ten release) · prior tip **`f5ba5ac`** (2.65.60) |
| **Ostatni feature (STAB-01)** | Field Ready Stabilization — [`STAB-01-RELEASE`](../architecture/WGDOM-AI-COST-01-STAB-01-RELEASE-REPORT.md) · **FIELD READY** |
| **Ostatni feature (COST-S7)** | AI Validation & Offer Quality — [`COST-S7-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S7-RELEASE-REPORT.md) · **`1c84363`** / tip docs **`f5ba5ac`** |
| **Ostatni feature (COST-S6)** | Bid Proposal Integration — [`COST-S6-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S6-RELEASE-REPORT.md) · **`754c997`** |
| **Ostatni feature (COST-S5.1)** | AI Learning & Company Knowledge — [`COST-S5.1-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S5.1-RELEASE-REPORT.md) · **`973821f`** |
| **Ostatni feature (COST-S5)** | Edycja komponentów — [`COST-S5-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S5-RELEASE-REPORT.md) · **`351f534`** |
| **Ostatni feature (COST-S4.1)** | Explainability RO — [`COST-S4.1-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S4.1-RELEASE-REPORT.md) · **`8fe1147`** |
| **Ostatni feature (COST-S4)** | AI Pricing Engine — [`COST-S4-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S4-RELEASE-REPORT.md) · **`b321867`** |
| **Ostatni feature (COST-S3)** | AI Cost Intelligence — [`COST-S3-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S3-RELEASE-REPORT.md) · **`61b7590`** |
| **Ostatni feature (COST-S2)** | Mapping Engine — [`COST-S2-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S2-RELEASE-REPORT.md) · **`17a7a83`** |
| **Ostatni feature (COST-S1)** | OfferBoq model — [`COST-S1-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S1-RELEASE-REPORT.md) · **`fd4b112`** |
| **Ostatni feature (AP2-S4)** | Business Risk Engine — [`AP2-S4-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S4-RELEASE-REPORT.md) · **`5355c19`** |
| **Ostatni feature (AP2-S3)** | Deep intelligence + Najważniejsze informacje — [`AP2-S3-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S3-RELEASE-REPORT.md) · **`3e23631`** |
| **Ostatni feature (AP2-S2)** | Auto-analiza UX + „Uruchom ponownie analizę” — [`AP2-S2-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S2-RELEASE-REPORT.md) · **`7c04203`** |
| **Ostatni feature (AP2-S1)** | Kompletność dokumentacji + gotowość wyceny — [`AP2-S1-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S1-RELEASE-REPORT.md) · **`01d8981`** |
| **Ostatni feature (AP2-S0)** | Semantyka przedmiaru — [`AP2-S0-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S0-RELEASE-REPORT.md) · **`2c1ef53`** |
| **Ostatni feature (Dashboard Body S4)** | **`bd0f239`** — Przetargi skrót → GDS |
| **Feature baseline Lista Płac (Hours-wipe)** | UI **2.65.43** · **`ea1b0a6`** — semantyka D1–D5 ACTIVE |
| **Status** | **PRODUCTION VERIFIED** · GREEN · feature **`1c84363`** · live `version.json` = **2.65.60** / **`f5ba5ac`** |
| **Dashboard Body (S1–S4)** | **COMPLETE** · [`WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |
| **UI Foundation v1.0** | **COMPLETE** · [`WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) |
| **Payroll Hours-wipe EPIC** | **CLOSED** · [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) |
| **AI onboarding / Master Handoff** | [`AI_ENTRY.md`](AI_ENTRY.md) · [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md) · Gate [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md) |
| **Sync Storm fix** | **2.65.38** · **`838e8e2`** |
| **Prior tip (hardening)** | **2.65.40** · **`23d7723`** (HARDENING-01A) |
| **Deploy FE** | Vercel Git Integration ← `push origin main` |
| **Supabase project** | `bdpygdvfgbggermvqtys` |
| **Edge** | `make-server-0afb8820` |
| **Protected Core** | **GREEN** |
| **STABILIZATION WINDOW** | **ACTIVE** |

> **Uwaga:** `version.json.commit` = ostatni push na `main` (docs lub feature). **Semantyka Hours-wipe** = **`ea1b0a6`**. **Feature BODY-S4** = **`bd0f239`**. Lokalne WT ≠ tip. CI Gate B = osobny EPIC (CLOSED).

---

## 2. Ostatnie releasy istotne

| Version / tip | Temat | Status |
|---------------|-------|--------|
| **2.65.60** / **`1c84363`** | COST-S7 AI Validation & Offer Quality | **PRODUCTION VERIFIED** · [`COST-S7-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S7-RELEASE-REPORT.md) |
| **2.65.58** / **`973821f`** | COST-S5.1 AI Learning & Company Knowledge | **PRODUCTION** · **PV** · [`COST-S5.1-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S5.1-RELEASE-REPORT.md) |
| **2.65.57** / **`351f534`** | COST-S5 edycja komponentów | **PRODUCTION** · **PV** · [`COST-S5-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S5-RELEASE-REPORT.md) |
| **2.65.51** / **`5355c19`** | AP2-S4 Business Risk Engine | **PRODUCTION** · **PV** · [`AP2-S4-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S4-RELEASE-REPORT.md) |
| **2.65.50** / **`3e23631`** | AP2-S3 deep intelligence + Najważniejsze informacje | **PRODUCTION** · **PV** · [`AP2-S3-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S3-RELEASE-REPORT.md) |
| **2.65.49** / **`7c04203`** | AP2-S2 auto-analiza UX + Uruchom ponownie | **PRODUCTION** · **PV** · [`AP2-S2-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S2-RELEASE-REPORT.md) |
| **2.65.48** / **`01d8981`** | AP2-S1 kompletność dokumentacji + gotowość wyceny | **PRODUCTION** · **PV** · [`AP2-S1-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S1-RELEASE-REPORT.md) |
| **2.65.47** / AP2-S0 | Przedmiar = wycena · brak kosztorysu = INFO | **PRODUCTION** · [`AP2-S0-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S0-RELEASE-REPORT.md) |
| docs **`0a6996e`** | CONSOLIDATION-03 tip finalize (SSOT + RR push status) | **CLOSED** |
| docs **`44655fe`** | CONSOLIDATION-03 release report + tip @ `a1ed3b8` | **CLOSED** |
| docs **`a1ed3b8`** | **AI-DOCS-CONSOLIDATION-03** — MASTER_HANDOFF + AI docs sync · Body closeout published | **CLOSED** · [`CONSOLIDATION-03-RELEASE`](../architecture/WGDOM-AI-DOCS-CONSOLIDATION-03-RELEASE-REPORT.md) |
| docs **`1e07574`** | BODY-S4 release report + tip SSOT | **CLOSED** |
| **2.65.46** / **`bd0f239`** | **DASHBOARD-BODY-S4** — Przetargi skrót → WgCard soft · Body EPIC **COMPLETE** | **CLOSED** · **PV** · [`S4-RELEASE`](../architecture/WGDOM-DASHBOARD-BODY-S4-RELEASE-REPORT.md) · [`BODY-02-CLOSEOUT`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |
| **2.65.46** / **`ca08c75`** | **DASHBOARD-BODY-S3** — Notatki → WgCard soft | **CLOSED** · **PV** · [`WGDOM-DASHBOARD-BODY-S3-RELEASE-REPORT.md`](../architecture/WGDOM-DASHBOARD-BODY-S3-RELEASE-REPORT.md) |
| **2.65.46** / **`e2e1c58`** | **DASHBOARD-BODY-S2** — Pilne → WgCard soft | **CLOSED** · **PV** · [`WGDOM-DASHBOARD-BODY-S2-RELEASE-REPORT.md`](../architecture/WGDOM-DASHBOARD-BODY-S2-RELEASE-REPORT.md) |
| **2.65.46** / **`1cf8af2`** | **DASHBOARD-BODY-S1** — Braki → WgCard soft | **CLOSED** · **PV** · [`WGDOM-DASHBOARD-BODY-S1-RELEASE-REPORT.md`](../architecture/WGDOM-DASHBOARD-BODY-S1-RELEASE-REPORT.md) |
| **2.65.46** / **`2a99e54`** | **UI FOUNDATION v1.0** — A11Y-01 + e2e-ui-guard (9/9 prod) | **COMPLETE** · **PV** · [`WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) |
| **2.65.46** / **`da24e5a`** | **SIDEBAR-REGRESSION-02** — NavItemWithHint horizontal scroll | **CLOSED** · **PV** · [`WGDOM-SIDEBAR-REGRESSION-02-RELEASE-REPORT.md`](../architecture/WGDOM-SIDEBAR-REGRESSION-02-RELEASE-REPORT.md) |
| **2.65.46** / **`5888a76`** | **SHELL-RELEASE-01** — Dashboard · Sidebar · Topbar visual | **CLOSED** · **PV** · [`WGDOM-SHELL-RELEASE-01-RELEASE-REPORT.md`](../architecture/WGDOM-SHELL-RELEASE-01-RELEASE-REPORT.md) |
| **2.65.46** / **`cf76d28`** | Roboty UI-01D-A/B/C + Wg* primitives | **CLOSED** · **PV** |
| **2.65.46** / **`6df8373`** | **LOGIN-UI-01** mobile hotfix (16px + back DOM) | **CLOSED** · **PV** |
| **2.65.45** / **`5f2baf8`** | **LOGIN-UI-01** — premium login UI refresh (UI-only) | **CLOSED** |
| docs **`af15e30`** / **`5f68322`** | **AI-DOCS-PAYROLL-GUARD-02** — AI Entry + Payroll Safety Gate (+ tip SSOT) | **CLOSED** |
| **2.65.44** / **`c461bde`** | MOBILE-FIRST-SCREEN-01 release finalize | **CLOSED** |
| **2.65.43** / **`ea1b0a6`** | **PAYROLL Hours-wipe** D4+D5 · EPIC CLOSED | **CLOSED** · **PV** |
| **2.65.42** / **`f3b8c03`** | PAYROLL D2+D3 Domain Gate | **CLOSED** |
| **2.65.41** / **`ace2855`** | PAYROLL D1 write-path telemetry | **CLOSED** |
| **2.65.40** / **`23d7723`** | HARDENING-01A Persist SSOT | **CLOSED** |
| **2.65.38** | TENDERS-SYNC-STORM-P0 | **CLOSED** |
| **2.65.35** | PAYROLL-CLOUD-RESURRECTION-01 | **CLOSED** |
| **2.65.34** | PAYROLL-P0-WEEK-ROLLOVER-01 | **CLOSED** |

---

## 3. Cloud / Sync stan

| Element | Stan |
|---------|------|
| Domain Push Payroll | ACTIVE |
| Hours-wipe D1–D5 | **ACTIVE** · EPIC **CLOSED** |
| Resurrection fence | ACTIVE — nie usuwać |
| Sync Storm heavy | P0 ACTIVE — deps bez builtAt |
| HARDENING-01A bootstrap persist | ACTIVE |
| HARDENING-01D 546 monitor | ACTIVE tooling |
| HARDENING-01B0 FP-churn monitor | ACTIVE tooling |
| Deadlock retry N1 | ACTIVE |
| ADR Cloud Sync | PROPOSED · Evidence Gate OPEN · DF BLOCKED |
| pipelinePerfDebouncePersist | default **false** |

---

## 4. Najważniejsze moduły (prod)

| Moduł | Stan |
|-------|------|
| Lista Płac | STABLE · priorytet #1 |
| Roboty / Photos | STABLE |
| Przetargi / Pipeline | STABLE vs Sync Storm · hardening monitors |
| WM Druk / ZI | COMPLETE / STABLE |
| Work Catalog | MVP PROD |
| Theme | 01C VERIFIED |
| Audit Hub | MVP CLOSED |
| GDS (Wg*) | GDS-01 + MAINT-01 **CLOSED** · DS-13 |
| UI Foundation | **COMPLETE** · ui-guard 9/9 |
| Dashboard Body mid | **COMPLETE** (S1–S4) · S5/S6 backlog |
| CI Gates B/C | **GREEN** · CI Remediation **CLOSED** |

---

## 5. Procedura bump tip (release)

1. Zaktualizuj **§1** (UI + commit z `version.json` po deploy).  
2. Dopisz wiersz w **§2**.  
3. **Nie** edytuj tipów w `AI_ENTRY`, `AGENTS` START, Continuity banner, cursor rules — tylko link do tego pliku.  
4. Opcjonalnie jedna linia w `PROJECT_HANDOFF.md` („patrz 09”).

---

## 6. Linki AI Safety

| | |
|--|--|
| Entry | [`AI_ENTRY.md`](AI_ENTRY.md) |
| Master Handoff | [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md) |
| Gate | [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md) |
| Payroll SSOT | [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) |
