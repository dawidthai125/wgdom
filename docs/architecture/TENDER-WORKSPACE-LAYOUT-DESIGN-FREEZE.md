# TENDER-WORKSPACE-LAYOUT — Design Freeze v1.0

**Status:** APPROVED (Owner GO 2026-07-11)  
**Program:** TENDER-WORKSPACE-LAYOUT  
**Baseline:** v2.63.91

---

## Principles

| ID | Zasada |
|----|--------|
| **#TWSL-001** | Native `<details>` only — bez Radix |
| **#TWSL-002** | Summary frozen — `min-h-[44px]`, copy „rozwiń” |
| **#TWSL-003** | Body cap + internal scroll — max-height + `overflow-y-auto` + `overscroll-contain` |
| **#TWSL-004** | Zero logiki biznesowej w komponencie — `open` tylko z rodzica |
| **#TWSL-005** | Preserve hooks — `data-tender-*-accordion`, `id="tender-progress-accordion"` |
| **#TWSL-006** | Tier A only v1 — 3 accordiony tab Przetarg |
| **#TWSL-007** | TOKEN layout w `tender-ux-tokens.ts` |

---

## API (frozen)

```tsx
TenderScrollableAccordion({
  title: ReactNode;
  children: ReactNode;
  dataAttr: string;        // suffix → data-tender-{dataAttr}
  id?: string;
  defaultOpen?: boolean;
  open?: boolean;
  bodyClassName?: string;
  variant?: "workspace-card";  // default; jedyny wariant v1
})
```

---

## Tokeny wysokości

| Breakpoint | max-height body |
|------------|-----------------|
| default | 280px |
| sm | 300px |
| lg | 320px |

---

## Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| **AC-TWSL-01** | Po `open` wysokość `<details>` ≤ summary + token max-h |
| **AC-TWSL-02** | Portfolio / Action Bar `top` stabilne przy toggle |
| **AC-TWSL-03** | `data-tender-progress-accordion` + `id="tender-progress-accordion"` |
| **AC-TWSL-04** | `open={blockersCount > 0}` bez regresji |
| **AC-TWSL-05** | Summary touch ≥ 44px |
| **AC-TWSL-06** | Długa treść — scroll wewnątrz body |
| **AC-TWSL-07** | Testy NG-03 grep PASS |
| **AC-TWSL-08** | Po dynamicznej zmianie treści body wysokość wrappera stała; zmienia się wyłącznie wewnętrzny scroll |

---

## Poza zakresem

NG-10 S1 · Command Layer · Tier B/C accordiony · Pipeline · Sync
