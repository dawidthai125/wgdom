# 09 — Production Baseline (WGDOM)

> **★★ TIP SSOT — JEDYNE miejsce w docs z numerem wersji tipu dla AI.**  
> Inne pliki **linkują tutaj** — **nie** powielają UI version / commit tip.  
> **Aktualizacja:** przy każdym domknięciu release / docs tip na `main`.  
> **Live:** `https://www.wgdom.fun/version.json` · cross-check `git log -1` · `src/app/changelog-data.ts` (UI)

**Snapshot dokumentacji:** 2026-07-26 (**DASHBOARD-BODY-S4** Przetargi skrót GDS) · prod UI **2.65.46** @ **`bd0f239`**.

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
| **UI version (changelog / version.json)** | **2.65.46** |
| **Deploy tip commit (`main`)** | **`bd0f239`** — **DASHBOARD-BODY-S4** Przetargi skrót → GDS · prior S3 **`ca08c75`** · S2 **`e2e1c58`** · S1 **`1cf8af2`** |
| **Feature baseline Lista Płac (Hours-wipe)** | UI **2.65.43** · **`ea1b0a6`** — semantyka D1–D5 ACTIVE |
| **Status** | **PRODUCTION VERIFIED · GREEN** |
| **Payroll Hours-wipe EPIC** | **CLOSED** · [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) |
| **AI onboarding** | [`AI_ENTRY.md`](AI_ENTRY.md) · Gate [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md) |
| **Sync Storm fix** | **2.65.38** · **`838e8e2`** |
| **Prior tip (hardening)** | **2.65.40** · **`23d7723`** (HARDENING-01A) |
| **Deploy FE** | Vercel Git Integration ← `push origin main` |
| **Supabase project** | `bdpygdvfgbggermvqtys` |
| **Edge** | `make-server-0afb8820` |
| **Protected Core** | **GREEN** |
| **STABILIZATION WINDOW** | **ACTIVE** |

> **Uwaga:** `version.json.commit` często = ostatni push (docs lub feature). **Semantyka Hours-wipe** = **`ea1b0a6`**. Lokalne WT ≠ tip. CI Gate B = osobny EPIC.

---

## 2. Ostatnie releasy istotne

| Version / tip | Temat | Status |
|---------------|-------|--------|
| **2.65.46** / **`bd0f239`** | **DASHBOARD-BODY-S4** — Przetargi skrót → WgCard soft | **CLOSED** · **PV** · [`WGDOM-DASHBOARD-BODY-S4-RELEASE-REPORT.md`](../architecture/WGDOM-DASHBOARD-BODY-S4-RELEASE-REPORT.md) |
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
| Gate | [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md) |
| Payroll SSOT | [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) |
