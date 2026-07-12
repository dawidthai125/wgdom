# NG11-P0 — Tender Pipeline Discovery · CLOSEOUT

> **Program:** NG11-P0 (Discovery Unification + Bootstrap + Transport)  
> **Prod:** UI **2.65.3** @ **`281ede1`** · https://www.wgdom.fun · **PRODUCTION VERIFIED**  
> **Status:** **EPIC COMPLETE** (Owner CLOSEOUT 2026-07-12)  
> **Epic report:** [`NG11-P0-EPIC-CLOSE-REPORT.md`](./NG11-P0-EPIC-CLOSE-REPORT.md)

---

## Werdykt

| Pole | Wartość |
|------|---------|
| **Status** | **EPIC COMPLETE** · **PRODUCTION VERIFIED** |
| **Protected Core** | **GREEN** |
| **Release Quality** | **PASS** |
| **Architecture** | **APPROVED** |
| **Następny stan** | **STABILIZATION WINDOW** |

---

## Slice'y (chronologia)

| Slice | Wersja | Commit | Dostarczone |
|-------|--------|--------|-------------|
| **P0** | 2.65.1 | `f4697f9` | `discoverTenderDocumentsSSOT` · `discoveryMergedItem` · harness **12/12** |
| **P0.1-A** | 2.65.2 | `db927ea` | Deferred bootstrap retry po key drift (RC-1) · **15/15** |
| **P0.2** | 2.65.3 | `281ede1` | Bez `noticeHtml` w GET przy `noticeNumber` (414 fix) · prod smoke **8/8** |

---

## Problem (RCA — skrót)

1. **Fork discovery** — manual „Odśwież BZP” vs Autonomous bootstrap (różne ścieżki).
2. **RC-1 race** — `bootstrapKey` drift podczas inflight → utrata retry.
3. **HTTP 414** — pełny `noticeHtml` w query GET `/tenders-bzp-documents`.

---

## Rozwiązanie (SSOT)

| Element | Plik / moduł |
|---------|----------------|
| Discovery SSOT | `tender-document-discovery-ssot.ts` |
| Bootstrap + retry | `useTenderDocumentsBootstrap.ts` |
| Transport GET | `tender-document-discovery.ts` · `tenders-bzp.ts` `fetchTenderDocuments` |
| Intelligence wire | `useTenderPipelineRuntime.ts` · `TenderDetailPanel.tsx` |

**Edge:** bez zmian w P0.2 (C-lite).

---

## Production verify (final)

| Pole | Wartość |
|------|---------|
| `version.json` | **2.65.3** @ **281ede1** |
| Prod smoke tender | `08deb7df-c8a3-22f4-5fad-9500012bb032` — **PASS** |
| DevTools transport | `tenderId` + `noticeNumber` only · URL **192** znaków · **200** · **7 docs** |

---

## POST RELEASE observation

**CLOSED** wcześniej przez Owner — slice P0.1-A + P0.2 domknęły regresje prod. SSOT historyczny: [`NG11-P0-POST-RELEASE-OBSERVATION.md`](./NG11-P0-POST-RELEASE-OBSERVATION.md).

---

## Następny krok

**STABILIZATION WINDOW** — **NG11-Q4** (optional) lub **TWSL 2.63.91** — wyłącznie po **Owner GO** + AUDIT.

**Nie implementować:** P0.2.1 · POST transport — bez nowego briefu.
