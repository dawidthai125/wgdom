# TENDER-MODERNIZATION-01 / S4 — IMPLEMENT REPORT

> **STATUS:** **IMPLEMENT COMPLETE** · **WAITING OWNER VERIFY** · **NO COMMIT** (czekaj Owner GO)  
> **ID:** TENDER-MODERNIZATION-01-S4-IMPLEMENT  
> **Baseline tip (pre-release):** UI **2.66.22** / **`ec8a5044`**  
> **DF:** [`TENDER-MODERNIZATION-01-S4-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S4-DESIGN-FREEZE.md)  
> **Data:** 2026-08-08

```text
S4-A…F IMPLEMENTED (allowlist only)
Harness S4 37 PASS · S3 41 PASS · S2 45 PASS
Build PASS
NO NEW FLAG · S3 authority NO TOUCH
Commit / push / tip sync = NOT DONE (Owner GO required)
```

---

## Diff allowlist (implemented)

| File | Change |
|------|--------|
| `src/app/TenderWorkflowHubPanel.tsx` | hierarchy ANALIZA→EKSPERCI→DW · Intelligence → recovery · `data-s4-*` · primary PLN attr |
| `src/app/TenderWorkspaceV2Panel.tsx` | Insights title recovery |
| `src/app/chief-dossier/ChiefDossierSurface.tsx` | Trace → EW → Offer Rec |
| `src/app/chief-dossier/ChiefOfferRecommendation.tsx` | secondary PLN chrome |
| `src/app/decision-workspace/DecisionWorkspaceSurface.tsx` | `data-s4-step` walidacja/decyzja |
| `src/app/decision-workspace/DecisionRecommendationPanel.tsx` | secondary PLN chrome |
| `src/app/TenderWorkflowPrimaryAction.tsx` | S4 CTA data attr + copy note |
| `src/app/TenderDetailPage.tsx` | shortcut scroll → `[data-tender-workflow-hub]` |
| `src/lib/tender-command-layer-ux.ts` | label „Hub przetargu” |
| `scripts/test-tender-modernization-01-s4-hub-hierarchy.mjs` | NEW |
| `scripts/test-tender-modernization-s4.mjs` | alias |

**Not staged / OUT:** `useTenderOfferRun.ts` · authority helper · Expert/Chief/Session/Validation BC · Strategy · TRE

---

## Verification

| Check | Result |
|-------|--------|
| AC-S4-1…4 harness | **37 PASS / 0 FAIL** |
| S3 pricing parity | **41 PASS** · MATCH 1 · EXPECTED 12 · UNEXPECTED **0** |
| S2 Dual Outcome | **45 PASS** |
| `npm run build` | **PASS** |
| New flag | **NONE** |
| `resolveAuthoritativeOfferPln` | **NO TOUCH** (runtime asserts PASS) |

---

## Owner Verification (OV-S4-1…12)

Wykonaj na preview / local po Hub recovery (TRE off lub Open Hub):

1. Kolejność Analiza → Eksperci → (Chief Rec) → DW Walidacja → Decyzja  
2. Intelligence tylko w accordion recovery  
3. Chip CL „Hub przetargu” → scroll Hub start  
4. Chief: Trace → EW → Offer Rec  
5. Jeden dominant PLN = Hub headline  
6. Expert ON + Offer null → brak primary headline  
7. CTA Expert ON → DW  

---

## Next

```text
OWNER VERIFY → Owner GO COMMIT (+ tip bump / push / PV / CLOSEOUT)
Rollback = revert implementation commit (po commit)
```
