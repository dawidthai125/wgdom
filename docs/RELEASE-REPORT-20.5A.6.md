# Release Report — Sprint 20.5A.6 (Billing Proposal B1)

**Data:** 2026-06-09  
**Wersja UI:** **2.50.44** (lokalnie)  
**Prod baseline:** **2.50.43** (`61cb33b`) — **bez push / bez deploy**

---

## Decyzja architektoniczna

| Wariant | Werdykt | Uzasadnienie |
|---------|---------|--------------|
| A — Direct Create (`kw-recoverable-charges` przez inspektora) | **NO-GO** | Dual-writer, KPI od razu, łamie granicę 20.5A.3A |
| **B1 — Proposal w JobNote** | **GO** | Sync `kw-jobs`, approve przez admina, zgodne z SETTLEMENT-WORKFLOW-AUDIT |

## Flow produkcyjny

```
Inspektor → Zgłoś pozycję (modal)
         → JobNote context=billing_proposal, proposalStatus=pending
         → push kw-jobs ONLY

Admin → Zgłoszenia inspektora (JobRecoverableChargesPanel)
     → Zatwierdź → JobCreateRecoverableChargeModal (prefill)
     → appendRecoverableChargeCreate + commitRecoverableCharges
     → proposalStatus=approved, approvedChargeId
     → push kw-recoverable-charges

     → Odrzuć → proposalStatus=rejected, rejectedReason
     → push kw-jobs ONLY
```

---

## Pliki zmienione / nowe

| Plik | Rola |
|------|------|
| `src/lib/job-wm.ts` | Model `billing_proposal`, helpery CRUD/merge |
| `src/lib/billing-evidence-upload.ts` | `uploadBillingProposalEvidence()` |
| `src/lib/recoverable-charges.ts` | `createChargeDraftFromProposal()` |
| `src/lib/job-activity.ts` | Typy activity: proposal / approved / rejected |
| `src/app/app-domain.ts` | Etykiety activity |
| `src/app/InspectorBillingProposalModal.tsx` | **NOWY** — formularz inspektora |
| `src/app/BillingProposalReviewCard.tsx` | **NOWY** — karta propozycji |
| `src/app/JobRecoverableChargesPanel.tsx` | CTA + sekcje propozycji |
| `src/app/InspectorPanel.tsx` | Submit + upload dowodów |
| `src/app/JobsView.tsx` | Admin approve/reject + modal |
| `src/app/JobCreateRecoverableChargeModal.tsx` | Opcjonalny title/submitLabel/initialDraft |
| `scripts/smoke-test-inspector-billing-proposal-20.5a6.mjs` | **NOWY** — smoke T1–T17 |

## Dokumentacja

- `src/app/changelog-data.ts` → **2.50.44**
- `CHANGELOG.md`, `GuideView.tsx`, `JobListGuidePanel.tsx`
- `docs/ARCHITECTURE.md` § Do rozliczenia
- `CURRENT-TASK.md`

---

## Weryfikacja

| Check | Wynik |
|-------|-------|
| `npm run build` | **PASS** |
| `smoke-test-inspector-billing-proposal-20.5a6.mjs` | **52/52 PASS** (T1–T17) |
| `smoke-test-inspector-billing-20.5a3a.mjs` | **28/28 PASS** |
| `smoke-test-inspector-billing-notes-20.5a4.mjs` | **28/28 PASS** |
| `smoke-test-inspector-billing-evidence-20.5a5.mjs` | **30/30 PASS** |
| `smoke-test-recoverable-charges-create-from-job-20.5a2.mjs` | **ALL PASS** |

---

## Granice sync (must preserve)

- Inspektor: **nigdy** `pushRecoverableChargesToCloud`
- Propozycje **pending** nie wliczają się do KPI/badge 💰
- Approve: jedyny moment zapisu do `kw-recoverable-charges`
- **Nie zmieniono:** `mergeRecoverableCharges`, `deriveChargeAmounts`, settlement ledger

---

## Test manualny (po deploy)

1. Zaloguj inspektor → robota bez pozycji billing → **Zgłoś pozycję** + dowód
2. Zaloguj admin → Roboty → ta robota → **Zgłoszenia inspektora** → Zatwierdź
3. Sprawdź: pozycja w module Do rozliczenia, badge 💰, KPI robota
4. Odrzuć drugą propozycję — status rejected, brak pozycji

---

## Następne kroki

- Review kodu → commit → push `main` → Vercel
- Opcjonalnie: alert Pulpit dla pending proposals (`jobsWithPendingBillingProposals`)
