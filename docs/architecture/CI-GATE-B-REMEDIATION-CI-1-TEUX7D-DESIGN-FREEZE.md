# CI GATE B REMEDIATION — CI-1 (TEUX-7d) · DESIGN FREEZE + CLOSEOUT

> **Status:** **CI-1 CLOSED** (local VERIFY PASS · `LIB-TENDER-COPY-TEUX7D`)  
> **Data:** 2026-07-24  
> **Tip baseline:** UI **2.65.44** / `627d217`  
> **Zakaz:** zmiany `GuideView` treści · UI · Theme · Payroll · Cloud Sync · ARCH app  
> **Next:** CI-2 tylko po Owner GO

---

## 1. RCA (CONFIRMED)

| Element | Fakt |
|---------|------|
| Failing assert | `GuideView Przetargi section no \bAI\b in strings` |
| Skrypt | `scripts/test-tender-copy-teux7d.mjs` L41–50 |
| Slice as-is | `indexOf('id:"tenders"')` → `indexOf('id:"directory"')` |
| GuideView order | `tenders` → **`ng10-autonomous-agent`** → `directory` |
| Hit | FAQ Autonomous Agent: „agentów **AI**” (celowy copy NG-10) |
| Klasa | **False positive** — test scope ≠ etykieta „Przetargi section” |

**Nie** jest to regresja TEUX-7d produkcyjnego copy Przetargów (lista/CTA/TendersView — PASS).

---

## 2. PLAN (preferencja Owner)

1. **Zawęzić koniec slice** do początku `id:"ng10-autonomous-agent"` (preferowane).  
2. Fallback: exclude ng10 — niepotrzebne jeśli (1).  
3. Allowlista — **OUT** (niepotrzebna przy (1)).

---

## 3. DESIGN FREEZE

| Reguła | Treść |
|--------|--------|
| **IN** | Tylko `scripts/test-tender-copy-teux7d.mjs` |
| **Slice** | Start: `id:"tenders"` · End: `id:"ng10-autonomous-agent"` (exclusive) |
| **Fallback end** | Jeśli brak ng10 marker → `id:"directory"` (nie łamie starszych snapshotów) |
| **Asserty Przetargi** | Bez zmian semantyki: Podpowiedzi listy · no „Komunikaty AI” · no `\bAI\b` w **samej** sekcji Przetargi |
| **OUT** | `GuideView.tsx` · wszelki `src/app` produkcyjny · inne skrypty Gate B · CI-2 |
| **DoD** | `npx vite-node scripts/test-tender-copy-teux7d.mjs` → 0 FAIL · Gate B `--scope tenders` bez `LIB-TENDER-COPY-TEUX7D` FAIL |

---

## 4. OWNER GO

Implicit via prompt „AUDIT → … → IMPLEMENT”. Implementacja poniżej.
