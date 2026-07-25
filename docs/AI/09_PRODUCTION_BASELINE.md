# 09 — Production Baseline (WGDOM)

> **★★ TIP SSOT — JEDYNE miejsce w docs z numerem wersji tipu dla AI.**  
> Inne pliki **linkują tutaj** — **nie** powielają UI version / commit tip.  
> **Aktualizacja:** przy każdym domknięciu release / docs tip na `main`.  
> **Live:** `https://www.wgdom.fun/version.json` · cross-check `git log -1` · `src/app/changelog-data.ts` (UI)

**Snapshot dokumentacji:** 2026-07-26 (**AI-DOCS-PAYROLL-GUARD-02** onboarding) · prod UI **2.65.44**.

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
| **UI version (changelog / version.json)** | **2.65.44** |
| **Deploy tip commit (`main`)** | **`c461bde`** (MOBILE-FIRST-SCREEN-01 docs finalize) — po push GUARD-02: nowy docs tip; UI może pozostać **2.65.44** |
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
| **2.65.44** / **`c461bde`** | MOBILE-FIRST-SCREEN-01 release finalize | **CLOSED** |
| docs GUARD-02 | AI Payroll Safety onboarding (docs-only) | **ten release** |
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
