# NG-06-TEUX — TEUX-7f Hosted deprecation guard · Bundle Closeout

> **Status:** **TEUX-7f CLOSED FINAL** · **RELEASE GO** · **DEPLOY PROPAGATING**  
> **Prod (target):** UI **2.63.65** · `version.json` commit **`e0d4e47`** · implement **`e0d4e47`** · https://www.wgdom.fun  
> **Data closeout:** 2026-07-08 · **verify:** 2026-07-08T05:30Z (`curl version.json` → **2.63.64** @ `da9b75a` — propagacja Vercel)  
> **Owner GO:** APPROVED (CONDITIONAL)  
> **Audyt:** [`NG-06-TEUX-TEUX7F-AUDIT-REPORT.md`](./NG-06-TEUX-TEUX7F-AUDIT-REPORT.md)

```text
PUSH:     PASS (e0d4e47 → origin/main)
PROD:     DEPLOY PROPAGATING (version.json 2.63.64 @ da9b75a — single curl, no retry)
RELEASE:  GO (build PASS + gate B tenders incl. LIB-TENDER-HOSTED-DEPRECATION-TEUX7F)
BUNDLE:   CLOSED FINAL
TOKEN FREEZE: ACTIVE (import-only tender-ux-tokens.ts)
GAP G-13:   CLOSED (formal hosted deprecation SSOT + dev guard)
```

---

## 1. Podsumowanie bundla

| Pole | Wartość |
|------|---------|
| **Cel** | Udokumentować dual runtime V4 vs accordion-hosted; oznaczyć legacy jako deprecated **bez usuwania** |
| **Deliverable** | `NG-06-TEUX-HOSTED-DEPRECATION.md` · `@deprecated` · dev `console.warn` · `LIB-TENDER-HOSTED-DEPRECATION-TEUX7F` |
| **Complexity** | **S** — 8 plików, 1 commit (`e0d4e47`) |
| **Rollback** | `git revert e0d4e47` |
| **Intelligence label** | **UNCHANGED** (Owner GO conditional) |

---

## 2. Acceptance Criteria (DF § TEUX-7f)

| AC | Status |
|----|--------|
| SSOT `NG-06-TEUX-HOSTED-DEPRECATION.md` | **PASS** |
| `@deprecated` na `TenderDetailPanelHosted` + `TendersListTab` | **PASS** |
| `console.warn` dev-only przy mount hosted | **PASS** |
| `TENDERS_V4_ROUTING = true` (prod default) | **PASS** |
| Brak usuwania hosted / accordion / rollback | **PASS** |
| Etykieta legacy `overview: "Intelligence"` | **PASS** (bez zmiany) |
| `LIB-TENDER-HOSTED-DEPRECATION-TEUX7F` | **PASS** 17/17 |
| Gate B `scope:tenders` | **PASS** |
| CHANGELOG **2.63.65** | **PASS** |
| Prod verify `version.json` | **DEPLOY PROPAGATING** (push PASS) |

---

## 3. Gapy zamknięte

| Gap | Opis | Status |
|-----|------|--------|
| **G-13** | Dual runtime bez formalnego doc + dev warn | **CLOSED** |

**Defer:** fizyczne usunięcie hosted → osobny bundle Owner GO · **TEUX-7z** po 7f

---

## 4. Boundary (#CORE-013 / #CORE-014)

| Check | Werdykt |
|-------|---------|
| #CORE-013 — jeden cel, jeden commit | **PASS** |
| #CORE-014 — FEATURE allowlista | **PASS** |
| Routing / sync / Payroll / Edge / PWRB / pipeline | **NO DIFF** |
| `tender-ux-tokens.ts` | **NO DIFF** |

---

## 5. Pliki bundla (`e0d4e47`)

| Plik | Rola |
|------|------|
| `docs/architecture/NG-06-TEUX-HOSTED-DEPRECATION.md` | SSOT dual runtime + rollback |
| `src/app/TenderDetailPanel.tsx` | `@deprecated` + dev warn |
| `src/app/tenders/tabs/TendersListTab.tsx` | `@deprecated` JSDoc |
| `src/lib/tenders-v4-config.ts` | Komentarz + link SSOT |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | **2.63.65** |
| `scripts/test-tender-hosted-deprecation-teux7f.mjs` | Guard test 17 |
| `test-infra/test-manifest.json` | `LIB-TENDER-HOSTED-DEPRECATION-TEUX7F` |

---

## 6. Następny krok

**TEUX-7z** — epic closeout smoke agregat (po Owner GO) · **nie** usuwanie hosted w 7z bez osobnej decyzji.
