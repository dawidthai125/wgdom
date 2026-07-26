# WGDOM — AP2-S0 DESIGN FREEZE (Semantyka przedmiaru / kosztorys ≠ błąd)

> **ID:** AP2-S0  
> **Parent:** WGDOM-ANALIZA-PRZETARGOW-2.0  
> **STATUS:** **FROZEN** · **Owner GO YES** (2026-07-26)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **AUDIT:** [`WGDOM-ANALIZA-PRZETARGOW-2.0-AUDIT.md`](WGDOM-ANALIZA-PRZETARGOW-2.0-AUDIT.md)

```text
One Bundle = One Goal: semantyka „przedmiar wystarczy / brak kosztorysu = INFO”
```

---

## 1. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-data-ssot.ts` | `canPrepareValuation` · copy `resolvedCostStatusDisplay` |
| `src/lib/tender-trust-layer.ts` | NOT_FOUND → info/partial · FOUND_NO_VALUE messages · pricing non-error |
| `src/lib/tender-intelligence-overlay.ts` | `resolveConfidence` bez force-low na brak kosztorysu |
| `src/lib/tender-kosztorys-process-phase.ts` | E10 copy (info) |
| `src/lib/tender-dossier-pipeline.ts` | 7Z / status line copy (bez „Nie znaleziono kosztorysu” jako primary) |
| `src/lib/tenders-bid-prep.ts` | missing display/hint align |
| `src/lib/tender-documents-tab-summary.ts` | slot kosztorys „Nie dostarczono” |
| `src/app/GuideView.tsx` | FAQ 7Z align (copy only) |
| `scripts/test-ap2-s0-valuation-semantics.mjs` | **NOWY** smoke SSOT |
| `scripts/test-*.mjs` | asercje copy / confidence / trust (minimal) |
| `docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S0-*.md` | DF + RELEASE |
| `CURRENT-TASK.md` | status slice |
| `src/app/changelog-data.ts` | wpis release (jeśli wymagany workflowem FE) |

---

## 2. OUT

- Pricing Gate (`canComputeTenderPricingAuto`) — **bez zmian** (S6)
- Autonomous Gate / fingerprint / timeline — **bez zmian**
- Nowi agenci / BundleV2 / KPI strip / fullscreen — **S1+**
- `DocumentRole` enum expansion — **S1**
- Rename przycisku „Przeanalizuj…” — **S2**
- cloud-sync / Payroll / Edge / App shell
- OCR / LLM

---

## 3. Kontrakt semantyki

| Stan | `canPrepareValuation` | Trust kosztorys | Confidence |
|------|----------------------|-----------------|------------|
| `FOUND_WITH_VALUE` | `true` | trusted/partial (jak dziś) | z sygnałów jakości |
| `FOUND_NO_VALUE` | `true` | **partial** + info przedmiar | **nie** force-low |
| `NOT_FOUND` (scan done) | `false` | **partial** + **info** `kosztorys_not_provided` | **nie** force-low tylko z tego |
| PDF CASE 3 / tech fail | n/a | **blocked** (błąd techniczny) | bez zmian |

**Copy SSOT (PL):**

- Brak kosztorysu: `Zamawiający nie udostępnił kosztorysu inwestorskiego.`
- Przedmiar OK: `Wykryto przedmiar robót — możliwe przygotowanie wyceny.`

---

## 4. AC

1. Przedmiar (`FOUND_NO_VALUE`) → `canPrepareValuation === true` + pozytywny copy.
2. `NOT_FOUND` po skanie → brak severity `error` / level `blocked` wyłącznie z braku kosztorysu.
3. Confidence nie spada do `low` wyłącznie przez `!kosztorys.ok` / `NOT_FOUND`.
4. Pricing Gate kod niezmieniony.
5. typecheck · lint · build · testy PASS.
6. Release report · commit · push · PV.

---

## 5. Test plan

- `npx vite-node scripts/test-ap2-s0-valuation-semantics.mjs`
- `npx vite-node scripts/test-tender-trust-layer.mjs`
- `npx vite-node scripts/test-v31-tender-intelligence.mjs`
- `npx vite-node scripts/test-p3-ux-analysis-status.mjs`
- `npx vite-node scripts/test-tender-dossier-pipeline.mjs` (copy 7Z)
- `npm run build` (+ typecheck/lint wg package scripts)

---

**FROZEN** · IMPLEMENT dozwolony
