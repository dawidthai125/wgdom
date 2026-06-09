# W&G DOM — PROJECT HANDOFF

> **Hasło:** „kontynuuj WGDOM” · **Data:** 2026-06-09  
> **Przed nową pracą:** [`CURRENT-TASK.md`](../CURRENT-TASK.md) → [`AGENTS.md`](../AGENTS.md) → [`ARCHITECTURE.md`](ARCHITECTURE.md)

---

## Baseline produkcyjny

| Pole | Wartość |
|------|---------|
| **Wersja UI** | **2.50.44** |
| **Commit (feature)** | **`99295e5`** — `feat(billing): add inspector billing proposal workflow (20.5A.6)` |
| **Deploy** | **`4990132607`** — **SUCCESS** |
| **Status** | **STABLE** |
| **Production** | https://www.wgdom.fun · https://www.wgdom.online |
| **Repo HEAD** | `f87f485` (docs post-release; feature = `99295e5`) |

**Brak aktywnych blockerów.** **Brak aktywnych incydentów.**

---

## Ostatni release — 20.5A.6 / 2.50.44

**Inspector Billing Creation** (wariant **B1** — Billing Proposal)

### Funkcje

- Billing Proposal Workflow
- Proposal Evidence
- Admin Approve / Reject
- RecoverableCharge Creation
- Approve Idempotency (P1 post-audit)
- Duplicate Charge Protection

### Decyzja architektoniczna

```text
Inspektor  → kw-jobs only          (JobNote context=billing_proposal)
Admin      → kw-recoverable-charges (po approve — RecoverableCharge)
```

**Bez dual-writer billing.** Inspektor **nie** wywołuje `pushRecoverableChargesToCloud`.

### Jakość (release)

| Check | Wynik |
|-------|-------|
| Build | **PASS** |
| Smoke 20.5A.6 | **59/59 PASS** |
| Regresja 20.5A.2–5 | **PASS** |
| Prod smoke | **9/9 PASS** (obie domeny) |
| CI Mobile | run `27209115716` **SUCCESS** |

**Raport:** [`RELEASE-REPORT-20.5A.6.md`](RELEASE-REPORT-20.5A.6.md)  
**Handoff billing:** [`SESSION-HANDOFF-20.5A-BILLING-JOBS.md`](SESSION-HANDOFF-20.5A-BILLING-JOBS.md)

### Kluczowe pliki 20.5A.6

| Plik | Rola |
|------|------|
| `src/lib/job-wm.ts` | Model `billing_proposal`, approve/reject, merge |
| `src/lib/recoverable-charges.ts` | `createChargeDraftFromProposal`, tag `proposal:{id}`, dedup lookup |
| `src/lib/billing-evidence-upload.ts` | `uploadBillingProposalEvidence` |
| `src/app/InspectorBillingProposalModal.tsx` | Formularz inspektora |
| `src/app/BillingProposalReviewCard.tsx` | Karta propozycji + approve/reject |
| `src/app/InspectorPanel.tsx` | Submit proposal → `kw-jobs` |
| `src/app/JobsView.tsx` | Admin approve/reject + idempotency guards |
| `scripts/smoke-test-inspector-billing-proposal-20.5a6.mjs` | Smoke T1–T20 |
| `scripts/smoke-prod-bundle-2.50.44.mjs` | Prod bundle verify |

---

## Zamknięte serie (nie zmieniaj bez polecenia)

| Seria | Wersja | Handoff |
|-------|--------|---------|
| CC polonizacja 20.3B+ | 2.50.43 `61cb33b` | [`SESSION-HANDOFF-20.3B-CC-POLISH.md`](SESSION-HANDOFF-20.3B-CC-POLISH.md) |
| Desktop / mobile / MID-B | 2.50.x | [`SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md`](SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md) |
| Billing 20.3A–20.5A.6 | 2.50.44 `99295e5` | [`SESSION-HANDOFF-20.5A-BILLING-JOBS.md`](SESSION-HANDOFF-20.5A-BILLING-JOBS.md) |
| Payroll carry | 20.1B `74e65d9` | [`SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md`](SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md) |
| Performance 2.x | `35614f0` | [`SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md`](SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md) |

---

## Następny backlog (tylko na polecenie)

| Opcja | Opis |
|-------|------|
| **20.3C** | Legacy CC + GuideView + retro-changelog |
| **Roboty 2.0 FULL** | Audyt / implementacja pełna |
| **P2 billing** | Dashboard alert prefiks proposal, orphan cleanup — poza scope 20.5A.6 |

---

## Proces pracy (obowiązkowy)

```text
AUDIT → RCA → PLAN → IMPLEMENT
```

1. **AUDIT** — read-only; mapa plików, sync boundaries, regresje
2. **RCA** — decyzja GO/HOLD/NO-GO (np. wariant B1 vs direct create)
3. **PLAN** — zakres, etapy, smoke; akceptacja przed kodem
4. **IMPLEMENT** — minimalny diff; chmura → CHANGELOG → HelpView → ARCHITECTURE

**Deploy:** push `main` → Vercel auto-deploy. **Supabase:** tylko gdy zmienia się Edge Function.

---

## Szybki start agenta

```text
1. CURRENT-TASK.md
2. AGENTS.md
3. docs/ARCHITECTURE.md          (§ 11 sync, § Do rozliczenia, § 15.1 widoki)
4. docs/PROJECT-HANDOFF.md       ← ten plik
5. docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md
6. docs/SESSION-HANDOFF-20.3B-CC-POLISH.md
```
