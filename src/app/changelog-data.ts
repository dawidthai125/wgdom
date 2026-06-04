/** Przy nowych funkcjach uzupełnij: CHANGELOG (ten plik), GuideView helpSections, navItems.hint, LabelWithHint. */

export type ChangelogItemType = "new" | "fix" | "improve";

export interface ChangelogRelease {
  date: string;
  version: string;
  label: string;
  items: { type: ChangelogItemType; text: string }[];
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    date:"2026-06-04", version:"2.45.33", label:"Roboty 2.1A — przebudowa układu listy robót",
    items:[
      {type:"improve", text:"Lista robót — układ: CTA → KPI (pasek poziomy) → szukaj → fazy → lista; filtry operacyjne tylko z KPI (bez drugiego rzędu chipów)"},
      {type:"improve", text:"Filtry ▼ — pracownik, tryb masowy i legenda w zwijanym panelu obok wyszukiwarki"},
      {type:"improve", text:"Karta na liście — adres + status, klient • termin, badge BZP → Ekipa → WM (tylko prezentacja, logika 2.0 bez zmian)"},
    ],
  },
  {
    date:"2026-06-04", version:"2.45.32", label:"Roboty 2.0 MIN — KPI i pilność na liście",
    items:[
      {type:"new", text:"Lista robót — pasek KPI (w toku, do odbioru, bez ekipy, BZP, WM po terminie); klik włącza filtr lub chip"},
      {type:"improve", text:"Chipy: Bez ekipy, Tylko BZP, WM po terminie — sort pilności w grupie miesiąca"},
      {type:"improve", text:"Karta listy — badge BZP, Ekipa: 0/N, termin kontraktu (bez zmian sync i panelu pracownika)"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.31", label:"Pracownik — status i termin kontraktu (FAZA 9.0.1)",
    items:[
      {type:"improve", text:"„Twoje kontrakty” — status (etap realizacji lub status listy) i termin start–koniec z roboty"},
      {type:"improve", text:"Tylko odczyt pól Job — bez zmian grafiku, listy płac i przetargów"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.30", label:"Pracownik — Twoje kontrakty (FAZA 9.0)",
    items:[
      {type:"new", text:"Tryb pracownika — sekcja „Twoje kontrakty” (plan ekipy z roboty admina), poniżej „Wszystkie roboty w toku”"},
      {type:"improve", text:"Ten sam ekran zdjęć i raportów po kliknięciu — bez zmian grafiku, listy płac i przetargów"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.29", label:"Roboty — planowa ekipa realizacyjna (ETAP 8.5 FULL)",
    items:[
      {type:"new", text:"Baner „Realizacja kontraktu” — lider i ekipa (multi-select z kartoteki), zapis do roboty i chmury"},
      {type:"new", text:"Lista robót — badge „Ekipa: N” gdy przypisano planowych wykonawców"},
      {type:"improve", text:"Bez wpisów czasu pracy i bez zmian listy płac — tylko pola executionLeadDirectoryId i executionAssigneeDirectoryIds w kw-jobs"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.28", label:"Roboty — Rozpocznij realizację kontraktu (ETAP 8.5 MIN)",
    items:[
      {type:"new", text:"Baner przetargu w Robotach — przycisk „Rozpocznij realizację” (etap W realizacji, status W trakcie, wpis w historii)"},
      {type:"improve", text:"Bez nowych pól w chmurze — używa jobPhase, handoverStage i activityLog jak dotychczas"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.27", label:"Przetargi — daty SWZ w robocie (ETAP 8.4)",
    items:[
      {type:"improve", text:"Utwórz robotę — dodatkowe terminy z SWZ (okres w dniach/miesiącach, data „do …”) gdy brak daty umowy lub liczby dni z analizy"},
      {type:"fix", text:"Priorytet bez zmian: najpierw data umowy + dni z SWZ; tekstowe terminy tylko jako bezpieczny fallback"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.26", label:"Pulpit — wygrane bez roboty + CTA (ETAP 8.3)",
    items:[
      {type:"new", text:"Pulpit COMMAND CENTER — KPI „Wygrane bez roboty” oraz przyciski Utwórz / Otwórz robotę przy wygranych"},
      {type:"improve", text:"Action Center na Pulpicie — realizacja wygranych (won-realization) z tymi samymi akcjami co w COMMAND CENTER"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.25", label:"Roboty — realizacja kontraktu po przetargu (ETAP 8.2)",
    items:[
      {type:"improve", text:"Utwórz robotę — planowany odbiór WM z terminem realizacji; dokumenty zsynchronizowane po skopiowaniu plików z przetargu"},
      {type:"improve", text:"Baner realizacji kontraktu w Robotach (kwota, terminy, link do BZP)"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.24", label:"Przetargi — mapowanie roboty z wygranego (ETAP 8.1)",
    items:[
      {type:"improve", text:"Utwórz robotę — kwota wygranej oferty (BZP) ma pierwszeństwo przed wartością z SWZ"},
      {type:"improve", text:"Data umowy i termin realizacji (dni z analizy SWZ) trafiają do roboty, gdy są w danych przetargu"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.23", label:"Przetargi — wspólny pipeline Classic × CC (ETAP 8.0A)",
    items:[
      {type:"fix", text:"Classic View i COMMAND CENTER korzystają z jednego pipeline — „Otwórz robotę” widoczne od razu bez odświeżania strony"},
      {type:"improve", text:"Wejście w widok klasyczny odświeża listę z pamięci (bez ponownego pobierania BZP)"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.22", label:"COMMAND CENTER — utwórz robotę z wygranego (ETAP 8.0)",
    items:[
      {type:"new", text:"COMMAND CENTER — „Utwórz robotę” / „Otwórz robotę” przy wygranym przetargu (okazja, briefing, akcje)"},
      {type:"improve", text:"Wspólny handler tworzenia roboty z przetargu — Classic i CC bez duplikacji logiki"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.21", label:"COMMAND CENTER — uproszczenie UX (ETAP 7G.1)",
    items:[
      {type:"improve", text:"„Co wymaga uwagi” — max 5 pozycji, widok skrócony, „Pokaż wszystkie”, szczegóły na żądanie"},
      {type:"improve", text:"Kolejność sekcji: briefing → okazja → zdolność finansowa → kondycja → akcje → prognoza"},
      {type:"fix", text:"Zdolność finansowa przywrócona w COMMAND CENTER (jak na Pulpicie)"},
      {type:"improve", text:"Mniej duplikatów — Hero bez głównej akcji; kompaktowy briefing"},
    ],
  },
  {
    date:"2026-06-02", version:"2.45.20", label:"Sync — godziny nie przechodzą na nowy tydzień",
    items:[
      {type:"fix", text:"Scalanie chmury — godziny z poprzedniego tygodnia nie wskakują na bieżący Pn–So po rollover / odzyskaniu bazy"},
      {type:"fix", text:"Gdy jedno urządzenie ma pustą listę a drugie starą — wygrywa pusta (nowy tydzień bez archiwum)"},
      {type:"fix", text:"Wybór weekFrom/weekTo — przy rozjechanych datach preferowany nowszy tydzień, nie „bogatsza” stara lista"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.19", label:"Lista płac — Rozliczony trzyma się u każdej osoby (sync)",
    items:[
      {type:"fix", text:"Scalanie listy płac — duplikat tej samej osoby (inny id) nie zostawia „Oczekuje”; wygrywa rozliczony"},
      {type:"fix", text:"Archiwum — status Rozliczony dopasowany po imieniu / kartotece, nie tylko po starym id wpisu"},
      {type:"fix", text:"Po oznaczeniu Rozliczony szybki zapis do chmury (~0,4 s) — odświeżenie nie cofa ostatniej osoby"},
      {type:"fix", text:"Ignorowanie fałszywego „oczekuje” z błędnego syncu (ten sam czas co edycja godzin)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.18", label:"Lista płac — status Rozliczony nie znika po syncu",
    items:[
      {type:"fix", text:"Scalanie chmury — remis settledUpdatedAt nie cofa rozliczenia; przy remisie wygrywa „rozliczony”"},
      {type:"fix", text:"Pull z chmury (telefon / powrót do karty) — merge nie nadpisuje settledUpdatedAt fałszywym timestampem"},
      {type:"fix", text:"Oznaczenie Rozliczony aktualizuje też archiwum tygodnia (przywrócenie z archiwum nie gubi statusu)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.17", label:"Optymalizacja faza 2 krok 2 — Roboty + Lista płac poza głównym bundle",
    items:[
      {type:"improve", text:"Lazy load: JobsView (~94 KB) i PayrollView (~54 KB) — ładowane przy wejściu w Roboty / Lista płac"},
      {type:"improve", text:"app-domain.ts — typy i helpery domenowe wydzielone z App.tsx (~4300 linii mniej w monolicie)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.16", label:"Optymalizacja faza 2 — Instrukcja/Changelog poza głównym bundle",
    items:[
      {type:"improve", text:"Lazy load: Instrukcja + Changelog (GuideView) — ~2300 linii mniej w głównym JS"},
      {type:"improve", text:"changelog-data.ts — historia wersji w osobnym module ładowanym na żądanie"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.15", label:"Optymalizacja Web + Mobile — lazy load, mniejszy bundle",
    items:[
      {type:"improve", text:"Lazy load: Przetargi, Inspektor admin, Pliki robot, muzyka — szybszy start na telefonie"},
      {type:"improve", text:"Code split: panel-tenders, pdfjs, preconnect Supabase, mobile scroll (overscroll-behavior)"},
      {type:"improve", text:"docs/OPTIMIZATION.md — audyt Web + iOS/Android/PWA"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.14", label:"Lista płac — nowy tydzień od niedzieli 20:00",
    items:[
      {type:"improve", text:"Nd od 20:00 — auto-archiwum + przejście na nadchodzący tydzień Pn–So (gdy wszyscy rozliczeni); Nd przed 20:00 bez zmian"},
      {type:"fix", text:"Alerty rozliczenia także gdy tydzień zostaje w tyle po Nd 20:00; logika w payroll-cycle.ts"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.13", label:"Docs AI — START HERE, PROJECT-GUIDE, CURRENT-TASK",
    items:[
      {type:"new", text:"PROJECT-GUIDE.md, CHANGELOG.md, CURRENT-TASK.md — struktura dla agentów AI (wznowienie sesji)"},
      {type:"improve", text:"AGENTS.md START HERE + Known Issues; reguły Cursor; ARCHITECTURE v2.45.12 (mapa OSM)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.12", label:"Przetargi — mapa OSM i słownik kluczowych",
    items:[
      {type:"fix", text:"Mapa przetargów Wrocław — kafelki OpenStreetMap zamiast pustego SVG (ulice, rzeka, markery)"},
      {type:"improve", text:"Słownik słów kluczowych — podgląd wbudowanych haseł, licznik wbudowanych/własnych, wyjaśnienie roli scoringu"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.11", label:"Docs — ARCHITECTURE/AGENTS dla AI (v2.45.7–10)",
    items:[
      {type:"improve", text:"ARCHITECTURE.md § 12.1.1–12.1.2 — przetargi v2.45.7–10, galeria ZIP, mapa SVG, endpoint award-result"},
      {type:"improve", text:"AGENTS.md, ROZWOJ.md, wgdom-stan-projektu — skrót dla przyszłych agentów AI"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.10", label:"Galeria admin — pobieranie ZIP roboty",
    items:[
      {type:"new", text:"Zakładka Galeria (admin): pobierz ZIP całej roboty lub pojedynczej kategorii (przed / w trakcie / po)"},
      {type:"improve", text:"Pliki w ZIP: foldery wg kategorii, nazwa ulica + data + numer zdjęcia"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.9", label:"Przetargi — naprawa mapy Wrocław",
    items:[
      {type:"fix", text:"Mapa przetargów — SVG zamiast niedziałającego staticmap.openstreetmap.de"},
      {type:"improve", text:"Mapa zwijana jak profil firmy i słownik słów kluczowych"},
      {type:"improve", text:"Mapa widoczna zawsze w sekcji Przetargi (domyślnie zwinięta)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.8", label:"Przetargi — akcje, auto-wyniki, alerty pulpitu",
    items:[
      {type:"new", text:"Chipy „wymaga działania” — filtry: termin bez wyceny, wadium, kosztorys, referencje"},
      {type:"new", text:"Auto-pobieranie wyników BZP po terminie (status wygrany/przegrany)"},
      {type:"improve", text:"Referencje vs SWZ — konkretna luka w PLN w dopasowaniu i na karcie ofertowej"},
      {type:"new", text:"Porównanie cen po wyniku: szacunek vs wygrana vs wartość SWZ"},
      {type:"new", text:"Termin ofert → kalendarz (.ics) + alerty przetargów na pulpicie"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.7", label:"Przetargi — SWZ, wadium, wyniki, mapa, pakiet PDF",
    items:[
      {type:"improve", text:"Analiza SWZ (pdf.js): kryteria oceny, fragmenty tabel, wadium jako % wartości"},
      {type:"new", text:"Eksport „Pakiet wyceny” — PDF z checklistą, wadium, dopasowaniem i propozycją oferty"},
      {type:"new", text:"Wadium — kalkulator + blokada gdy przekracza limit profilu (badge na liście)"},
      {type:"new", text:"Wyniki postępowań — pobieranie z BZP (kto wygrał, za ile)"},
      {type:"new", text:"Mapa przetargów Wrocław — aktywne postępowania na mapie OSM"},
      {type:"new", text:"Historia wersji „Nasz szacunek” przy ręcznej edycji i z kalkulatora"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.6", label:"Profil firmy — MOPS Owsiana 2024 wygrany",
    items:[
      {type:"fix", text:"Profil przetargów: MOPS ul. Owsiana 2024 — wygrany przetarg, roboty w terminie (wcześniej błędnie jako udział)"},
      {type:"improve", text:"Schema profilu v6 — odświeżenie danych przy wejściu w Przetargi"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.5", label:"Przetargi — karta ofertowa i czytelna analiza SWZ",
    items:[
      {type:"new", text:"Karta ofertowa: checklist (termin, wartość, wadium, kosztorys, kryteria, wycena) — widać czego brakuje"},
      {type:"fix", text:"Analizuj SWZ pokazuje konkretny wynik (wartość, wadium) zamiast pustego toastu; działa też na załącznikach PDF"},
      {type:"improve", text:"Lista przetargów: wartość, wadium i status kosztorysu w wierszu bez rozwijania"},
      {type:"improve", text:"Dopasowanie i kalkulator oferty na wierzchu — nie schowane w szczegółach"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.4", label:"Przetargi — BIP tylko dla tego postępowania",
    items:[
      {type:"fix", text:"Dokumenty u zamawiającego: bez crawl całego BIP — tylko linki z ogłoszenia + wyszukiwanie po tytule/numerze BZP"},
      {type:"fix", text:"Max 3 pliki, filtrowane pod tytuł postępowania — koniec z pobieraniem obcych PDF-ów"},
      {type:"fix", text:"Nazwy plików BZP: zamiast „dokument” — Załącznik 1.pdf, 2.pdf… (czytelne etykiety)"},
      {type:"improve", text:"Rozwinięty przetarg uproszczony: dokumenty na górze, reszta w „Szczegóły, kosztorys, dopasowanie”"},
      {type:"improve", text:"Jedna sekcja Dokumenty (BZP + BIP + wgrane), bez auto-szukania w tle"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.3", label:"Blank page — naprawa workEntries null",
    items:[
      {type:"fix", text:"Szybszy start — ekran logowania/panel po pobraniu z chmury, zapis push w tle (nie czeka na batch-set)"},
      {type:"fix", text:"Roboty z workEntries: null lub wpis kartoteki w kw-jobs nie wywalają aplikacji po zalogowaniu"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.2", label:"Chmura — naprawa sync + odzysk listy płac",
    items:[
      {type:"fix", text:"Czerwona chmurka: batch-set nie pada już na null w profilu firmy przetargów"},
      {type:"fix", text:"Sync najpierw scala dane z chmury (archiwum wraca) — potem zapis; błąd push nie czyści UI"},
      {type:"fix", text:"Pusta lista płac automatycznie przywraca się z archiwum dla bieżącego tygodnia"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.1", label:"Lista płac — niedziela zamiast soboty, spójność",
    items:[
      {type:"fix", text:"Niedziela wciąż pokazuje tydzień Pn–So (wypłaty w sobotę) — lista nie znika o 4:00 w niedzielę"},
      {type:"fix", text:"Auto-archiwum w niedzielę (nie w sobotę), tylko gdy wszyscy oznaczeni jako rozliczeni"},
      {type:"fix", text:"Brak fałszywych alertów spójności gdy nowy tydzień bez listy płac"},
      {type:"fix", text:"Nie przechodzi do nowego tygodnia dopóki są nierozliczeni pracownicy"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.0", label:"Przetargi — pełne zarządzanie sekcją",
    items:[
      {type:"new", text:"Sync chmury kw-tenders-* (pipeline, profil, słownik) + merge między urządzeniami"},
      {type:"new", text:"Usuń z listy, eksport CSV, tryb masowy (status / usuwanie)"},
      {type:"new", text:"Panel słownika słów kluczowych + edycja referencji/wygranych w profilu firmy"},
      {type:"new", text:"Ustawienia Super Admina: skan BZP (dni/strony/auto-sync) + reset sekcji przetargów"},
      {type:"improve", text:"Backup JSON obejmuje dane przetargów; auto „Obejrzany” przy rozwinięciu"},
    ],
  },
  {
    date:"2026-05-30", version:"2.44.1", label:"Przetargi — walidacja i poprawki kalkulatora",
    items:[
      {type:"fix", text:"Kalkulator oferty — usunięte podwójne liczenie marży; rekomendacja = próg opłacalności"},
      {type:"fix", text:"Dopasowanie przetargu działa też przy wartości z kosztorysu ATH (bez pełnej SWZ)"},
      {type:"fix", text:"Dokumenty BIP nie nadpisują dobrego kosztorysu z e-Zamówień; błędy discover widoczne w panelu"},
      {type:"fix", text:"Serwer: SSRF (10.x), dopasowanie plików po słowach kluczowych, zsynchronizowane portale BIP"},
      {type:"improve", text:"Profil firmy — clamp wartości kosztów (ujemne stawki, >100% marży itp.)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.44.0", label:"Przetargi — dokumenty z BIP i linków w ogłoszeniu",
    items:[
      {type:"new", text:"Auto-wykrywanie linków SWZ/BIP w ogłoszeniu BZP + panel „Dokumenty u zamawiającego”"},
      {type:"new", text:"Pobieranie plików z portali urzędów (Wrocław, MOPS, MPWiK…) — ten sam parser SWZ/ATH"},
      {type:"improve", text:"Kosztorys i wartość zamówienia uzupełniane z dokumentów spoza e-Zamówień"},
    ],
  },
  {
    date:"2026-05-25", version:"2.43.1", label:"Scroll — profil firmy i nagłówki",
    items:[
      {type:"fix", text:"Przetargi — profil firmy i filtry w jednym obszarze przewijania (kółko myszy działa wszędzie)"},
      {type:"fix", text:"Grafik, Roboty, Instrukcja — scroll z nagłówka przekierowany do listy poniżej"},
    ],
  },
  {
    date:"2026-05-25", version:"2.43.0", label:"Koszty robót i przetargów — lista płac + poboczne",
    items:[
      {type:"new", text:"Roboty — koszt robocizny + poboczne (ZUS, paliwo 3 aut, narzędzia, BHP, Kp) i min. cena z marżą"},
      {type:"improve", text:"Model kosztów z listy płac: 13 os., ~28,6 zł/h brutto, Kp remonty 14%, zysk 8%"},
      {type:"improve", text:"Przetargi — kalkulator uwzględnia koszty poboczne tygodniowe i realne stawki ekipy"},
      {type:"improve", text:"Profil firmy — edycja paliwa, narzędzi, gruzu, ubezpieczeń (tygodniowy udział)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.42.0", label:"Przetargi — kalkulator ceny ofertowej",
    items:[
      {type:"new", text:"Propozycja ceny startowej: robocizna (rbh+ZUS), materiały, Kp, stałe 15 os., marża"},
      {type:"new", text:"Warianty: agresywna / rekomendowana / bezpieczna — z uwzględnieniem wagi ceny w SWZ"},
      {type:"improve", text:"Profil firmy — model kosztów (stawki, indeksy, stałe miesięczne) edytowalny w chmurze"},
    ],
  },
  {
    date:"2026-05-25", version:"2.41.0", label:"Przetargi — DOCX/XLSX/ZIP, pdf.js, auto-szacunek ATH",
    items:[
      {type:"new", text:"Auto „Nasz szacunek” z sumy kosztorysu po pobraniu załączników BZP"},
      {type:"new", text:"Podgląd DOCX (tekst SWZ), XLSX (tabela pozycji SheetJS), ZIP (lista + auto-pick ATH/PDF)"},
      {type:"improve", text:"PDF przez pdf.js — ekstrakcja tekstu SWZ, ostrzeżenie o skanach bez OCR"},
      {type:"improve", text:"Dopasowanie przetargu uwzględnia wartość z kosztorysu ATH i opisy pozycji"},
      {type:"improve", text:"Karta kosztorysu — skrót pozycji + link „Pełny podgląd” zamiast pełnej tabeli inline"},
    ],
  },
  {
    date:"2026-05-25", version:"2.40.2", label:"Przetargi — profil po wyszukiwaniu BZP/BIP",
    items:[
      {type:"improve", text:"Profil v3: MOPS Owsiana 2024 (615 tys. zł, 5 ofert), MPWiK 2012 (23,10 zł/rbh)"},
      {type:"improve", text:"Wygrana Kamieńskiego — dokładna kwota BZP, 130 dni, 3 oferty MŚP"},
      {type:"improve", text:"Notatki: potwierdzone źródła (BIP MOPS, mpwik.wroc.pl, eGospodarka)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.40.1", label:"Przetargi — profil W&G DOM z CEIDG i wgdom.pl",
    items:[
      {type:"improve", text:"Domyślny profil firmy: NIP 8991736797, Iwona Schabowska-Wałek, referencje ZUS/PKO/UWr/DOZG/MOPS"},
      {type:"new", text:"Lista referencji, wygranych BZP (MOPS Kamieńskiego ~983 tys. zł) i udziałów w przetargach"},
      {type:"improve", text:"Dopasowanie przetargu rozpoznaje znanych zamawiających z historii firmy"},
    ],
  },
  {
    date:"2026-05-25", version:"2.40.0", label:"Przetargi — profil firmy, dopasowanie, punktacja",
    items:[
      {type:"new", text:"Profil firmy (edytowalny, chmura): referencje, wadium, CPV, region, OC, moce zespołu"},
      {type:"new", text:"Dopasowanie przetargu vs wymagania SWZ — tabela OK / luka / częściowo"},
      {type:"new", text:"Kryteria oceny ofert — waga ceny, punktacja z ogłoszenia"},
      {type:"new", text:"Szacunek szans (%) + podpowiedzi — badge na liście przetargów"},
    ],
  },
  {
    date:"2026-05-25", version:"2.39.0", label:"Przetargi — podgląd załączników BZP",
    items:[
      {type:"new", text:"Lista załączników postępowania z auto-skanem BZP i licznikiem plików"},
      {type:"new", text:"Podgląd w aplikacji: PDF, ATH, NOR, XML (przez proxy — bez CORS) oraz wgrany SWZ"},
      {type:"improve", text:"Ta sama przeglądarka kosztorysów co w robotach — tabela, przedmiar, eksport PDF"},
    ],
  },
  {
    date:"2026-05-25", version:"2.38.0", label:"Przetargi — karta przetargu (kosztorys, przedmiar, SWZ)",
    items:[
      {type:"new", text:"Karta przetargu w aplikacji: przedmiot, terminy, wadium, kontakt, referencje — bez linków zewnętrznych"},
      {type:"new", text:"Auto-parsowanie kosztorysu ATH/NOR/XML i przedmiaru z załączników BZP"},
      {type:"new", text:"Tabela pozycji kosztorysu + wszystkie pola z ogłoszenia HTML"},
    ],
  },
  {
    date:"2026-05-25", version:"2.37.1", label:"Przetargi — legenda trafności i statusów",
    items:[
      {type:"new", text:"Przetargi — rozwijana legenda u góry: trafność, statusy pipeline, ocena SWZ, lejek"},
    ],
  },
  {
    date:"2026-05-25", version:"2.37.0", label:"Przetargi — workflow, pulpit, instrukcja",
    items:[
      {type:"new", text:"Instrukcja obsługi — sekcja Przetargi BZP (pipeline, SWZ, uczenie, robota)"},
      {type:"new", text:"Sync słów kluczowych z chmury + przeliczenie trafności przy starcie"},
      {type:"new", text:"Tworzenie roboty — auto-dołączanie SWZ/kosztorysu z przetargu"},
      {type:"new", text:"Link zwrotny przetarg ↔ robota (banner w karcie roboty)"},
      {type:"new", text:"Auto-analiza po rozwinięciu (HTML, załączniki, SWZ)"},
      {type:"new", text:"Auto-odświeżanie BZP co ~20 h + widget na Pulpicie"},
      {type:"new", text:"Lejek pipeline ze wskaźnikiem skuteczności"},
      {type:"new", text:"Podgląd pełnego ogłoszenia HTML + status postępowania z API"},
      {type:"improve", text:"Parsowanie SWZ: terminy realizacji, wymagania techniczne, pozycje tabel PDF"},
    ],
  },
  {
    date:"2026-05-25", version:"2.36.0", label:"Przetargi BZP — SWZ, analiza, uczenie słów, robota",
    items:[
      {type:"new", text:"Szczegóły postępowania: załączniki SWZ z e-Zamówień (skan publicznych dokumentów) + ręczny upload pliku"},
      {type:"new", text:"Analiza SWZ: wadium, kwota, referencje z PDF/HTML; podgląd ATH; ocena opłacalności vs nasza wycena"},
      {type:"new", text:"Uczenie słów kluczowych z przetargów „interesuje nas”; propozycje fraz do słownika"},
      {type:"new", text:"Powiązanie wygranego/przygotowywanego przetargu z robotą — utwórz lub otwórz powiązaną robotę"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.25", label:"Przetargi — pełny słownik remontów wnętrz",
    items:[
      {type:"improve", text:"Słowa kluczowe: malowanie, podłogi, sufity, glazura, regips, tapety, parkiet, wymiana"},
      {type:"improve", text:"Obiekty: hale, uniwerki, lokale usługowe, mieszkania, szpitale, szkoły, urzędy…"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.24", label:"Przetargi — instalacje elektryczne i wymiany",
    items:[
      {type:"improve", text:"Słowa kluczowe: instalacje elektryczne, oświetlenie, okablowanie, rozdzielnie, wymiana, teletechnika, CO, wod-kan"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.23", label:"Przetargi — profil remont budynków Wrocław",
    items:[
      {type:"improve", text:"Słowa kluczowe: mieszkania, biura, uczelnie, szpitale, pomieszczenia, elewacje, instalacje…"},
      {type:"improve", text:"Wykluczenia: drogi, nowa zabudowa (sam „budowa” bez remontu), sieci, mosty"},
      {type:"improve", text:"Widok „Do zgłoszenia” — tylko Wrocław (lub kluczowy zamawiający) + remont/modernizacja"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.22", label:"Przetargi — tylko aktywne do zgłoszenia",
    items:[
      {type:"improve", text:"Domyślny widok „Do zgłoszenia” — otwarty termin ofert + wysoka trafność lub kluczowy zamawiający"},
      {type:"improve", text:"BZP pomija przetargi z minionym terminem; sortowanie po najbliższym deadline; archiwum osobno"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.21", label:"Przetargi — MOPS Wrocław",
    items:[
      {type:"fix", text:"MOPS — w BZP nazwa „Miejski Ośrodek Pomocy Społecznej” + miasto Wrocław (nie „we Wrocławiu”)"},
      {type:"fix", text:"Pobieranie MOPS przez zakodowany URL (fix Deno/Edge); skan do 365 dni"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.20", label:"Przetargi — kluczowi zamawiający Wrocławia",
    items:[
      {type:"new", text:"BZP — dedykowany skan po organizationName: Wrocławskie Mieszkania, ZIK, ZIM, TBS, Gmina Wrocław"},
      {type:"improve", text:"Filtr „Kluczowi zamawiający”, badge organizacji, luźniejszy scoring dla WM/ZIK/ZIM"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.19", label:"Przetargi — widoczność dla adminów i moderatorów",
    items:[
      {type:"new", text:"Ustawienia Super Admina — przełącznik „Zakładka Przetargi dla administratorów i moderatorów” (sync w chmurze)"},
      {type:"improve", text:"Super Admin zawsze widzi Przetargi; admin/moderator — gdy włączone w ustawieniach"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.18", label:"Przetargi BZP (Super Admin · test)",
    items:[
      {type:"new", text:"Zakładka Przetargi — pipeline ogłoszeń z BZP (dolnośląskie, remont/modernizacja), widoczna tylko dla Super Admina"},
      {type:"new", text:"Endpoint GET /tenders-bzp-search — proxy do API e-Zamówienia z filtrem słów kluczowych"},
      {type:"new", text:"Chmura kw-tenders-pipeline — status, notatki, link do e-Zamówienia"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.17", label:"Wykrywalność dokumentacji dla AI",
    items:[
      {type:"new", text:"AGENTS.md + README.md — punkt wejścia; Cursor alwaysApply: czytaj ARCHITECTURE.md na start sesji"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.16", label:"Dokumentacja architektury dla developerów / AI",
    items:[
      {type:"new", text:"docs/ARCHITECTURE.md — pełny przewodnik: panele, sync, Supabase, Vercel, PWA, testy, pułapki"},
      {type:"improve", text:"Reguły Cursor + ROZWOJ.md — obowiązek aktualizacji ARCHITECTURE.md przy zmianach (obok CHANGELOG)"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.15", label:"Sync, wydajność i spójność paneli",
    items:[
      {type:"fix", text:"pushKeysToCloudSafe — merge z localStorage przed chmurą (inspektor/pracownik nie nadpisują edycji admina)"},
      {type:"fix", text:"Inspektor — natychmiastowa synchronizacja z adminem przez storage events (kw-jobs, kw-directory)"},
      {type:"fix", text:"Pracownik — lista płac i archiwum zapisywane do localStorage po pull z chmury (offline OK)"},
      {type:"fix", text:"alignWeekRangeInMerged — poprawny wybór tygodnia z bogatszą listą płac (local vs chmura)"},
      {type:"improve", text:"Admin — pull anuluje oczekujący push; brak wyścigu pull↔push"},
      {type:"improve", text:"Zakładka Inspektor (admin) — statystyki odświeżają się przy focus"},
      {type:"improve", text:"Lazy-load panelu inspektora + podział bundla (ui-vendor, panel-inspector); PWA cache v20"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.14", label:"Sync — ochrona przed cofką danych",
    items:[
      {type:"fix", text:"Admin — powrót do karty / F5: pobieranie chmury i merge (nie tylko stary localStorage); UI odświeża się po syncu"},
      {type:"improve", text:"Scalanie listy płac — remis dat idzie na korzyść chmury; rozliczenie zapisuje settledUpdatedAt + dataUpdatedAt"},
      {type:"improve", text:"Po zapisie do chmury stan ekranu = wynik merge (to samo widzą wszyscy admini)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.13", label:"Sync — status rozliczony",
    items:[
      {type:"fix", text:"Lista płac — status „Rozliczony” synchronizuje się między adminami (wcześniej lokalne „oczekuje” nadpisywało chmurę)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.12", label:"Mobile — naprawa scrolla admina",
    items:[
      {type:"fix", text:"Panel admina na telefonie — przywrócony scroll i dotyk (regresja po poprawce viewportu desktop)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.11", label:"Admin — górny pasek zawsze widoczny",
    items:[
      {type:"fix", text:"Panel admina — górny pasek (odtwarzacz, chmura…) nie chowa się pod paskiem zakładek Chrome; wysokość okna z visualViewport"},
      {type:"improve", text:"Zwinięte menu w górnym pasku — pełne nazwy, bez poziomego scrolla"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.10", label:"Admin — układ na każdym ekranie",
    items:[
      {type:"fix", text:"Panel admina — menu i górny pasek nie ucinają się na mniejszych laptopach i przy skalowaniu Windows (125–150%)"},
      {type:"improve", text:"Sidebar z przewijaniem; zwinięte menu — ikony + poziomy scroll zamiast zawijania w niewidoczny pasek"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.9", label:"Inspektor — kółka zlec/kosz na pulpicie",
    items:[
      {type:"improve", text:"Pulpit inspektora — zlecenie i kosztorys jako kółka (jak u admina); robota nie znika po zaznaczeniu, można odznaczyć"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.8", label:"Inspektor — hymny + chmurka sync",
    items:[
      {type:"new", text:"Panel inspektora — odtwarzacz hymnów firmowych (jak w panelu admina)"},
      {type:"new", text:"Inspektor — ikona chmury w pasku: zapis do chmury, błąd (dotknij = ponów), zsynchronizowano"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.7", label:"Inspektor — naprawa pustego panelu",
    items:[
      {type:"fix", text:"Panel inspektora — roboty i dane znów się wyświetlają (błąd syncu: stan React nie ładował się z cache)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.6", label:"Inspektor — stabilny scroll, bez banera offline",
    items:[
      {type:"fix", text:"Panel inspektora — mniej „skaczącego” scrolla (sync w tle nie odświeża wskaźnika pull, stabilniejsza kolejka zdjęć)"},
      {type:"improve", text:"Inspektor — usunięty żółty pasek „kolejka offline zdjęć”; wysyłka w tle po powrocie sieci bez bannera"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.5", label:"SMS pilne — naprawa crasha (HardHat)",
    items:[
      {type:"fix", text:"SMS pilne — literówka ikony HardHat powodowała komunikat „Nie udało się otworzyć SMS pilne” gdy w kartotece są pracownicy z telefonem"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.4", label:"SMS pilne — naprawa pustego ekranu (2)",
    items:[
      {type:"fix", text:"SMS pilne z Pulpitu — modal bez portalu, stabilny layout, historia ładuje się dopiero w zakładce Historia; ErrorBoundary zamiast pustej strony"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.3", label:"Kosztorys — bez zbędnego ostrzeżenia ATH/NOR",
    items:[
      {type:"improve", text:"Przeglądarka kosztorysów i generowany PDF — usunięto komunikat „Format ATH/NOR jest zamknięty…” przy poprawnym podglądzie"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.2", label:"SMS pilne — naprawa pustego ekranu",
    items:[
      {type:"fix", text:"SMS pilne — modal znów się otwiera (brakujący import + wysokość okna); treść widoczna na telefonie i desktopie"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.1", label:"Pliki robot — podsumowanie typów na liście",
    items:[
      {type:"improve", text:"Pliki robot (admin + inspektor) — przy każdej robocie widać od razu: zlecenia, kosztorysy, zdjęcia ekipy/inspektora, rysunki — bez rozwijania"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.0", label:"Admin — Pliki robot + Zmiany/Instrukcja",
    items:[
      {type:"new", text:"Menu admina — zakładka „Pliki robot”: wszystkie pliki z robot (jak u inspektora), pobieranie pojedynczo i ZIP"},
      {type:"improve", text:"Menu — połączono Zmiany + Instrukcja w jedną zakładkę „Zmiany/Instrukcja” (więcej miejsca w menu)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.34.0", label:"Panel inspektora — Galeria, Pliki, powrót do Pulpitu",
    items:[
      {type:"fix", text:"Inspektor — po wejściu w robotę z Pulpitu/Galerii/Plików przycisk „Wróć do …” wraca tam, skąd przyszedłeś (nie tylko lista robót)"},
      {type:"new", text:"Inspektor — dolna zakładka Galeria (zdjęcia ekipy jak u admina) i Pliki (pobieranie pojedynczo lub ZIP)"},
      {type:"improve", text:"Pakiet ZIP plików roboty — foldery wg typu i daty (zlecenie/2026-05-20/, zdjecia-ekipa/przed/…)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.33.1", label:"Inspektor admin — zakładki w szczegółach roboty",
    items:[
      {type:"fix", text:"Zakładka Inspektor (panel admina) — po otwarciu roboty sekcje WM, Pliki, Dokumenty, Ekipa, Raporty, Zdjęcia jako zakładki (wcześniej tylko aplikacja inspektora)"},
      {type:"improve", text:"PWA — odświeżony cache shell (v3) po wdrożeniu"},
    ],
  },
  {
    date:"2026-05-25", version:"2.33.0", label:"Inspektor + nawigacja — zakładki i powrót do Pulpitu",
    items:[
      {type:"fix", text:"Aplikacja inspektora — sekcje (Pliki, Dokumenty, Zdjęcia…) jako zakładki; kliknięcie od razu pokazuje treść"},
      {type:"improve", text:"Roboty / Inspektor — przycisk „Wróć do Pulpitu” po wejściu z pulpitu (alert, skrót)"},
      {type:"improve", text:"Inspektor admin — krótszy opis listy aktywności i powrót do poprzedniej zakładki"},
    ],
  },
  {
    date:"2026-05-25", version:"2.32.4", label:"Roboty — zdjęcia admina (wiele + kategoria)",
    items:[
      {type:"fix", text:"Admin w zakładce Zdjęcia — wybór wielu plików naraz zapisuje wszystkie (wcześniej zostawało tylko ostatnie)"},
      {type:"new", text:"Admin — wybór kategorii przed wgraniem: Przed remontem / Po remoncie / W trakcie"},
    ],
  },
  {
    date:"2026-05-25", version:"2.32.3", label:"Spójność godzin — ignoruj nadmiar z dodatkowych",
    items:[
      {type:"fix", text:"Pulpit: spójność listy płac ↔ roboty — gdy wpis na robocie ma sumę = podstawa + dodatkowe godziny z listy płac, nie pokazuje fałszywej rozbieżności"},
    ],
  },
  {
    date:"2026-05-25", version:"2.32.2", label:"Roboty — zakładki zamiast scrolla",
    items:[
      {type:"improve", text:"Szczegóły roboty — jedna zakładka na ekran (Przegląd, Pliki, Dokumenty…), bez długiego przewijania"},
      {type:"improve", text:"Pliki — druga zakładka, zielony przycisk skrótu w nagłówku i licznik plików"},
      {type:"improve", text:"Badge’e: brakujące dokumenty, nowe zdjęcia, liczba raportów; pusty panel z skrótami do plików i nowej roboty"},
    ],
  },
  {
    date:"2026-05-29", version:"2.32.1", label:"Pliki wg adresów — kafelki zamiast zakładki",
    items:[
      {type:"improve", text:"„Pliki wg adresów” — pełny ekran z kafelkami po adresie (zlecenie/kosztorys/zdjęcia), nie zakładka w liście"},
      {type:"improve", text:"Każdy kafel: podsumowanie typów plików, rozwijana lista z podglądem i pobieraniem, skrót do roboty"},
    ],
  },
  {
    date:"2026-05-29", version:"2.32.0", label:"Roboty — pliki + czytelniejszy układ",
    items:[
      {type:"new", text:"Zakładka „Wszystkie pliki” — zlecenia, kosztorysy ATH/NOR, zdjęcia i rysunki z datą, autorem, podglądem i pobieraniem"},
      {type:"new", text:"Szczegóły roboty — sekcje: Dane, Dokumenty, Pliki, Pracownicy, Zdjęcia, Raporty (nawigacja u góry)"},
      {type:"improve", text:"Pliki roboty — pełna lista (zlecenie, kosztorys, inspektor, ekipa, raporty) + wgranie zlecenia/kosztorysu z poziomu Roboty"},
      {type:"improve", text:"Lista robót — czytelniejsze karty ze statusem, liczbą plików i brakami dokumentów"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.8", label:"SMS — wybór nadawcy z 4 nazw",
    items:[
      {type:"new", text:"Modal SMS — wybór nadawcy: W&GDOM, W&G-Dawid, W&G-Pawel, W&G-Stan (tylko ACTIVE w SMSAPI)"},
      {type:"improve", text:"Domyślnie nazwa dopasowana do zalogowanego użytkownika; backend wysyła tylko z wybranej aktywnej nazwy"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.7", label:"Roboty — ręczny status + braki dokumentów",
    items:[
      {type:"new", text:"Szczegóły roboty — wybór statusu: W trakcie, Gotowe do odbioru, Zdane (dla wszystkich klientów)"},
      {type:"improve", text:"Pod statusem lista brakujących dokumentów do zdania; bez auto-zdawania po komplecie"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.6", label:"SMS — nadawcy tylko ręcznie w SMSAPI",
    items:[
      {type:"fix", text:"Wyłączona auto-rejestracja nadawców przez API (SMSAPI wymaga ręcznego dodania w panelu)"},
      {type:"improve", text:"Nadawcy: W&GDOM, W&G-Dawid, W&G-Pawel, W&G-Stan — modal tylko sprawdza status ACTIVE"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.5", label:"Roboty — czytelniejsza lista i statusy",
    items:[
      {type:"improve", text:"Lista robót — jeden główny status: W trakcie, Gotowe do odbioru, Komplet do odbioru, Zdane"},
      {type:"improve", text:"Filtry z licznikami + legenda statusów (najechanie / „Co oznaczają statusy?”)"},
      {type:"improve", text:"Na liście widać brakujące dokumenty i alerty tylko gdy brak zlecenia/kosztorysu"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.4", label:"Kosztorys PDF — logo, klauzula, credit DTT",
    items:[
      {type:"improve", text:"PDF kosztorysu — logo W&G DOM, klauzula użytku wewnętrznego (NORMA/Athenasoft), stopka na każdej stronie"},
      {type:"improve", text:"Podgląd kosztorysu — baner z logo, disclaimer i credit DTT (Przeglądarka plików NORMA)"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.3", label:"SMS — auto-rejestracja nadawców przez API SMSAPI",
    items:[
      {type:"new", text:"Przy wysyłce SMS — automatyczna rejestracja nazw nadawców (POST smsapi.pl/sms/sendernames)"},
      {type:"new", text:"Przycisk „Zarejestruj nazwy nadawców” + lista statusów ACTIVE/INACTIVE w modalu SMS"},
      {type:"improve", text:"Wysyłka używa tylko ACTIVE pól nadawcy — do czasu akceptacji SMSAPI zostaje prefiks W&G - Imię w treści"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.2", label:"SMS — nadawca admina + historia wysyłek",
    items:[
      {type:"fix", text:"SMS pilne — prefiks W&G - Imię w treści; pole nadawcy W&G-Imię (zamiast domyślnego Test z SMSAPI)"},
      {type:"new", text:"Historia SMS — kto wysłał, do kogo, kiedy, treść i status doręczenia (zakładka Historia)"},
      {type:"improve", text:"Modal SMS — wyświetla zalogowanego nadawcę; instrukcja dodania nazwy w panelu smsapi.pl"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.1", label:"Lista płac PDF/Word — opisy kosztów do zwrotu",
    items:[
      {type:"fix", text:"PDF i Word — załącznik „Koszty do zwrotu” z opisem każdego paragonu/wydatku (wcześniej tylko suma w kolumnie Koszty)"},
      {type:"improve", text:"Pod tabelą główną — informacja skąd kwota w kolumnie Koszty i że szczegóły są w załączniku"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.0", label:"Kosztorys ATH — Kp/Z PLN, przedmiar, PDF",
    items:[
      {type:"new", text:"Podgląd PDF i Pobierz PDF — generowanie kosztorysu z pliku .ath (pdfmake, polskie znaki)"},
      {type:"new", text:"Sekcja przedmiar/obmiar — odczyt [PRZEDMIAR] z wzorami (np. 2,47*4+4,83*2)"},
      {type:"improve", text:"Podsumowanie — kwoty Kp i Zysk w PLN (z pliku lub wyliczone z netto i % narzutów)"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.9", label:"Podgląd ATH — ceny jak w NORMA ofertowy",
    items:[
      {type:"fix", text:"Cena jednostkowa i wartość pozycji z pola cj×ilość (jak wydruk NORMA), nie z wn (koszty pośrednie R/M)"},
      {type:"improve", text:"Podsumowanie: kosztorys netto + VAT + brutto — zgodne z końcówką PDF z Normy"},
      {type:"improve", text:"Nagłówki tabeli: Podstawa (KNR), Cena j., Opis pozycji — terminologia NORMA"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.8", label:"PDF — karta dodatkowych godzin jak rozpis tygodniowy",
    items:[
      {type:"improve", text:"Karta dodatkowych godzin (PDF/Word) — siatka pracownik × dni Pn–So jak rozpis tygodniowy, z kolumną Kwota PLN"},
      {type:"improve", text:"Komórka dnia: godziny od–do, opis, suma h i kwota brutto; wiersz Razem + podpis sumy kosztu nadgodzin"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.7", label:"Podgląd ATH — polskie znaki, działy, podsumowanie",
    items:[
      {type:"fix", text:"ATH Athenasoft — dekodowanie Windows-1250 (poprawne ą, ę, ł, ś… zamiast �)"},
      {type:"new", text:"Podgląd kosztorysu — działy (ELEMENT), narzuty Kp/Z/VAT, wartość całkowita wk= jak w NORMA"},
      {type:"improve", text:"Modal — tabela podsumowania + pozycje pogrupowane wg działów (Roboty, Instalacje…)"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.6", label:"Lista płac PDF — karta dodatkowych godzin + łamanie stron",
    items:[
      {type:"fix", text:"Karta dodatkowych godzin w PDF/Word — uwzględnia wszystkich pracowników (w tym Ukraińców co 2 tyg.), wcześniej byli pomijani"},
      {type:"fix", text:"PDF rozpis tygodniowy — wiersz pracownika nie dzieli się między dwie kartki (dontBreakRows)"},
      {type:"improve", text:"Word — cantSplit na wierszach rozpisu tygodniowego i karty dodatkowych godzin"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.5", label:"Pliki inspektora — usuwanie + podgląd ATH",
    items:[
      {type:"new", text:"Roboty i panel inspektora — przycisk Usuń przy plikach (zlecenie, kosztorys, zdjęcia); kasuje ze storage i synchronizuje w chmurze"},
      {type:"fix", text:"Podgląd ATH Athenasoft — parser tekstowy [POZYCJA] (opis, KNR, j.m., ilość, cena, wartość) zamiast śmieci z binarnego odczytu"},
      {type:"improve", text:"Sync chmury — nowsza wersja robota zastępuje listę jobFiles/zdjęć (usuwanie nie wraca po odświeżeniu)"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.4", label:"Lista płac — karta dodatkowych godzin",
    items:[
      {type:"new", text:"PDF i Word — osobna „Karta dodatkowych godzin”: opis, stawka, kwota brutto (h × stawka) i suma"},
      {type:"improve", text:"Eksport listy płac — nadgodziny widoczne osobno od wpisów na robotach"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.3", label:"Spójność płac — bez dodatkowych godzin",
    items:[
      {type:"fix", text:"Pulpit: spójność listy płac ↔ roboty ignoruje dodatkowe godziny (mają własny opis, bez wpisu na robocie)"},
      {type:"improve", text:"Wpisy na robotach z listy płac — godziny tylko z podstawowej zmiany, nie z nadgodzin"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.2", label:"Podgląd kosztorysu — poprawki",
    items:[
      {type:"fix", text:"Roboty — sekcja Pliki inspektora z przyciskiem Podgląd (wcześniej tylko nazwa pliku przy checkboxie)"},
      {type:"fix", text:"Sync ustawień — chmura włączone podgląd ATH nie blokowany przez stary localStorage false"},
      {type:"fix", text:"path storage wyciągany z publicUrl gdy brak w starych wpisach jobFiles"},
      {type:"improve", text:"ATH — tytuł kosztorysu (nan=) w modalu podglądu"},
    ],
  },
  {
    date:"2026-05-25", version:"2.30.1", label:"Podgląd kosztorysów ATH/NOR",
    items:[
      {type:"fix", text:"Podgląd .ath/.nor/.xml — parser binarny, proxy API (omija CORS), domyślnie włączony"},
      {type:"fix", text:"Przycisk Podgląd w panelu inspektora (teren) i adminie — storagePath do pobrania pliku"},
      {type:"improve", text:"Modal podglądu: fragmenty tekstu z binarnego ATH gdy brak tabeli pozycji"},
    ],
  },
  {
    date:"2026-05-25", version:"2.30.0", label:"Testy mobile — audyt + Playwright + CI",
    items:[
      {type:"new", text:"npm run audit:mobile — 36 reguł statycznych (PWA, Capacitor, touch, offline, deep linki)"},
      {type:"new", text:"npm run test:mobile — Playwright smoke na wgdom.fun (iPhone SE + Pixel 7): manifest, SW, ikony, login, touch 44px"},
      {type:"new", text:"GitHub Actions: workflow Mobile smoke tests na main"},
      {type:"improve", text:"docs/MOBILE-NATIVE.md — checklist testów na prawdziwym telefonie (~20 min)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.29.0", label:"Mobilne UX — Faza C (sklep i offline)",
    items:[
      {type:"new", text:"Deep linki wgdom://job/{id} i wgdom://payroll — otwarcie roboty lub listy płac (Android, iOS, web ?open=job&id=…)"},
      {type:"improve", text:"Capacitor — strona offline gdy brak sieci (errorPath); opcjonalny tryb bundle: CAPACITOR_USE_BUNDLE=1"},
      {type:"improve", text:"PWA — manifest id, ikony maskable, kategorie; service worker v2 z offline.html"},
      {type:"improve", text:"Inspektor — kolejka offline zdjęć (jak u pracownika), wysyłka po powrocie sieci"},
    ],
  },
  {
    date:"2026-05-25", version:"2.28.0", label:"Mobilne UX — Faza B (natywka)",
    items:[
      {type:"new", text:"Capacitor — przycisk Wstecz (Android): zamyka modale, edytor płac, szczegół roboty; sync po wznowieniu apki"},
      {type:"improve", text:"Klawiatura mobilna — wykrywanie wysokości (visualViewport), przewijanie aktywnego pola, padding modali"},
      {type:"improve", text:"Lista płac — edytor pracownika pełnoekranowy z ukrytą dolną nawigacją na telefonie"},
      {type:"improve", text:"Panel pracownika — pull-to-refresh (odśwież dane z chmury)"},
      {type:"improve", text:"Grafik — widok kart na telefonie (zamiast przewijania szerokiej tabeli)"},
      {type:"improve", text:"iOS Info.plist — opisy uprawnień aparatu i galerii (App Store)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.27.0", label:"Mobilne UX — Faza A (PWA i natywka)",
    items:[
      {type:"improve", text:"Panel pracownika — odświeżanie danych z chmury przy powrocie do aplikacji (focus / widoczność karty)"},
      {type:"improve", text:"Admin — toasty przy synchronizacji chmury i zapisie tygodnia; baner PWA ukryty w aplikacji Capacitor"},
      {type:"improve", text:"Mobile — większe obszary dotyku (lista płac, filtry robotów, status rozliczenia); edytor płac nad dolną nawigacją"},
      {type:"improve", text:"Przewijanie — overscroll-contain na głównych widokach (mniej „gumowania” całej strony na iOS)"},
      {type:"improve", text:"PWA — precache ikon w service workerze"},
    ],
  },
  {
    date:"2026-05-25", version:"2.26.0", label:"Lista Płac — przełącznik widoku szczegółowego",
    items:[
      {type:"new", text:"Lista Płac — przełącznik „Sumy” / „Szczegóły dni” obok tytułu: godziny 7–16, dodatki i zaliczki wg dni bez otwierania PDF"},
      {type:"improve", text:"Widok szczegółowy — kolumny Pn–So + Sob. poprz., sumy godzin na dole; wybór zapamiętywany w przeglądarce"},
    ],
  },
  {
    date:"2026-05-25", version:"2.25.2", label:"Lista płac — poprawka podsumowania Sob. poprz.",
    items:[
      {type:"fix", text:"Podsumowanie „Sob. poprz.” nie wlicza już godzin pracowników z wypłatą co 2 tygodnie (wcześniej w wierszach było „—”, a w sumie zostawały ich godziny)"},
      {type:"fix", text:"Spójne sumy brutto/zaliczek/netto w stopce listy płac i widoku mobilnym dla pracowników co 2 tyg."},
    ],
  },
  {
    date:"2026-05-25", version:"2.25.1", label:"Inspektor — poprawki mobile iOS/Android",
    items:[
      {type:"fix", text:"PDF na iPhone — share sheet / nowa karta zamiast blokowanego download(); toast sukcesu/błędu"},
      {type:"fix", text:"Toasty pod safe-area (poniżej nagłówka); większe przyciski szybkiego „Jest” i filtrów Pulpicu (44px)"},
      {type:"improve", text:"Status „Czeka na wysłanie” — dotknij, aby ponowić sync; etapy WM, meta pickery, notatki — lepsze cele dotykowe"},
    ],
  },
  {
    date:"2026-05-25", version:"2.25.0", label:"Inspektor — pulpit v2 (UX + raporty PDF)",
    items:[
      {type:"new", text:"Pulpit — powitanie z podsumowaniem pilnych spraw, filtry (admin / pliki / dokumenty / terminy)"},
      {type:"new", text:"Kafelek „Twoja robota w tym tygodniu” — statystyki z dziennika aktywności inspektora"},
      {type:"new", text:"Raport PDF — „Mój miesiąc” i „Mój rok” (roboty, dokumenty, zdjęcia, notatki, etapy WM)"},
      {type:"improve", text:"Status synchronizacji w nagłówku (zielony / pomarańczowy); toasty po szybkim „Jest”; szybkie oznaczanie pozostałych dokumentów na Pulpicie"},
      {type:"improve", text:"Powiadomienie toast przy nowej odpowiedzi admina; nagłówek „Inspektor WM · W&G DOM”"},
    ],
  },
  {
    date:"2026-05-25", version:"2.24.0", label:"Inspektor — pulpit pro + galeria ZIP",
    items:[
      {type:"new", text:"Pulpit — priorytety (termin odbioru), jedna robota na liście zlec/kosz, braki dokumentów, gotowe bez daty, szybkie „Zlecenie ✓” / „Kosztorys ✓”"},
      {type:"new", text:"Galeria — ZIP całej kategorii lub wszystkich zdjęć; kategorie inspektora (usterka, realizacja, przed/po odbiorze); upload w galerii"},
      {type:"improve", text:"Lightbox — przesuwanie między zdjęciami, udostępnij/pobierz; instrukcja inspektora uzupełniona o Pulpit"},
    ],
  },
  {
    date:"2026-05-25", version:"2.23.0", label:"Inspektor — pulpit i galeria zdjęć",
    items:[
      {type:"new", text:"Panel inspektora — zakładka Pulpit: roboty bez zlecenia/kosztorysu (znika po zaznaczeniu „Jest”, bez wymogu pliku)"},
      {type:"new", text:"Galeria zdjęć inspektora jak u admina: kategorie (przed / w realizacji / po odbiorze), opisy, daty wrzucenia, pobieranie całej kategorii"},
      {type:"improve", text:"Zdjęcia inspektora z sekcji Odbiór WM widoczne w galerii z datą i opisem; nazwy plików przy pobieraniu zawierają datę i opis"},
    ],
  },
  {
    date:"2026-05-25", version:"2.22.0", label:"Upload kosztorysu .ath (NORMA)",
    items:[
      {type:"fix", text:"Inspektor i admin — wgrywanie kosztorysów .ath/.nor/.xml: okno plików pokazuje wszystkie pliki (Windows ukrywał .ath przy filtrze rozszerzeń); walidacja po wyborze"},
      {type:"improve", text:"Upload zlecenia/kosztorysu — niezawodny wybór pliku (HiddenFileInput zamiast ukrytego input w label)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.9", label:"Moderator — raport roczny bez PLN/h",
    items:[
      {type:"improve", text:"Archiwum — raport roczny PDF: moderator nie dostaje kafelka „Śr. koszt godz. X PLN/h” (reszta raportu bez zmian)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.8", label:"Sidebar odchudzony — backup w ⚙ i topbarze",
    items:[
      {type:"improve", text:"Sidebar — usunięta sekcja „Dane”; menu i „Bieżący tydzień” znów mieszczą się bez ucinania"},
      {type:"improve", text:"⚙ Super Admin — sekcja „Kopie zapasowe” (przywracanie z chmury / lokalnie, status kopii)"},
      {type:"improve", text:"Górny pasek — eksport i import backupu dla wszystkich adminów (desktop i mobile)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.7", label:"Sidebar — przywrócony prosty układ",
    items:[
      {type:"fix", text:"Sidebar — cofnięte scrollbary i rozbudowane opisy; z powrotem krótko: Tygodniówki / Co 2 tyg. jak wcześniej"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.6", label:"Lista Płac — poprawione sformułowania wypłaty",
    items:[
      {type:"improve", text:"Lista Płac — „Kasa w sobotę” i „Razem w kasie” zastąpione profesjonalnymi: „Wypłata w sobotę”, „Suma wypłaty w sobotę”"},
      {type:"improve", text:"PDF, Word i email — spójna terminologia wypłaty zamiast „kasa”; doprecyzowane etykiety co 2 tyg. (narastająco / bież. i poprzedni tydzień)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.5", label:"Sidebar — przewijanie i krótsze opisy",
    items:[
      {type:"fix", text:"Sidebar — menu i „Bieżący tydzień” przewijają się gdy brakuje miejsca; sekcja „Dane” zawsze widoczna na dole"},
      {type:"improve", text:"Sidebar — krótszy opis wypłaty co 2 tyg. (pełny tekst zostaje na Pulpicie i w Liście Płac)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.4", label:"Kasa w sobotę — liczba osób i opis cyklu",
    items:[
      {type:"improve", text:"Sidebar i Pulpit — przy podziale kasy: Tygodniówki (X os.) i Co 2 tyg. (X os.) oraz linia wyjaśniająca, czy w tę sobotę wypada wypłata co 2 tygodnie, czy kwota przechodzi na następną"},
      {type:"improve", text:"Lista Płac — panel „Kasa w sobotę” z tym samym opisem i liczbą osób"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.3", label:"Pulpit — czytelniejszy kafelek wypłaty",
    items:[
      {type:"improve", text:"Pulpit — kafelek wypłaty: jeden tytuł z datą soboty, większa kwota, jedna linia o wypłacie co 2 tygodnie (bez przeładowania tekstem)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.2", label:"Pulpit — kafelek kasy w sobotę",
    items:[
      {type:"improve", text:"Pulpit — przy wypłacie co 2 tyg.: kafelek „Kasa w sobotę” z podziałem tygodniówki / co 2 tyg. i kwotą narastającą na następną sobotę"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.1", label:"Archiwum — edycja godzin",
    items:[
      {type:"new", text:"Archiwum — klik w pracownika otwiera edycję godzin (Pn–So, Sob.pr., zaliczki, koszty) jak w Liście Płac; sumy tygodnia przeliczają się automatycznie"},
      {type:"improve", text:"Zaległa lista płac w archiwum — badge „zaległość”; flaga backlog zostaje po edycji"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.0", label:"Wypłata co 2 tygodnie (sobota)",
    items:[
      {type:"new", text:"Kartoteka — opcja „Wypłata co 2 tygodnie” + data pierwszej soboty wypłaty (dla każdego pracownika osobno, nie tylko UK)"},
      {type:"new", text:"Lista płac i sidebar — podział kasy: tygodniówki w sobotę vs co 2 tyg. (narastające / wypłata za 2 tygodnie)"},
      {type:"new", text:"Zaległa lista płac — kreator archiwum poprzedniego tygodnia przed pierwszą wypłatą 2-tygodniową"},
      {type:"improve", text:"PDF, Word i email — oznaczenie pracowników co 2 tyg. i podsumowanie kasy w sobotę"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.8", label:"Logistyka — grafik i statystyka dziś",
    items:[
      {type:"improve", text:"Sidebar „Dziś” — pracownicy z opcją wiele robót/dzień liczą się w pracy także bez wpisu na robocie (lista płac)"},
      {type:"improve", text:"Grafik — dla logistyki zamiast „bez roboty”: Dowóz mat. / wywóz śm. (tylko przy zaznaczonej opcji w kartotece)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.7", label:"SMS — status konta SMSAPI na żywo",
    items:[
      {type:"fix", text:"SMS pilne — niebieski komunikat tylko gdy konto SMSAPI jest nadal ograniczone; po aktywacji zielone „SMSAPI aktywne” z saldem"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.6", label:"Sidebar — dziś na budowach",
    items:[
      {type:"new", text:"Menu boczne — pod „Bieżący tydzień”: ile osób dziś na ilu robotach (z wpisów czasu pracy)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.5", label:"Super Admin — zmiana dokumentów z raportu",
    items:[
      {type:"new", text:"Super Admin może odznaczyć Zakres lub Rysunek/Plan mimo raportu ekipy — po potwierdzeniu w oknie dialogowym"},
      {type:"fix", text:"Zapis dokumentów z pulpitu/Robotów — merge chmura↔local respektuje nowszy updatedAt i override SA (nie ginie po odświeżeniu)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.4", label:"Raport → auto-dokumenty",
    items:[
      {type:"new", text:"Zakres z raportu ekipy automatycznie zaznacza „Zakres robót”; rysunek/wymiary — „Rysunek/Plan” (zielony, bez odznaczenia)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.3", label:"Pulpit — dokumenty zostają na kafelku",
    items:[
      {type:"improve", text:"Uwaga dziś — odhaczony dokument świeci na zielono i zostaje widoczny (klik ponownie = cofnięcie)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.2", label:"Pulpit — szybkie oznaczanie dokumentów",
    items:[
      {type:"new", text:"Uwaga dziś — klik w brakujący dokument od razu oznacza jako odebrany (pasek i licznik bez przechodzenia do Robotów)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.1", label:"Pulpit — braki dokumentów",
    items:[
      {type:"improve", text:"Uwaga dziś — czytelna lista braków dokumentów per robota (pasek postępu, wszystkie brakujące pozycje, sortowanie po pilności)"},
      {type:"improve", text:"Klik w robotę na pulpicie otwiera kartę Roboty z checklistą dokumentów"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.0", label:"Aplikacja natywna — Capacitor (Android / iOS)",
    items:[
      {type:"new", text:"Szkielet apki mobilnej (Capacitor) — skorupa Android/iOS ładuje UI z wgdom.fun; aktualizacje bez nowej wersji w sklepie"},
      {type:"improve", text:"Natywny status bar i splash; wyłączenie service workera w WebView (stabilniejsze działanie apki)"},
      {type:"new", text:"Instrukcja buildu: docs/MOBILE-NATIVE.md (Android Studio, Xcode, publikacja)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.17", label:"Edycja danych — wszystkie zakładki",
    items:[
      {type:"fix", text:"Zapis lokalny — edycja w tej karcie nie jest już nadpisywana starym localStorage (lista płac, kartoteka, kontakty, roboty, archiwum)"},
      {type:"fix", text:"Panel pracownika — zmiany listy płac / paragonów bez merge ze starą pamięcią"},
      {type:"improve", text:"Sync do chmury — merge localStorage↔React tylko przed pushem (ochrona wielu kart), nie przy każdym kliknięciu"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.16", label:"Lista płac — zaznaczanie dni",
    items:[
      {type:"fix", text:"Lista płac — zaznaczenie dnia (np. czwartek) działa od razu; edycja nie była nadpisywana przez stary wpis z pamięci"},
      {type:"improve", text:"Checkbox dnia — większy obszar dotyku na telefonie (44px)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.15", label:"Mobile i tablet — Android / iOS",
    items:[
      {type:"improve", text:"Telefon i tablet — dolna nawigacja do 768px; sidebar na większych ekranach (wygodniejsze tablety)"},
      {type:"fix", text:"iOS — brak zoomu przy focus w polach formularza (16px, ważniejsze niż text-sm z Tailwind)"},
      {type:"improve", text:"Modale listy płac (dodaj pracownika, nadpisz tydzień) — bottom sheet na mobile; większe przyciski dotykowe (44px)"},
      {type:"improve", text:"PWA — orientacja dowolna; ikony manifest; safe-area i momentum scroll na iOS"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.14", label:"Sync — audyt wszystkich zakładek i paneli",
    items:[
      {type:"fix", text:"Kontakty i archiwum — usunięte wpisy nie wracają z chmury (tombstones jak przy kartotece / robotach)"},
      {type:"fix", text:"Panel inspektora — merge kartoteki z chmurą; panel pracownika — odświeżanie danych po powrocie do karty"},
      {type:"improve", text:"Pełny audyt sync: wszystkie zakładki admina, pracownik, inspektor — bezpieczny zapis przed chmurą"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.13", label:"Inspektor — trwałe usuwanie powiadomień",
    items:[
      {type:"fix", text:"Inspektor — usunięte powiadomienia nie wracają po odświeżeniu / sync z chmurą (ukryte id scalane przy merge robotów)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.12", label:"Sync — ochrona przed starą kartą w tle",
    items:[
      {type:"fix", text:"Zapis do chmury — ukryta / stara karta nie nadpisuje świeższych danych (localStorage, znaczniki czasu, brak auto-sync w tle)"},
      {type:"improve", text:"Roboty, kartoteka, kontakty, archiwum — scalanie po updatedAt; odświeżenie stanu po powrocie do karty"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.11", label:"Lista płac — trwały zapis stawek z kartoteki",
    items:[
      {type:"fix", text:"Lista płac — stawki zsynchronizowane z kartoteki nie wracają po dniu / odświeżeniu (osobny znacznik czasu stawki vs godzin; ochrona przed starą kartą w tle)"},
      {type:"improve", text:"„Stawki z kartoteki” — natychmiastowy zapis do chmury i aktualizacja archiwum bieżącego tygodnia"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.10", label:"Lista płac — zapis godzin i odznaczanie dni",
    items:[
      {type:"fix", text:"Lista płac — odznaczenie dnia (np. czwartek) i zmiana godzin zostają po odświeżeniu; chmura nie przywraca starego wpisu"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.9", label:"Lista płac — zapis stawek",
    items:[
      {type:"fix", text:"Lista płac — zmiana stawki w tygodniu nie znika po odświeżeniu (sync z chmurą nie nadpisywał stawki przy tych samych godzinach)"},
      {type:"new", text:"Lista płac — przycisk „Stawki z kartoteki” (wyrównanie stawek tygodnia do domyślnych z Pracownicy)"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.8", label:"Reset kodów pracowników",
    items:[
      {type:"improve", text:"Jednorazowy reset wszystkich kodów PIN pracowników — przy pierwszym wejściu po aktualizacji każdy ustawia kod od nowa"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.7", label:"Naprawa logowania pracownika",
    items:[
      {type:"fix", text:"Logowanie pracownika — naprawiony brakujący hash PIN (przycisk Zaloguj działał jak martwy)"},
      {type:"improve", text:"Przycisk logowania aktywny po wyborze profilu — walidacja telefonu/kodu z komunikatem"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.6", label:"Inspektor — paginacja aktywności",
    items:[
      {type:"improve", text:"Admin → Inspektor → Aktywność: 10 wpisów na stronę z numeracją stron"},
      {type:"new", text:"Usuwanie pojedynczych wpisów aktywności inspektora (kosz → potwierdź)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.5", label:"Roboty — lokal i kuchenka",
    items:[
      {type:"new", text:"Roboty — typ lokalu (Zamienny / Komunalny / Repatrianci) — obowiązkowy przed zdaniem"},
      {type:"new", text:"Roboty — kuchenka (gaz / elektr. / 2 paln.) — kompaktowy wybór w karcie roboty"},
      {type:"improve", text:"Inspektor i Admin → Inspektor — ten sam wybór lokalu i kuchenki; sync z Robotami przez chmurę"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.4", label:"SMS — komunikat trybu testowego SMSAPI",
    items:[
      {type:"improve", text:"SMS pilne — wyraźniejszy błąd gdy konto SMSAPI jest testowe (tylko numer z rejestracji)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.3", label:"SMS — zespół + poprawka zaznaczania",
    items:[
      {type:"improve", text:"SMS pilne — lista obejmuje też adminów, moderatorów, super admina i inspektorów (numery z ⚙ Super Admin)"},
      {type:"fix", text:"SMS — „Wyczyść wybór” naprawdę odznacza wszystkich; domyślnie zaznaczeni wszyscy z numerem"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.2", label:"SMS — naprawa pola nadawcy SMSAPI",
    items:[
      {type:"fix", text:"SMSAPI — retry bez błędnego SMSAPI_FROM; czytelniejsze komunikaty (konto testowe, zły nadawca)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.1", label:"Naprawa wyboru zdjęć z galerii",
    items:[
      {type:"fix", text:"Roboty → raport → Foto rysunku / Z galerii — niezawodny wybór pliku na Windows (admin i pracownik)"},
      {type:"fix", text:"Privacy shield pracownika nie blokuje ekranu podczas systemowego okna wyboru pliku"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.0", label:"Pakiet dokumentów + SMS pilne",
    items:[
      {type:"new", text:"Roboty — „Pakiet ZIP” jednym kliknięciem: zlecenie, kosztorys, zdjęcia inspektora i zatwierdzone, checklist w README"},
      {type:"new", text:"Pulpit i Pracownicy — „SMS pilne”: ogłoszenie do wszystkich aktywnych lub wybranych (SMSAPI / Twilio w Supabase)"},
      {type:"improve", text:"Endpoint send-sms-bulk — max 50 odbiorców, prefiks SMS_PREFIX opcjonalny"},
    ],
  },
  {
    date:"2026-05-26", version:"2.18.1", label:"Inspektor — mobile UX",
    items:[
      {type:"improve", text:"Kapsułki sekcji i szybkie akcje — min. 44 px (wygodny dotyk na iPhone/Android)"},
      {type:"new", text:"Baner „Dodaj na ekran główny” w panelu inspektora (iOS + Android PWA)"},
      {type:"new", text:"Pull-to-refresh — ciągnij w dół na liście, w robocie i w Portfolio"},
    ],
  },
  {
    date:"2026-05-26", version:"2.18.0", label:"Inspektor — nawigacja i sekcje",
    items:[
      {type:"new", text:"Panel inspektora — dolny pasek: Robót | Portfolio | Pomoc (jak aplikacja mobilna)"},
      {type:"new", text:"Szczegóły roboty — kapsułki sekcji (WM, Pliki, Dok., Ekipa, Raporty, Zdjęcia) z przewijaniem i badge’ami braków"},
      {type:"improve", text:"Szybkie akcje na robocie (wgraj zlecenie, odpowiedź admina…) + wyróżnienie kart z nową notatką"},
    ],
  },
  {
    date:"2026-05-26", version:"2.17.0", label:"Raport — zakres jak w notatniku",
    items:[
      {type:"improve", text:"Zakres prac — jedno pole tekstowe z listą (kropki, numeracja, podpunkty →); Enter kontynuuje styl listy"},
      {type:"improve", text:"Wklejanie z Notatek / Worda — enter i listy zostają; kropki i numeracja się porządkują"},
    ],
  },
  {
    date:"2026-05-26", version:"2.16.1", label:"Telefony — przypisane do osób, nie ról",
    items:[
      {type:"improve", text:"⚙ Super Admin — numer telefonu przy każdym koncie użytkownika (admin, moderator, inspektor), nie ogólnie per rola"},
      {type:"fix", text:"Panel inspektora synchronizuje numery kont z chmury przy odświeżeniu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.16.0", label:"Inspektor — autor treści + telefon kontaktu",
    items:[
      {type:"new", text:"Panel inspektora — przy każdej treści (raport, zdjęcie, plik, notatka) widać kto dodał; najechanie = numer telefonu"},
      {type:"new", text:"⚙ Super Admin — numer telefonu przypisany do każdego użytkownika (sync w chmurze)"},
      {type:"improve", text:"Raporty z Roboty — admin zapisuje własne imię i rolę zamiast ogólnego „Administrator”"},
    ],
  },
  {
    date:"2026-05-26", version:"2.15.2", label:"Inspektor — naprawa wyśrodkowania",
    items:[
      {type:"fix", text:"Zakładka Inspektor — flex-1 w-full jak Kontakty; treść wyśrodkowana w obszarze obok menu, nie przyklejona do sidebara"},
    ],
  },
  {
    date:"2026-05-26", version:"2.15.1", label:"Inspektor — wyśrodkowany layout",
    items:[
      {type:"improve", text:"Zakładka Inspektor (Aktywność, Portfolio WM, szczegóły roboty) — zawartość wyśrodkowana jak Kontakty i Zmiany (max-w-4xl)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.15.0", label:"WM — workflow tylko w Inspektorze",
    items:[
      {type:"improve", text:"Roboty WM — kompaktowy pasek (etap, termin, link) zamiast pełnego panelu inspektora"},
      {type:"improve", text:"Inspektor (admin) — szczegóły roboty WM in-tab: etap, notatki, pliki, upload zlecenia/kosztorysu"},
      {type:"improve", text:"Pulpit — alerty WM i notatki inspektora otwierają robotę w zakładce Inspektor, nie w Robotach"},
    ],
  },
  {
    date:"2026-05-26", version:"2.14.0", label:"Pliki inspektora — podgląd, pobieranie, email ATH",
    items:[
      {type:"new", text:"Roboty — sekcja „Pliki inspektora”: pobierz, podgląd PDF, wyślij na email (pojedynczo lub zaznaczone)"},
      {type:"new", text:"Podgląd kosztorysów ATH/NOR/XML (best-effort) — włączany w ⚙ Super Admin (domyślnie wył.)"},
      {type:"new", text:"Email z załącznikami plików inspektora (zlecenie, kosztorys, zdjęcia) — endpoint send-job-files-email"},
      {type:"improve", text:"Upload kosztorysu — akceptuje pliki .ath (NORMA)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.13.0", label:"Inspektor — komunikacja, feed, upload admina",
    items:[
      {type:"new", text:"Inspektor — alert gdy admin odpowie w notatkach + mini-historia zmian na karcie roboty"},
      {type:"new", text:"Admin może wgrać zlecenie/kosztorys w Robotach; sugestia etapu po uploadzie zlecenia"},
      {type:"new", text:"Pulpit — kafelek „Aktywne WM” → Portfolio WM"},
      {type:"improve", text:"Badge Inspektor = nieprzeczytane (feed + notatki), nie cała historia"},
      {type:"improve", text:"Feed Inspektor: filtry Etapy/Notatki/Zdjęcia; „Oznacz przeczytane” zamiast auto przy wejściu"},
      {type:"improve", text:"Instrukcja inspektora v2.11 (etapy, notatki, portfolio, zdjęcia); dymki ? na tap mobile"},
      {type:"improve", text:"„Przeczytane” alertów sync w chmurze per admin/inspektor; merge etapów = ostatnia zmiana w activityLog"},
      {type:"improve", text:"Statystyki logowań inspektora — przycisk Odśwież w zakładce Inspektor"},
    ],
  },
  {
    date:"2026-05-26", version:"2.12.0", label:"WM — Pulpit alerty, live sync, spójność statusów",
    items:[
      {type:"new", text:"Pulpit „Uwaga dziś” — alerty WM: termin odbioru minął + odbiór w tym tygodniu (link do roboty i Portfolio WM)"},
      {type:"new", text:"Panel inspektora — live sync: odświeżanie przy powrocie do karty, co 45 s, przycisk Odśwież"},
      {type:"improve", text:"Roboty WM — etap odbioru jako jedyne źródło statusu (bez auto-zdania przy dokumentach); naprawa niespójności przy ładowaniu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.11.0", label:"WM — etapy odbioru, notatki, portfolio",
    items:[
      {type:"new", text:"Etap odbioru WM — wspólny status (zlecenie → realizacja → dokumenty → gotowa → odebrana) dla inspektora i admina"},
      {type:"new", text:"Notatki Inspektor ↔ Admin przy robocie + alert na Pulpicie"},
      {type:"new", text:"Planowana data odbioru WM + Portfolio WM (zbiorczy widok braków i terminów)"},
      {type:"new", text:"Zdjęcia inspektora — osobna galeria (usterki, odbiór), upload z telefonu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.10.3", label:"Inspektor — statystyki, alerty, instrukcja",
    items:[
      {type:"new", text:"Admin → Inspektor: statystyki logowań i wejść (7 dni, ostatnie logowanie, per użytkownik)"},
      {type:"new", text:"Pulpit „Uwaga dziś” — alerty gdy inspektor coś zmienił/wgrał (link do roboty i zakładki Inspektor)"},
      {type:"new", text:"Panel inspektora — instrukcja krok po kroku, baner pierwszego wejścia, dymki ? przy sekcjach"},
      {type:"improve", text:"Liczenie logowań/wejść sync w chmurze (kw-inspector-stats)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.10.2", label:"Roboty ↔ Inspektor — wspólne dane",
    items:[
      {type:"improve", text:"Roboty — sekcja Zlecenie · Kosztorys (ptaszki, pliki inspektora, link do osi Inspektor); ta sama siatka dokumentów też się aktualizuje"},
      {type:"improve", text:"Lista robót — badge Zlec./Kosz. na każdej karcie (zielony ptaszek gdy inspektor zaznaczy lub wgra plik)"},
      {type:"fix", text:"Sync chmury — merge dokumentów (OR) i jobFiles między adminem a inspektorem; wgrany plik auto-zaznacza dokument"},
    ],
  },
  {
    date:"2026-05-26", version:"2.10.1", label:"Admin — zakładka Inspektor",
    items:[
      {type:"new", text:"Menu Inspektor — oś czasu zmian inspektora (dokumenty, zlecenia PDF, kosztorysy) z linkiem do roboty"},
      {type:"improve", text:"Historia w Robotach — bez wpisów inspektora; skrót „X zmian inspektora → zakładka Inspektor”"},
      {type:"improve", text:"Inspektor przy zapisie loguje aktywność do activityLog (sync w chmurze z robotą)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.10.0", label:"Panel Inspektora — Wrocławskie Mieszkania",
    items:[
      {type:"new", text:"Logowanie Inspektor — osobny panel dla Szymona Szóstaka (bez stawek pracowników, z telefonami na robocie)"},
      {type:"new", text:"Inspektor — lista robót, galeria zdjęć z pobieraniem, checklista dokumentów, zakresy i wymiary z raportów"},
      {type:"new", text:"Zlecenie PDF — checkbox + upload; kosztorys NORMA/PDF — ikona statusu i wrzucanie pliku przy robocie"},
      {type:"new", text:"Rola Inspektor w ustawieniach ⚙ — Super Admin może dodać kolejnych inspektorów (hasło sync w chmurze)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.21", label:"Mobile iOS/Android — pracownik i admin",
    items:[
      {type:"improve", text:"Pracownik — sticky powrót z roboty, większe przyciski (44px), zakładki 48px, fix podwójnego znaku wodnego w kolejce offline"},
      {type:"improve", text:"Admin mobile — dolne menu: Pulpit / Lista / Grafik / Roboty + Więcej (6 pozycji); ustawienia ⚙ jako sheet od dołu"},
      {type:"fix", text:"iOS — 100dvh + safe-area na logowaniu, font 16px w polach (bez zoom przy focus)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.20", label:"Super Admin — role i nowi użytkownicy",
    items:[
      {type:"new", text:"Ustawienia ⚙ — zmiana roli Administrator ↔ Moderator (Stanisław, Paweł, dodani użytkownicy)"},
      {type:"new", text:"Kreator konta — login, hasło, poziom (Administrator lub Moderator)"},
      {type:"improve", text:"Nowi użytkownicy i role sync w chmurze (kw-admin-users-config)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.19", label:"Super Admin — zmiana haseł użytkowników",
    items:[
      {type:"new", text:"Ikona ustawień (⚙) w prawym górnym rogu — tylko dla Super Administratora"},
      {type:"new", text:"Panel haseł: zmiana hasła dla Dawida, Stanisława i Pawła + przywrócenie hasła startowego"},
      {type:"improve", text:"Hasła adminów sync w chmurze (kw-admin-passwords) — działają na wszystkich urządzeniach"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.18", label:"Panel admin — 3 użytkowników i role",
    items:[
      {type:"new", text:"Logowanie admina — wybór użytkownika (Dawid / Stanisław / Paweł) + hasło (SHA-256, bez plain text w kodzie)"},
      {type:"new", text:"Role: Super Administrator, Administrator, Moderator — moderator bez podglądu stawek PLN/h"},
      {type:"improve", text:"Moderator — ukryte stawki w kartotece, liście płac, robotach; eksport PDF/Word tylko dla adminów"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.17", label:"Panel pracownika — grafik, paragony, status zdjęć",
    items:[
      {type:"new", text:"Tryb pracownika — „Gdzie dziś pracuję?”: adres i godziny z grafiku / wpisu na robocie"},
      {type:"new", text:"Zakładka Grafik — własny tydzień Pn–So (godziny + adresy robót)"},
      {type:"new", text:"Skan paragonu (chemia, paliwo) → koszty do zwrotu u admina po akceptacji"},
      {type:"improve", text:"Pulpit „Uwaga dziś” — alerty: zdjęcia do akceptacji, nowe raporty od pracowników, paragony/faktury"},
      {type:"improve", text:"Status zdjęć z opisem (oczekuje / zaakceptowane / odrzucone) + powód odrzucenia od admina"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.16", label:"Kartoteka — trwałe usuwanie i sync",
    items:[
      {type:"fix", text:"Usunięcie pracownika z kartoteki nie wraca po wylogowaniu — tombstones kw-directory-deleted-ids (jak przy robotach)"},
      {type:"fix", text:"Edycja telefonu / danych pracownika — zapis od razu po „Zapisz”, logowanie pracownika scala z lokalnym stanem"},
      {type:"fix", text:"Serwer Supabase — akceptuje celowe skrócenie kartoteki z listą usuniętych id"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.15", label:"Konto testowe pracownika",
    items:[
      {type:"new", text:"Kartoteka — „Konto testowe”: tylko tryb pracownika (zdjęcia, raporty), bez listy płac, grafiku, pulpitu i wpisów na robotach"},
      {type:"improve", text:"Auto-wykrywanie konta test (imię „test”, telefon +48 000 000 000) — oznaczenie TEST w kartotece"},
      {type:"improve", text:"Istniejący wpis test na liście płac jest automatycznie usuwany po odświeżeniu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.14", label:"Kod pracownika 4 cyfry",
    items:[
      {type:"new", text:"Logowanie pracownika — telefon + osobisty kod 4 cyfry; pierwsze logowanie: pracownik ustawia kod sam"},
      {type:"new", text:"Kartoteka — admin ustawia lub resetuje kod pracownika; dymki pomocnicze przy polach"},
      {type:"improve", text:"Instrukcja — opis logowania, kodu, resetu i funkcji trybu pracownika (Roboty / Wypłata)"},
      {type:"fix", text:"Odtwarzacz hymnów — panel nie jest przycinany (portal fixed)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.3", label:"Logistyka — bez alertów spójności",
    items:[
      {type:"improve", text:"Pracownik z „Wiele robót dziennie” nie pojawia się w alertach spójności na Pulpicie — wystarczy lista płac"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.13", label:"Odtwarzacz hymnow",
    items:[
      {type:"new", text:"Pasek górny — dyskretny odtwarzacz 4 hymnow firmowych (play, lista, głośność); muzyka w public/music"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.12", label:"Menu — podpowiedzi",
    items:[
      {type:"improve", text:"Lewe menu — po najechaniu delikatny dymek z opisem każdej zakładki"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.11", label:"Galeria zdjęć z robot",
    items:[
      {type:"new", text:"Menu „Zdjęcia” — galeria zaakceptowanych zdjęć pogrupowanych po robotach (Przed / W trakcie / Po)"},
      {type:"new", text:"Po zdaniu mieszkania i kluczy zdjęcia zostają w galerii 30 dni, potem przechodzą do archiwum zdjęć"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.10", label:"Roboty — trwałe usuwanie",
    items:[
      {type:"fix", text:"Usunięte roboty nie wracają po odświeżeniu — zapis do chmury z listą skasowanych id (wymaga deploy funkcji Supabase)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.9", label:"Roboty — usuwanie duplikatów",
    items:[
      {type:"fix", text:"PDF listy płac — scalanie zduplikowanych wpisów tego samego adresu w siatce robót"},
      {type:"improve", text:"Roboty — kosz na liście do usunięcia całej roboty; oznaczenie „Duplikat adresu” gdy ten sam adres jest dwa razy"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.8", label:"PDF — przywrócony układ",
    items:[
      {type:"fix", text:"PDF/Word — cofnięty eksperymentalny układ z v2.9.7; z powrotem ten sam układ co wcześniej, tylko +2 pt czcionki"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.7", label:"PDF — roboty i łamanie stron",
    items:[
      {type:"fix", text:"PDF listy płac — przywrócona tabela „Praca na robotach” (kto, gdzie, godziny) + siatka tygodniowa"},
      {type:"fix", text:"PDF — moduły nie ucinają się przy większej czcionce; nagłówek sekcji osobno, tabela łamie wiersze między stronami"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.6", label:"PDF/Word — większa czcionka",
    items:[
      {type:"improve", text:"Lista płac PDF i Word — powiększone czcionki w tabelach i załącznikach (lepsza czytelność na wydruku)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.5", label:"Pulpit — link do robot",
    items:[
      {type:"improve", text:"Pulpit — alert „Brak dokumentów”: link „Roboty →” jak przy innych alertach w sekcji Uwaga dziś"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.4", label:"Alerty — piątek i sobota",
    items:[
      {type:"improve", text:"Pulpit — alert „Tydzień niezapisany” tylko w sobotę (Pn–Pt tydzień zapisuje się automatycznie w sobotę)"},
      {type:"improve", text:"Pulpit — alert „Nierozliczeni pracownicy” tylko w piątek (dzień rozliczeń)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.2", label:"Logistyka — wiele robót dziennie",
    items:[
      {type:"new", text:"Pracownicy — opcja „Wiele robót dziennie” (kierowca, dostawy): spójność liczy sumę ze wszystkich adresów"},
      {type:"improve", text:"„Popraw” przy spójności — dla logistyki rozdziela godziny z listy płac między roboty (nie jedna robota)"},
      {type:"improve", text:"Roboty — krótki wpis na robocie (domyślnie 2 h) dla pracownika z wieloma robotami dziennie"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.1", label:"Spójność — Popraw + 9 h",
    items:[
      {type:"new", text:"Pulpit — przy rozbieżności godzin przycisk „Popraw”: dopasowuje roboty do listy płac (lista płac ma pierwszeństwo)"},
      {type:"improve", text:"Roboty — domyślnie 9 h przy dodawaniu wpisu; „Wczoraj → dziś” i ręczny wpis biorą godziny z listy płac gdy są"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.0", label:"Pulpit, kartoteka, archiwum",
    items:[
      {type:"new", text:"Pulpit — sekcja „Uwaga dziś”: niezapisany tydzień, nierozliczeni, spójność listy płac ↔ roboty, dokumenty, zdjęcia"},
      {type:"new", text:"Pulpit — alerty rozbieżności godzin (lista płac vs wpisy na robotach)"},
      {type:"new", text:"Pulpit — banner w sobotę: przypomnienie o zapisaniu tygodnia i rozliczeniu pracowników"},
      {type:"new", text:"Pracownicy — karta z archiwum: roczne godziny, wypłaty, wykres miesięczny, lista tygodni"},
      {type:"new", text:"Archiwum — raport roczny PDF: wypłaty × 12 miesięcy, roboty zdane, średni koszt roboczogodziny"},
    ],
  },
  {
    date:"2026-05-26", version:"2.8.1", label:"PDF — siatka pracy na robotach",
    items:[
      {type:"improve", text:"Lista płac PDF — ostatnia strona: siatka tygodniowa (pracownik × dni Pn–So) zamiast długiej listy wiersz po wierszu; uwagi osobno na dole"},
    ],
  },
  {
    date:"2026-05-26", version:"2.8.0", label:"PDF — praca na robotach",
    items:[
      {type:"new", text:"Lista płac PDF — ostatnia strona: kto, na jakiej robocie, ile godzin i koszt (z wpisów w kartach robót)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.9", label:"Lista płac — podgląd PDF",
    items:[
      {type:"new", text:"Lista płac — „Podgląd PDF” w dużym oknie aplikacji (przewijanie, pobieranie z podglądu)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.8", label:"Lista płac — logo w eksporcie",
    items:[
      {type:"improve", text:"PDF, Word i email listy płac — logo W&G DOM obok tytułu „Lista płac”"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.7", label:"Historia zmian — paginacja",
    items:[
      {type:"improve", text:"Zakładka Zmiany — domyślnie 10 wpisów na stronie, przełączanie stron na dole, wybór 10 / 20 / 50 wpisów"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.6", label:"Lista płac — bez stanowiska",
    items:[
      {type:"improve", text:"Logowanie pracownika — na liście widać tylko imię, bez stanowiska"},
      {type:"improve", text:"PDF, Word i e-mail listy płac — usunięto kolumnę Stanowisko ze wszystkich tabel"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.5", label:"PDF/Word — tabela tygodniowa",
    items:[
      {type:"improve", text:"Strona 2 listy płac — jedna tabela: pracownicy w wierszach, dni Pn–So w kolumnach (od–do, dodatkowe, suma dnia)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.4", label:"PDF/Word — rozpis po dniach",
    items:[
      {type:"new", text:"Lista płac PDF i Word — strona 2: szczegółowy rozpis Pn–So (dzień, od–do, podstawa / dodatkowo, zaliczka, uwagi)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.3", label:"Pulpit — poprawne adresy pracowników",
    items:[
      {type:"fix", text:"„Pracuje dziś” nie myli np. „Tomek od Mikołaja” z innym Tomkiem — dopasowanie po ID kartoteki, nie samym imieniu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.2", label:"Pełna ochrona danych w chmurze",
    items:[
      {type:"fix", text:"Każdy zapis do chmury scala dane — pustsza wersja z innej karty nie nadpisze listy płac, archiwum, pracowników ani kontaktów"},
      {type:"new", text:"Kopie prev/prev2 w Supabase dla wszystkich kluczy + dzienny pełny backup (kw-full-day)"},
      {type:"new", text:"Lokalna kopia wszystkich danych przed synchronizacją (to urządzenie)"},
      {type:"new", text:"Menu Dane → „Przywróć wszystkie dane (chmura / lokalnie)”"},
      {type:"improve", text:"Import backup JSON scala pracowników i kontakty z obecnymi danymi"},
      {type:"improve", text:"Start aplikacji (CloudLoader) scala wszystkie typy danych, nie tylko roboty"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.0", label:"Email listy płac + uprawnienia kontaktów",
    items:[
      {type:"new", text:"Lista płac — przycisk Email: wyślij PDF i/lub Word jako załączniki, treść maila z tabelą jak w PDF"},
      {type:"new", text:"Kontakty — uprawnienia Roboty / Lista płac (osobne listy odbiorców przy wysyłce)"},
      {type:"improve", text:"Eksport PDF/Word listy płac — wspólny moduł (ten sam układ co w emailu)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.7", label:"Lista płac — poprawki UI",
    items:[
      {type:"fix", text:"Status Rozliczony / Oczekuje — pełny napis, bez przycinania w tabeli"},
      {type:"new", text:"Sob. poprz. — „+ Opis” zamiast dodatkowych godzin (notatka o pracy lub wypożyczonych ludziach)"},
      {type:"improve", text:"Panel edycji godzin szerszy — lista płac zwęża się po kliknięciu pracownika; bez poziomego przewijania"},
      {type:"new", text:"Opisy Sob. poprz. w eksporcie PDF i Word"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.6", label:"Sobota poprzedniego tygodnia (Sob.pr.)",
    items:[
      {type:"new", text:"Lista płac — pole Sob. poprz. (sobota z poprzedniego tygodnia, wypłata w bieżącym) z dodatkowymi godzinami i opisem"},
      {type:"new", text:"Osobne sumy: tydzień Pn–So, Sob.pr. i razem — w tabeli, panelu, PDF i Word"},
      {type:"improve", text:"Bieżąca sobota (So) pozostaje w tygodniu — dla wypłat w sobotę zamiast w piątek"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.5", label:"Instrukcja — pełna aktualizacja",
    items:[
      {type:"improve", text:"Instrukcja obsługi uzupełniona o wszystkie funkcje z v2.6.0–2.6.4: wypłata pracownika, koszty, dodatkowe godziny, backup w sobotę, zapamiętaj hasło"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.4", label:"Dodatkowe godziny w dniu",
    items:[
      {type:"new", text:"Lista płac — dodatkowe godziny przypisane do konkretnego dnia (opis + godziny od–do), wliczane do wypłaty"},
      {type:"improve", text:"Grafik i sumy godzin uwzględniają dodatkowe bloki; PDF/Word — tabela szczegółów pod listą płac"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.3", label:"Backup w sobotę + koszty do zwrotu",
    items:[
      {type:"improve", text:"Backup emailem — raz w tygodniu w sobotę, po zapisie tygodnia do archiwum (bez codziennych maili)"},
      {type:"new", text:"Lista płac — koszty do zwrotu pracownikowi (chemia, paliwo, zakupy) — dopłata do wypłaty, osobno od zaliczki"},
      {type:"improve", text:"Kolumna Koszty w tabeli, PDF/Word, archiwum i profil wypłaty pracownika"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.2", label:"Lista płac — panel edycji pracownika",
    items:[
      {type:"fix", text:"Panel boczny (godziny, zaliczki) — przewijanie w pionie i poziomie; szerszy panel na laptopie"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.1", label:"Zapamiętaj hasło admina",
    items:[
      {type:"new", text:"Logowanie administratora — opcja „Zapamiętaj hasło na tym urządzeniu” (szyfrowane lokalnie, bez chmury)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.0", label:"Profil wypłaty pracownika",
    items:[
      {type:"new", text:"Zakładka Wypłata u pracownika — kwota do wypłaty w piątek, godziny i tydzień"},
      {type:"new", text:"Archiwum wypłat pracownika — historia zapisanych tygodni z listy płac"},
      {type:"new", text:"Ochrona danych wypłat — ukrywanie przy przełączeniu aplikacji, zakaz kopiowania, komunikat o zrzutach ekranu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.6", label:"Pracownik — głos i rysunek z galerii",
    items:[
      {type:"fix", text:"iPhone: mikrofon nie zawiesza strony — dyktowanie przez 🎤 na klawiaturze (Web Speech API wyłączone na iOS)"},
      {type:"new", text:"Rysunek w raporcie — wybór: zrób zdjęcie aparatem albo wrzuć wcześniejsze z galerii"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.5", label:"Galeria zdjęć na robocie",
    items:[
      {type:"improve", text:"Zdjęcia pogrupowane: Przed remontem · Po remoncie · W trakcie"},
      {type:"improve", text:"Usuwanie zdjęcia — przycisk ✕ na miniaturze zamiast listy pod spodem"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.4", label:"Pracownicy na robocie — grupowanie",
    items:[
      {type:"improve", text:"Wpisy pracy grupowane po pracowniku — jeden wiersz z sumą zamiast długiej listy"},
      {type:"new", text:"Rozwijana lista dni — kliknij pracownika z wieloma wpisami, aby zobaczyć daty, godziny i stawki"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.3", label:"Szybsze wpisy pracowników na robocie",
    items:[
      {type:"improve", text:"Domyślnie 9 godzin przy dodawaniu wpisu (zamiast 8)"},
      {type:"new", text:"„Wczoraj → dziś” — jednym kliknięciem skopiuj wszystkich z wczoraj na dziś (te same stawki i godziny)"},
      {type:"new", text:"Ikona kopiowania przy wierszu — przenieś jednego pracownika na dziś"},
      {type:"new", text:"„Z listy płac” — dodaj na robocie wszystkich zaznaczonych dziś w liście płac (godziny z grafiku lub 9 h)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.2", label:"Pulpit — adres tylko z dzisiejszego wpisu",
    items:[
      {type:"fix", text:"„Pracuje dziś” nie pokazuje adresu z innych dni tygodnia — tylko wpis z datą dzisiejszą"},
    ],
  },
  {
    date:"2026-05-25", version:"2.5.1", label:"Ochrona przed utratą robót",
    items:[
      {type:"fix", text:"Chmura nie nadpisze wielu robót jedną — serwer scala dane przy podejrzanym zapisie"},
      {type:"new", text:"Automatyczne kopie: kw-jobs-prev, prev2 i dzienna w Supabase przy każdym zapisie"},
      {type:"new", text:"Lokalne kopie robót (12 ostatnich) przed synchronizacją z chmurą"},
      {type:"new", text:"Przywróć roboty (chmura / lokalnie) — menu Dane w sidebarze"},
      {type:"improve", text:"Start aplikacji scala lokalne i chmurowe roboty zamiast ślepo nadpisywać"},
      {type:"improve", text:"Backup email codziennie przy pierwszym wejściu (nie tylko w poniedziałek)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.5", label:"Pulpit → robota, link klienta, PWA, offline, historia",
    items:[
      {type:"new", text:"Klik z pulpitu otwiera konkretną robotę (zdjęcia, raporty, brak dokumentów, lista aktywnych)"},
      {type:"new", text:"Link podglądu dla klienta — tylko zaakceptowane zdjęcia i raporty (?podglad=TOKEN)"},
      {type:"new", text:"PWA „Dodaj na ekran” — baner instalacji dla pracowników (Android + instrukcja iOS)"},
      {type:"new", text:"Kolejka zdjęć offline — pracownik bez sieci; auto-wysyłka po powrocie internetu"},
      {type:"new", text:"Historia roboty — log zdarzeń (zdjęcia, dokumenty, email, link, status)"},
      {type:"new", text:"Przypomnienie o brakujących dokumentach po 7+ dniach (pulpit i karta roboty)"},
      {type:"new", text:"Notatka głosowa w raporcie pracownika — zakres prac i wiadomość dla admina"},
      {type:"new", text:"Watermark na zdjęciach — adres, data i W&G DOM przed wysłaniem"},
    ],
  },
  {
    date:"2026-05-25", version:"2.4", label:"Email z roboty + lista kontaktów",
    items:[
      {type:"new", text:"Zakładka Kontakty — lista odbiorców email (nazwa, adres, firma)"},
      {type:"new", text:"Przy robocie: przycisk Email — wybór odbiorcy i zaznaczenie zdjęć, zakresu, wymiarów, rysunku"},
      {type:"improve", text:"Można wysłać wszystko lub pojedyncze pozycje; pusty email nie zostanie wysłany"},
    ],
  },
  {
    date:"2026-05-25", version:"2.3", label:"Nowy pulpit — czytelniejszy układ",
    items:[
      {type:"improve", text:"Pulpit przeprojektowany: nagłówek z datą, skróty Grafik / Lista płac / Roboty"},
      {type:"new", text:"Sekcja „Wymaga uwagi”: zdjęcia do akceptacji, raporty pracowników (14 dni), brakujące dokumenty"},
      {type:"improve", text:"„Pracuje dziś” — tylko aktywni (bez długiej listy „wolne”), link do grafiku"},
      {type:"improve", text:"Lista robót z etykietami raportów i oczekujących zdjęć; finanse i archiwum na dole"},
    ],
  },
  {
    date:"2026-05-25", version:"2.2", label:"Edycja raportów i opisy pracownika",
    items:[
      {type:"new", text:"Pracownik może edytować i usuwać swoje raporty (ikona ołówka / kosz)"},
      {type:"new", text:"Opisy: do każdego punktu zakresu, pomieszczenia, rysunku i całego raportu (wiadomość dla admina)"},
      {type:"new", text:"Opisy zdjęć — przy galerii (każde zdjęcie), aparacie i po wgraniu (edycja + usunięcie)"},
      {type:"improve", text:"Admin widzi wszystkie opisy w raportach i pod zdjęciami"},
    ],
  },
  {
    date:"2026-05-25", version:"2.1", label:"Raport admina + uproszczenie robót",
    items:[
      {type:"new", text:"Admin może dodać raport (zakres + wymiary / rysunek) bezpośrednio w Roboty — ten sam formularz co pracownik"},
      {type:"improve", text:"Sekcja raportów: formularz u góry, lista zapisanych poniżej"},
      {type:"improve", text:"Usunięto sekcję Faktura / Rozliczenie z klientem z karty roboty i pulpit"},
    ],
  },
  {
    date:"2026-05-25", version:"2.0", label:"Raporty pracownika — zakres prac i wymiary",
    items:[
      {type:"new", text:"Tryb pracownika: raport z budowy — punkty wykonanych prac + wymiary pomieszczeń (salon, pokoje, kuchnia, korytarz, łazienka, WC)"},
      {type:"new", text:"Alternatywa do wpisywania: zdjęcie rysunku z wymiarami"},
      {type:"new", text:"Panel admina: sekcja „Raporty pracowników” przy robocie — rozwijana lista z datą, zakresem, tabelą wymiarów i rysunkiem"},
      {type:"improve", text:"Lista robót — etykieta z liczbą raportów; pracownik widzi swoje wysłane raporty"},
    ],
  },
  {
    date:"2026-05-25", version:"1.9", label:"Pełne archiwum tygodnia",
    items:[
      {type:"new", text:"Archiwum zapisuje cały tydzień: lista płac (dni, godziny, zaliczki) + grafik + wpisy na robotach"},
      {type:"new", text:"W Archiwum po rozwinięciu tygodnia: zakładki Lista płac | Grafik"},
      {type:"improve", text:"Auto-zapis w sobotę — pełny snapshot bieżącego tygodnia do archiwum"},
      {type:"improve", text:"Przejście na nowy tydzień nadal archiwizuje poprzedni (z pełnymi danymi)"},
      {type:"new", text:"Gotowość pod Vercel + GitHub — konfiguracja przez zmienne VITE_SUPABASE_*"},
    ],
  },
  {
    date:"2026-05-25", version:"1.8", label:"Grafik tygodniowy",
    items:[
      {type:"new", text:"Zakładka Grafik — siatka dni × pracownicy: godziny z listy płac + adres roboty"},
      {type:"new", text:"Przewijanie poziome na telefonie, sticky kolumna z imionami, podświetlenie dzisiejszego dnia"},
      {type:"improve", text:"Ten sam wybór tygodnia co Lista Płac (daty od–do, bieżący tydzień)"},
    ],
  },
  {
    date:"2026-05-25", version:"1.7", label:"Logowanie pracownika & galeria zdjęć",
    items:[
      {type:"new", text:"Pracownik wybiera się z listy kartoteki — hasło to 9 ostatnich cyfr telefonu (bez +48)"},
      {type:"new", text:"Galeria — wybór wielu zdjęć naraz, podgląd przed wysłaniem i pasek postępu"},
      {type:"improve", text:"Bez numeru w kartotece pracownik nie może się zalogować (komunikat dla admina)"},
    ],
  },
  {
    date:"2026-05-25", version:"1.6", label:"Zasady rozwoju & spójna dokumentacja",
    items:[
      {type:"new", text:"Moduł cloud-sync — jeden punkt zapisu do chmury Supabase dla wszystkich danych"},
      {type:"improve", text:"Ustalone zasady: każda trwała zmiana → chmura, wpis w Zmianach, opis w Instrukcji"},
      {type:"new", text:"Instrukcja: sekcje „Historia zmian” i „Co zapisuje się w chmurze”"},
      {type:"fix", text:"Logo aplikacji — poprawiona ścieżka do pliku w projekcie"},
      {type:"fix", text:"Pulpit — lepsze dopasowanie pracownika do roboty (imię, kartoteka, data lokalna, wpisy z tygodnia)"},
      {type:"new", text:"Pulpit — przy „Pracuje dziś” widać ulicę roboty, jeśli pracownik ma wpis czasu na dziś"},
      {type:"fix", text:"Tryb pracownika — naprawione wgrywanie zdjęć (endpoint storage-upload na serwerze Supabase)"},
      {type:"improve", text:"Tryb pracownika — lista robót ładuje się z chmury przy wejściu; czytelniejsze komunikaty błędów"},
    ],
  },
  {
    date:"2026-05-25", version:"1.5", label:"Raport miesięczny & Email backup",
    items:[
      {type:"new", text:"Raport miesięczny PDF — pełny dokument z robotami, listą płac i podsumowaniem finansowym"},
      {type:"new", text:"Auto-backup wysyłany e-mailem co poniedziałek na dawid.thai@int.pl (przez Resend API)"},
      {type:"new", text:"Lista zmian — ta strona"},
    ],
  },
  {
    date:"2026-05-25", version:"1.4", label:"7 usprawnień operacyjnych",
    items:[
      {type:"new", text:"PDF eksport pojedynczej roboty — karta z dokumentami, pracownikami, materiałami i kosztem"},
      {type:"new", text:"Kopiuj pracowników z poprzedniego tygodnia — jeden klik wypełnia listę płac"},
      {type:"new", text:"Filtrowanie robót po pracowniku — dropdown w panelu listy robót"},
      {type:"new", text:"Sobotni reminder — baner przypominający o zamknięciu tygodnia"},
      {type:"new", text:"Potwierdzenie nadpisania archiwum — dialog przed nadpisaniem zapisanego tygodnia"},
      {type:"new", text:"Notatki głosowe (mikrofon) — dyktowanie notatek w robotach (Chrome/Edge)"},
      {type:"new", text:"Auto-backup co poniedziałek — wcześniej pobierał plik lokalnie, teraz wysyła email"},
    ],
  },
  {
    date:"2026-05-24", version:"1.3", label:"Synchronizacja w chmurze (Supabase)",
    items:[
      {type:"new", text:"Synchronizacja danych przez Supabase — dane dostępne na wszystkich urządzeniach"},
      {type:"new", text:"Wskaźnik synchronizacji w topbarze (chmurka zielona/animowana/błąd)"},
      {type:"new", text:"CloudLoader — wczytuje dane z chmury przed startem aplikacji"},
      {type:"new", text:"Zdjęcia jako opcjonalny typ dokumentu w robotach (nie blokuje statusu \"Zdane\")"},
      {type:"improve", text:"Eksport/Import backup JSON z automatycznym push do chmury po imporcie"},
      {type:"fix", text:"Naprawa kalkulacji tygodnia w niedzielę — aplikacja prawidłowo przechodzi na kolejny tydzień"},
    ],
  },
  {
    date:"2026-05-23", version:"1.2", label:"Eksport PDF/Word & Interfejs mobilny",
    items:[
      {type:"new", text:"Eksport listy płac do PDF z polskimi znakami (pdfmake + czcionka Roboto)"},
      {type:"new", text:"Eksport listy płac do Word z polskimi znakami (docx + czcionka Calibri)"},
      {type:"new", text:"Pełna obsługa iPhone i Safari — dynamiczna wysokość (100dvh), safe-area-inset"},
      {type:"new", text:"Dolna nawigacja na urządzeniach mobilnych"},
      {type:"improve", text:"Domyślna godzina rozpoczęcia pracy zmieniona z 08:00 na 07:00"},
      {type:"improve", text:"Automatyczna migracja istniejących pracowników z 08:00 na 07:00"},
    ],
  },
  {
    date:"2026-05-22", version:"1.1", label:"Lista Płac — ulepszenia",
    items:[
      {type:"new", text:"Picker z zaznaczaniem wielu pracowników naraz — \"Zaznacz wszystkich\" i odznaczanie pojedynczo"},
      {type:"new", text:"Automatyczne przejście na bieżący tydzień przy starcie aplikacji"},
      {type:"new", text:"Przycisk \"Bieżący tydzień\" w Lista Płac"},
      {type:"new", text:"Auto-archiwizacja poprzedniego tygodnia przy przejściu do nowego"},
    ],
  },
  {
    date:"2026-05-20", version:"1.0", label:"Pierwsze uruchomienie aplikacji",
    items:[
      {type:"new", text:"Dashboard — przegląd aktywnych robót, wypłat tygodnia, pracujących dziś"},
      {type:"new", text:"Lista Płac — tygodniowe śledzenie godzin, zaliczek i wypłat pracowników"},
      {type:"new", text:"Kartoteka pracowników — dane, stawki, stanowiska, historia zatrudnienia"},
      {type:"new", text:"Archiwum tygodni — historia zapisanych tygodni z podsumowaniami rocznymi/miesięcznymi"},
      {type:"new", text:"Roboty — zarządzanie zleceniami z dokumentami do odbioru, pracownikami i materiałami"},
      {type:"new", text:"Moduł fakturowania — status FV, numer, kwota, wyliczony zysk"},
      {type:"new", text:"Globalne wyszukiwanie pracowników i robót"},
      {type:"new", text:"Dane przechowywane lokalnie w przeglądarce (localStorage)"},
    ],
  },
];

export const APP_VERSION = CHANGELOG[0]?.version ?? "0.0.0";
