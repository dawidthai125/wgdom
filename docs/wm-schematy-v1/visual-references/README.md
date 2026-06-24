# WM-SCHEMATY-V1 — Visual References

> **Cel:** referencje wizualne do Visual Gate (Faza 2) i manual review renderera SVG.  
> **SSOT spec:** [`../WM-SCHEMATY-V1-DESIGN-FREEZE.md`](../WM-SCHEMATY-V1-DESIGN-FREEZE.md) § F  
> **Handoff:** [`../SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md`](../SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md) § 8

---

## Status

| Data | Zdarzenie |
|------|-----------|
| 2026-06-24 | Design Freeze — referencje **nie były** w repo (tylko opis w spec) |
| 2026-06-24 | **Dostarczone ponownie** — pliki PNG w tym katalogu |

**Wymaganie przed Fazą 2 (SVG Renderer):** wszystkie 3 obowiązkowe referencje muszą być obecne w repo (spełnione).

---

## Obowiązkowe referencje (Visual Gate)

| Adres | Plik | Profil layout | Obwody | Rola w gate |
|-------|------|---------------|--------|-------------|
| **Benedyktyńska 22/13** | [`benedyktynska-22-13.png`](benedyktynska-22-13.png) | `apartment-3f-v1` | **7** | **PRIMARY** — bloker release MVP (§ F freeze) |
| **Żytnia 18/21** | [`zytnia-18-21.png`](zytnia-18-21.png) | `commercial-3f-v1` (P1) | 6 | Regresja warsztat / 3F bez FR |
| **Pereca 24a/29** | [`pereca-24a-29.png`](pereca-24a-29.png) | `apartment-3f-v1` | **10** | Regresja gęstości · FR 1S 63A · edge case V1.1 |

### Benedyktyńska 22/13 — dane gate (PRIMARY)

- Tytuł: `SCHEMAT JEDNOKRESKOWY INSTALACJI ELEKTRYCZNEJ`
- Adres: `WROCŁAW, UL. BENEDYKTYŃSKA 22/13`
- FR 100A · licznik 3F KWh · C25A 3P · RCD 25A 30mA 4P AC
- Obwody (kolejność): Kuchenka 3P · GN Salon · GN Pokój 1 · GN Pokój 2 · GN Kuchnia · OŚWIETLENIE · OŚWIETLENIE

**PASS:** wygenerowany PDF/SVG musi być „akceptowalny do użytku WM” vs ta referencja (manual review operatora).

---

## Dodatkowa referencja (nie blokuje MVP)

| Adres | Plik | Uwagi |
|-------|------|-------|
| Benedyktyńska 22/14 | [`benedyktynska-22-14.png`](benedyktynska-22-14.png) | Wariant 6 obwodów (brak GN Kuchnia) — porównanie sąsiedniego lokalu |

---

## Użycie w Fazie 2

```text
1. Render SVG/PDF z modelu testowego (szablon § C.1 + adres Benedyktyńska 22/13, 7 obwodów)
2. Side-by-side z benedyktynska-22-13.png
3. Checklist § F.2 DESIGN FREEZE
4. Manual PASS/FAIL — operator
5. Opcjonalnie: regresja Żytnia + Pereca przed release
```

**Nie commitować** wygenerowanych artefaktów testowych do tego katalogu — tylko referencje źródłowe PNG.
