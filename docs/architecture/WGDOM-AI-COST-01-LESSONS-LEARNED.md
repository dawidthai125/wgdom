# WGDOM — AI-COST-01 Lessons Learned

> **ID:** AI-COST-01-LESSONS  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **COMPLETE** (po EPIC + STAB + RWAT)  
> **Data:** 2026-07-27  
> **Język:** polski

---

## 1. Najważniejsze decyzje

1. **Thin slices S1→S7** zamiast monolitu „AI wycenia wszystko naraz”.  
2. **Koszt bezpośredni ≠ oferta** — Kp/marża wyłącznie w istniejącym Bid Proposal.  
3. **REUSE parserów i katalogu** — zero nowego PDF/ATH parsera w AI-COST.  
4. **Multi-provider cen** (katalog → kategoria → model firmy → heurystyka → CK) zamiast jednego hardcodu.  
5. **Decyzja użytkownika > AI** (STAB-1) — reprice nie kasuje approve/change.  
6. **Fail-loud walidacja** (S7) — oferta może być `not_ready` / `review_required`; to feature, nie bug.  
7. **FIELD READY** wymaga RWAT na realnych ATH, nie tylko unit/smoke.

---

## 2. Odrzucone rozwiązania

| Pomysł | Dlaczego odrzucono |
|--------|-------------------|
| LLM jako P0 klasyfikator / wycena | Brak SSOT, nietestowalność, koszt; reguły + katalog wystarczyły na MVP |
| Osobny kalkulator oferty w AI-COST | Duplikacja Bid Proposal (ZERO DUPLICATE) |
| Scraping cen z Internetu | Zakaz Ownera / ryzyka prawne / niestabilność |
| Auto-naprawa cen bez użytkownika | Ryzyko cichego zaniżenia oferty |
| Traktowanie „PRODUCTION VERIFIED” = „FIELD READY” | PV ≠ praktyczna użyteczność na 302 poz. ATH |

---

## 3. Dlaczego obecna architektura

- **SSOT Bid** chroni spójność ofert w całej aplikacji Przetargi.  
- **Komponenty** dają explainability i edycję bez przebudowy wiersza ATH.  
- **Adapter S6** to cienka granica — łatwy test i brak „drugiej prawdy”.  
- **STAB po RWAT** naprawia realne P1 zamiast zgadywać UX w DF.

---

## 4. Największe błędy RWAT-01 i naprawy (STAB-01)

| P1 RWAT | Objaw | Naprawa STAB |
|---------|-------|--------------|
| **P1-04** | Reprice kasował `user_changed` | Merge preservacji + `aiSuggested*` |
| **P1-03** | ~2000 rekomendacji 1:1 | Grupowanie z licznością + UI expand |
| **P1-02** | „Sprzątanie” → MaterialInstallation | Priorytetowe reguły S3 (porządek/odbiory/próby/docs) |
| **P1-01** | ~30% unpriced | Heurystyka materiału + strategia IndividualAnalysis labor-heavy |

**Po STAB (re-RWAT TP113):** unpriced 252→0 · rekomendacje ~2009→4 grupy · Quality 8→41 · edycja zachowana.

---

## 5. Czego NIE wolno ponownie implementować

1. Drugiego silnika Kp/marży / `recommendedBid`.  
2. Reprice bez ochrony decyzji użytkownika.  
3. Listy rekomendacji bez agregacji na dużych ATH.  
4. Nowego parsera dokumentów „żeby lepiej wyceniać”.  
5. Fuzzy Company Knowledge na nazwach generycznych („Materiał”).  
6. Traktowania heurystycznej ceny jako high-confidence bez review.  
7. Startu AI-COST-02 od przebudowy S1–S7 zamiast punktów rozszerzeń.  
8. Implementacji bez Entry + Gate + (gdy wymagane) Owner GO.

---

## 6. Lekcje procesu

- **RWAT na live KV** wykrył to, czego nie złapały syntetyczne fixture.  
- **Owner GO + DF per slice** utrzymały kontrolę blast radius.  
- **Docs tip w `09`** — nie hardcodować wersji w rules.  
- Cold start kolejnej sesji = **MASTER_HANDOFF → Entry → Freeze/SSOT**, nie historia czatu.
