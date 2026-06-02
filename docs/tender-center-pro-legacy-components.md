# Tender Center PRO — komponenty legacy (ETAP 5A)

Komponenty oznaczone `@legacy` **nie są montowane** w `OwnerDashboard` po ETAPIE 4/5A.

## Lista

| Plik | Zastąpiony przez | Można usunąć? |
|------|------------------|---------------|
| `CompanyHealthCard.tsx` | `CommandCenterHero.tsx` | Tak, po weryfikacji — logika health w lib |
| `GrowthModeSelector.tsx` | Growth Mode pills w `CommandCenterHero` | Tak — duplikat UI |
| `OpportunityRadar.tsx` | `BestOpportunityCard.tsx` | Tak — top-1 wystarcza na dashboardzie |
| `Forecast90Days.tsx` | `ForecastCommandStrip.tsx` | Rozważyć — pełna prognoza (scenariusze A/B) nie jest w PRO |
| `DecisionCenter.tsx` | `BestOpportunityCard` (GO/HOLD/NO-GO) | Tak dla top-1; brak UI dla rank 2–5 w PRO |

## Zależności przed usunięciem

- Brak importów z `OwnerDashboard` / `TenderCenterProView` — potwierdzone ETAP 5A.
- `grep -r "CompanyHealthCard\|GrowthModeSelector\|OpportunityRadar\|Forecast90Days\|DecisionCenter"` w całym repo przed delete.
- Testy lib (`scripts/test-tender-center-*.mjs`) nie importują komponentów UI.

## Rekomendacja ETAP 5B

1. Usunąć pliki legacy po jednym commicie z grep-verification.
2. Ewentualnie zachować `Forecast90Days` jeśli wróci accordion „Prognoza szczegółowa”.
3. Mini-radar (top 2–3) może wymagać fragmentu `OpportunityRadar`, nie całego pliku.
