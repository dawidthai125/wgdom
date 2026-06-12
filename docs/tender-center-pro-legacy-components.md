# Tender Center PRO — komponenty i dane legacy

## Dane legacy — `tenderDashStats` (ETAP 7G)

| Warstwa | Stan |
|---------|------|
| `App.tsx` | `@legacy` — `computeTendersDashboardStats` + `enrichTendersDashboardStats` |
| `DashboardView` | Prop `tendersStats` zachowany, **nieużywany w UI** (`void _legacyTendersStats`) |
| Zastąpione przez | `CommandCenterExecutivePanel` + `useCommandCenterExecutiveSnapshot` |

Szczegóły → [`tender-center-7g-executive.md`](tender-center-7g-executive.md).

---

## Komponenty UI legacy (ETAP 5A)

Komponenty oznaczone `@legacy` **nie są montowane** w `OwnerDashboard` po ETAPIE 4/5A.

## Lista

| Plik | Zastąpiony przez | Można usunąć? |
|------|------------------|---------------|
| `CompanyHealthCard.tsx` | `TendersStrategyHero.tsx` | Tak, po weryfikacji — logika health w lib |
| `GrowthModeSelector.tsx` | Growth Mode pills w `TendersStrategyHero` | Tak — duplikat UI |
| `OpportunityRadar.tsx` | `BestOpportunityCard.tsx` | Tak — top-1 wystarcza na dashboardzie |
| `Forecast90Days.tsx` | `TendersStrategyForecastStrip.tsx` | Rozważyć — pełna prognoza (scenariusze A/B) nie jest w PRO |
| `DecisionCenter.tsx` | `BestOpportunityCard` (GO/HOLD/NO-GO) | Tak dla top-1; brak UI dla rank 2–5 w PRO |

## Zależności przed usunięciem

- Brak importów z `OwnerDashboard` / `TenderCenterProView` — potwierdzone ETAP 5A.
- `grep -r "CompanyHealthCard\|GrowthModeSelector\|OpportunityRadar\|Forecast90Days\|DecisionCenter"` w całym repo przed delete.
- Testy lib (`scripts/test-tender-center-*.mjs`) nie importują komponentów UI.

## Rekomendacja ETAP 5B

1. Usunąć pliki legacy po jednym commicie z grep-verification.
2. Ewentualnie zachować `Forecast90Days` jeśli wróci accordion „Prognoza szczegółowa”.
3. Mini-radar (top 2–3) może wymagać fragmentu `OpportunityRadar`, nie całego pliku.
