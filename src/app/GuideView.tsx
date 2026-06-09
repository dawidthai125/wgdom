import { useState, useMemo, useEffect, useRef, type ElementType, type ReactNode } from "react";
import {
  BookOpen,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  ChevronDown as ChevDown,
  Smartphone,
  Monitor,
  CalendarDays,
  FileText,
  MapPin,
  Scale,
  Users,
  Archive,
  HardHat,
  ClipboardCheck,
  Cloud,
  Download,
  HelpCircle,
  FileDown,
  AlertTriangle,
  Sparkles,
  Copy,
  Mic,
  Bell,
  BarChart3,
  LayoutDashboard,
  Calendar,
  Wallet,
  Clock,
  Search,
  KeyRound,
  Mail,
} from "lucide-react";
import { useWheelScrollForward } from "@/lib/wheel-scroll-forward";
import { CHANGELOG } from "@/app/changelog-data";

function fmtDate(iso: string) {
  if (!iso) return "";
  const [y, mo, d] = iso.split("-");
  return `${d}.${mo}.${y}`;
}

function HelpView({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState<string|null>("start");

  const sections: {id:string; icon:ElementType; title:string; subtitle:string; content:ReactNode}[] = [
    {
      id:"start",
      icon:Smartphone,
      title:"Od czego zacząć?",
      subtitle:"Pierwsze kroki w aplikacji",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Aplikacja W&G DOM służy do zarządzania pracownikami, robotami i finansami firmy. Wszystkie dane zapisują się automatycznie i są dostępne na każdym urządzeniu — telefonie, tablecie i komputerze.</p>
          <div className="space-y-3">
            {[
              {num:"1", title:"Dodaj pracowników", desc:'Kliknij "Pracownicy" w menu → "Nowy pracownik". Wpisz imię, nazwisko, telefon, stanowisko i stawkę godzinową. To trzeba zrobić tylko raz — potem ta lista będzie dostępna w całej aplikacji.'},
              {num:"2", title:"Otwórz nową robotę", desc:'Kliknij "Roboty" w menu → "Nowa robota". Wpisz adres, klienta i datę rozpoczęcia. Możesz od razu zacząć zaznaczać dokumenty i dodawać pracowników.'},
              {num:"3", title:"Uzupełniaj listę płac w tygodniu", desc:'Kliknij "Lista Płac" → "Dodaj pracownika". Zaznacz dni, godziny, ewentualne zaliczki, koszty do zwrotu (chemia, paliwo) i dodatkowe godziny (np. dogrywka wieczorem). Pod koniec tygodnia kliknij "Zapisz tydzień".'},
            ].map(s=>(
              <div key={s.num} className="flex gap-4 bg-secondary/50 rounded-xl p-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">{s.num}</div>
                <div>
                  <p className="text-sm font-semibold mb-1">{s.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
            <Monitor size={16} className="text-blue-400 shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-medium text-blue-400 mb-1">Dane synchronizują się automatycznie</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Nie musisz nic zapisywać ręcznie. Chmurka w prawym górnym rogu mruga gdy zapisuje — jak jest zielona, wszystko jest bezpieczne. Otwórz aplikację na telefonie, danych i na wszystkich urządzeniach będą te same dane.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id:"schedule",
      icon:CalendarDays,
      title:"Grafik tygodniowy",
      subtitle:"Siatka: kto, gdzie i kiedy",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">W menu <strong>Grafik</strong> widzisz tabelę: wiersze to pracownicy z bieżącego tygodnia listy płac, kolumny to dni (Pn–So) z datami.</p>
          <div className="space-y-3">
            {[
              {q:"Skąd biorą się godziny?", a:"Z Listy Płac — podstawowa zmiana (zaznaczony dzień, od–do) plus ewentualne „Dodatkowe godziny” pod dniem. W komórce widać łączną sumę i zakresy, np. 07:00–16:00 + 16:00–18:00. Jeśli nie ma godzin w liście płac, komórka jest pusta (—), chyba że jest wpis na robocie."},
              {q:"Czy grafik pokazuje dodatkowe godziny?", a:"Tak — grafik sumuje podstawową zmianę i bloki dodatkowych godzin. W PDF/Word jest osobna „Karta dodatkowych godzin” ze stawką, kwotą brutto i opisem każdego bloku."},
              {q:"Skąd bierze się adres?", a:"Z Roboty → Pracownicy na robocie → Dodaj wpis z datą tego dnia. Adres pojawia się pod godzinami z ikoną pinezki."},
              {q:"Czy grafik zmienia dane?", a:"Nie — tylko podgląd. Edycja godzin: Lista Płac. Edycja miejsca pracy: Roboty."},
              {q:"Inny tydzień?", a:"Zmień daty u góry (tak jak w Liście Płac) lub kliknij „Bieżący tydzień”."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"payroll",
      icon:FileText,
      title:"Lista Płac",
      subtitle:"Jak rozliczać pracowników tygodniowo",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Lista Płac służy do śledzenia godzin pracy każdego pracownika w danym tygodniu i wyliczania wypłat.</p>
          <div className="space-y-3">
            {[
              {q:"Jak dodać pracownika do tygodnia?", a:'Kliknij "Dodaj pracownika" → zaznacz jednego lub kilku pracowników z listy (lub "Zaznacz wszystkich") → kliknij "Dodaj zaznaczonych". Jeśli tydzień jest pusty, pojawi się też przycisk "Kopiuj z poprzedniego tygodnia" — kliknij go, żeby od razu dodać tych samych co ostatnio.'},
              {q:"Jak wpisać godziny pracy?", a:"Kliknij na pracownika na liście — otworzy się panel z dniami tygodnia. Zaznacz dni kiedy pracował i wpisz godziny od–do. Aplikacja sama policzy ile godzin i ile się należy."},
              {q:"Jak dodać dodatkowe godziny w danym dniu?", a:"W panelu pracownika, pod wybranym dniem kliknij „Dodatkowe godziny w …”. Wpisz opis (np. dogrywka wieczorem, transport), godziny od–do i zapisz. Godziny dodają się do sumy dnia i całego tygodnia — w PDF/Word pojawi się osobna tabelka ze szczegółami."},
              {q:"Co to jest Sob. poprz.?", a:"Sobota poprzedniego tygodnia — wypłacana w bieżącym tygodniu (bo za sobotę płacisz dopiero w następnym). U góry panelu pracownika, na żółtym tle: godziny, zaliczka i przycisk „+ Opis” (np. co robiono albo ilu pracowników wypożyczono innym). Bieżąca sobota (ostatni wiersz Pn–So) to praca w tym tygodniu — czasem wypłata w sobotę zamiast w piątek."},
              {q:"Jak czytać sumy na liście płac?", a:"Kolumna Tydzień = godziny Pn–So bieżącego tygodnia (bez sob. poprz.). Sob.pr. = tylko sobota z poprzedniego tygodnia. Razem h = obie sumy. Na dole tabeli są trzy wiersze: Tydzień Pn–So, Sob. poprz. (jeśli jest) i RAZEM z do wypłaty."},
              {q:"Co to jest zaliczka?", a:"Jeśli pracownik wziął od Ciebie gotówkę z góry (np. na wypłatę w trakcie tygodnia), wpisz kwotę jako zaliczkę w danym dniu. Zostanie odjęta od kwoty do wypłaty."},
              {q:"Co to są koszty do zwrotu?", a:"W panelu pracownika (sekcja pod dniami tygodnia) kliknij „Dodaj” przy „Koszty do zwrotu”. Wpisz opis (chemia, paliwo, zakupy) i kwotę. Te koszty są doliczane do wypłaty — w przeciwieństwie do zaliczki, która jest odejmowana. Wzór: do wypłaty = brutto − zaliczki + koszty do zwrotu."},
              {q:"Jak liczy się wypłata?", a:"Brutto = łączne godziny (w tym dodatkowe) × stawka. Do wypłaty = brutto − suma zaliczek + suma kosztów do zwrotu. Kolumny w tabeli, PDF i Word pokazują te składniki osobno."},
              {q:"Co oznacza status Rozliczony / Oczekuje?", a:'Kiedy wypłacisz pracownikowi należną kwotę, kliknij przycisk "Oczekuje" — zmieni się na zielony "Rozliczony". To tylko znacznik dla Ciebie, żebyś wiedział komu już zapłaciłeś.'},
              {q:"Jak zapisać tydzień do archiwum?", a:'Kliknij „Zapisz tydzień” — to kopia zapasowa (backup) z e-mailem. Tydzień pozostaje aktywny: możesz dalej edytować godziny, rozliczać wypłaty i przenosić je na następny tydzień (⏭). Dopiero po przejściu na kolejny tydzień płac (rollover w niedzielę ≥20:00) zapisany tydzień staje się historyczny — wtedy lista i PDF pokazują zamrożony snapshot. Jeśli zapis już istnieje, aplikacja zapyta czy nadpisać.'},
              {q:"Przenieś wypłatę na następny tydzień (⏭)", a:"Otwórz pracownika na liście płac (klik w wiersz) → w panelu bocznym kliknij „Przenieś … PLN na następny tydzień”. Kwota zostaje zamrożona — w tym tygodniu zobaczysz PRZENIESIONO; w następnym wypłata = bieżąca + przeniesiona. Działa dla tygodniówki (nie co 2 tyg.), nie w urlopie, nie drugi raz. Możliwe także po „Zapisz tydzień” — dopóki nie minął rollover na kolejny tydzień płac. Tydzień historyczny (po rolloverze) — tylko podgląd, bez przeniesienia."},
              {q:"Zapisany tydzień vs tydzień historyczny", a:"Zapisany = masz backup w archiwum, ale nadal pracujesz na bieżącym tygodniu płac (edycja, wypłaty, ⏭). Historyczny = po rolloverze — podgląd ze snapshotu, PDF/DOCX zamrożone, przeniesienia zablokowane. Urlopu nie dodasz retroaktywnie dla tygodni już w archiwum (niezależnie od tego, czy aktywny czy historyczny)."},
              {q:"Jak przejść do innego tygodnia?", a:'Zmień daty ręcznie lub kliknij "Bieżący tydzień" żeby wrócić do aktualnego. Aplikacja automatycznie archiwizuje poprzedni tydzień przy przejściu.'},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-3">
            <FileDown size={16} className="text-primary shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-medium text-primary mb-1">Eksport do PDF i Word</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Przycisk „Podgląd PDF” otwiera dokument w oknie aplikacji. PDF zawiera też ostatnią stronę z przypisaniami do robót (wpisy z kart robót w danym tygodniu). „PDF” zapisuje plik; „Word” generuje .docx.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id:"jobs",
      icon:MapPin,
      title:"Roboty",
      subtitle:"Zarządzanie zleceniami i dokumentami",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">W zakładce Roboty prowadzisz ewidencję wszystkich zleceń — od otwarcia do zdania kluczy. Każda robota ma swoją kartę z dokumentami, pracownikami i kosztami.</p>
          <div className="space-y-3">
            {[
              {q:"Jak założyć nową robotę?", a:'Kliknij "Nowa robota" w lewym górnym rogu. Wpisz adres, numer mieszkania i klienta. Pod polami dat wybierz typ lokalu (Zamienny / Komunalny / Repatrianci — obowiązkowe) oraz kuchenkę (gaz / elektr. / 2 paln.).'},
              {q:"Dokumenty do odbioru — co to jest?", a:"To lista dokumentów które trzeba zebrać żeby zdać robotę. Zaznaczaj je gdy je masz: Zlecenie, Zakres robót, Kosztorys, Kominiarz, Pomiary, Oświadczenia, Gwarancje, Rysunek/Plan. Zdjęcia są opcjonalne. Pasek postępu na liście robót pokazuje ile dokumentów masz już skompletowanych."},
              {q:"Generic File Attachments (20.5A.10)", a:"Roboty → Pliki — pod dokumentami kontraktowymi (zlecenie, kosztorys, plan) jest sekcja Załączniki ogólne. Tylko administrator wgrywa i usuwa: PDF, DOC/DOCX, XLS/XLSX, ZIP, RAR, DWG, TXT do 25 MB. Zdjęcia (JPG/PNG) wrzucaj w zakładkę Zdjęcia. Podgląd: PDF, DOCX, XLSX; reszta — pobierz. Osobny przycisk Załączniki ZIP (folder zalaczniki/). Email plików: domyślnie tylko dokumenty kontraktowe; opcjonalnie dołącz załączniki ogólne."},
              {q:"Szkic terenowy vs plan techniczny PDF (20.5A.9)", a:"To dwa różne artefakty. Szkic terenowy — zdjęcie lub odręczny rzut z budowy (JPG/PNG) — wrzuca ekipa lub inspektor w raporcie z wymiarami; trafia do Zdjęć. Plan techniczny — gotowy PDF z biura (legendy, wymiary, opisy) — wgrywa administrator w Robotach → Pliki roboty → „Dodaj plan techniczny”. Oba mogą zaznaczyć „Rysunek/Plan” w dokumentach do odbioru. Nie wrzucaj planu PDF jako Zlecenie."},
              {q:"Kiedy robota zmienia status na Zdana?", a:"Gdy zaznaczysz wszystkie wymagane dokumenty (bez zdjęć) i wybierzesz typ lokalu. Przycisk „Zdane” ostrzeje, jeśli brakuje dokumentów albo typu lokalu."},
              {q:"Jak dodać czas pracy na robocie?", a:'Roboty → wybierz robotę → „Pracownicy na robocie”. Najszybciej: „Wczoraj → dziś” (ta sama ekipa co wczoraj) lub „Z listy płac” (osoby zaznaczone dziś w liście płac). Ręcznie: „Dodaj wpis” — pracownik, data (domyślnie dziś), 9 h, stawka. Wpis pokazuje adres na Pulpicie i w Grafiku.'},
              {q:"Jak dodać koszty materiałów?", a:'Przewiń do sekcji "Materiały" → kliknij "Dodaj". Wpisz opis i koszt. Materiały sumują się z kosztem pracy i tworzą łączny koszt remontu.'},
              {q:"Jak dodać raport (zakres + wymiary)?", a:'Sekcja „Raporty — zakres i wymiary” na karcie roboty: u góry formularz (taki sam jak u pracownika), na dole lista wysłanych raportów. Możesz też poprosić pracownika o wysłanie z telefonu.'},
              {q:"Jak wyeksportować kartę roboty do PDF?", a:'Kliknij czerwony przycisk "PDF" w nagłówku roboty. Wygeneruje się dokument z dokumentami, pracownikami, materiałami i podsumowaniem kosztów.'},
              {q:"Raporty pracowników — gdzie?", a:"Roboty → wybierz robotę → „Raporty — zakres i wymiary”. Rozwiń wpis — widać punkty, tabelę pomieszczeń i rysunek."},
              {q:"Link podglądu dla klienta", a:"W karcie roboty: sekcja „Podgląd dla klienta” → Utwórz link → Kopiuj. Klient otwiera link bez logowania — widzi tylko zaakceptowane zdjęcia i raporty (bez kosztów). Wyłącz link gdy nie jest już potrzebny."},
              {q:"Historia roboty", a:"Przycisk „Historia” na karcie roboty — log zdarzeń: zdjęcia, dokumenty, emaile, link klienta, zmiany statusu."},
              {q:"Pulpit — szybki dostęp do roboty", a:"W sekcji „Uwaga dziś” i „Roboty w trakcie” kliknij wiersz — aplikacja otworzy od razu tę robotę w zakładce Roboty."},
              {q:"Lista robót — układ i KPI (2.1A)", a:"Kolejność: przyciski Nowa robota / Pliki → KPI (W toku, Do odbioru, Bez ekipy, BZP, WM po terminie) → przełącznik Lista / Kolejki → szukaj → fazy → lista lub kolejki. Klik w kafelek KPI włącza filtr (drugi klik wyłącza). Filtry ▼: lider realizacji, pracownik (godziny), zaznacz wiele do usunięcia. Karta: adres i status, klient • termin • lider, badge Aktywni dziś (wpisy na dziś), BZP, WM."},
              {q:"Roboty — widok Kolejki (2.50)", a:"Przełącznik Kolejki zbiera pilne roboty w sekcjach zamiast chronologii miesięcy: WM po terminie (planowany odbiór minął), BZP wymaga startu (kontrakt czeka na „Rozpocznij realizację”), Bez ekipy (brak planowej ekipy), Do odbioru — braki (faza odbioru, brakuje dokumentów), Gotowe do zdania (komplet docs — można oznaczyć Zdane), Dokumenty >7 dni (w toku dłużej niż tydzień bez kompletu). Jedna robota trafia tylko do jednej sekcji. Szukajka i KPI działają tak samo jak w Liście."},
              {q:"Do rozliczenia na robocie (2.49)", a:"Na liście robót badge 💰 pokazuje liczbę nierozliczonych pozycji powiązanych z robotą (źródło kosztu). W Przeglądzie roboty — karta Do rozliczenia: kwota do odzyskania, liczba pozycji, odzyskano, alerty; lista pozycji źródłowych i rozliczeń zaksięgowanych na tej robocie. Klik w pozycję otwiera moduł Do rozliczenia z zaznaczeniem."},
              {q:"Dodaj pozycję do rozliczenia z roboty (2.49.10)", a:"Na karcie Do rozliczenia kliknij ➕ Dodaj do rozliczenia. Formularz uzupełnia robotę, klienta, adres i inspektora (lider ekipy) — wpisujesz tytuł, kwotę i opis. Po zapisie zostajesz na robocie; KPI i lista odświeżają się automatycznie."},
              {q:"Uwagi inspektora do pozycji (2.49.80)", a:"W Przeglądzie roboty — karta Do rozliczenia pokazuje wątek uwag per pozycja. Odpowiedz inspektorowi bez zmiany kwot rozliczenia. Na Pulpicie nowe uwagi billing mają prefiks „Do rozliczenia”. W module Do rozliczenia — sekcja Uwagi inspektora przy pozycji z roboty."},
              {q:"Billing Evidence Pack — dowody billing (20.5A.5)", a:"W wątku uwag przy pozycji inspektor może dołączyć zdjęcia (do 3) i PDF (1) jako dowód rozliczeniowy. Kliknij miniaturę lub nazwę PDF — podgląd inline bez pobierania. Załączniki nie zmieniają kwot ani statusu pozycji."},
              {q:"Zgłoszenia inspektora — nowa pozycja (20.5A.6)", a:"Gdy na robocie nie ma jeszcze pozycji Do rozliczenia, inspektor może kliknąć Zgłoś pozycję — opis, kwota i dowody trafiają jako propozycja (sync kw-jobs). Administrator w sekcji Zgłoszenia inspektora zatwierdza (tworzy pozycję w module) lub odrzuca z powodem. KPI i badge 💰 rosną dopiero po zatwierdzeniu."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"tenders",
      icon:Scale,
      title:"Przetargi BZP",
      subtitle:"Pipeline ogłoszeń, SWZ i powiązanie z robotą",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Zakładka <strong>Przetargi</strong> zbiera ogłoszenia z Biuletynu Zamówień Publicznych (e-Zamówienia) dopasowane do profilu W&G DOM — remonty budynków we Wrocławiu i okolicy. Pipeline zapisuje się w chmurze (<code>kw-tenders-pipeline</code>).</p>
          <div className="space-y-3">
            {[
              {q:"Kto widzi zakładkę Przetargi?", a:"Super Administrator zawsze. Administrator i Moderator — gdy włączysz to w Ustawieniach (⚙): „Zakładka Przetargi dla administratorów i moderatorów”."},
              {q:"Jak odświeżyć listę?", a:"Przycisk „Odśwież z BZP” pobiera nowe ogłoszenia z dolnośląskiego BZP i od kluczowych zamawiających (WM, ZIK, ZIM, TBS, Gmina, MOPS). Aplikacja też odświeża listę automatycznie co ~20 h."},
              {q:"Co to „Do zgłoszenia”?", a:"Domyślny filtr — tylko aktywne przetargi (otwarty termin składania ofert), z Wrocławia lub od kluczowych zamawiających, pasujące do słownika remontów wnętrz."},
              {q:"Rozwiń przetarg — co się dzieje?", a:"Auto-analiza buduje Kartę przetargu: przedmiot, terminy, wadium, kontakt, referencje, tabela pozycji kosztorysu i przedmiar z załączników BZP (ATH/NOR/XML/PDF/DOCX/XLSX/ZIP) — bez wychodzenia na e-Zamówienia. Sekcja „Załączniki postępowania” skanuje pliki z BZP — przy każdym jest Podgląd i Pobierz. Gdy na e-Zamówieniach brak kosztorysu lub wartości — aplikacja szuka dokumentów u zamawiającego (BIP, linki z ogłoszenia). Możesz też wgrać SWZ ręcznie."},
              {q:"Dokumenty u zamawiającego (BIP)", a:"Gdy załączniki e-Zamówienia nie wystarczą: linki tylko z treści ogłoszenia BZP + ewentualnie wyszukiwanie BIP po słowach z tytułu i numerze postępowania (nie cały portal). Pobierane są max. 3 pliki pasujące do tego przetargu (SWZ/kosztorys). Resztę otwórz ręcznie z listy linków z ogłoszenia."},
              {q:"Kalkulator ceny ofertowej", a:"Po rozwinięciu przetargu z kosztorysem zobaczysz propozycję ceny: robocizna (stawki z listy płac), materiały z ATH, koszty stałe firmy, marża. Stawki i koszty poboczne (paliwo, narzędzia, BHP…) edytujesz w „Profil firmy” u góry listy Przetargi."},
              {q:"Koszty robocizny w Robotach", a:"W karcie roboty — panel „Koszty robocizny”: ile kosztuje ekipa na tej robocie wg listy płac i alokacji kosztów pobocznych (paliwo, narzędzia…) proporcjonalnie do godzin. Pokazuje też minimalną cenę z marżą."},
              {q:"Ocena opłacalności", a:"Po analizie SWZ widzisz ocenę (Sensowny / Ostrożnie / Ryzykowny). Wpisz „Nasz szacunek” — system porówna z wartością zamówienia i wadium."},
              {q:"Profil firmy i szacunek szans", a:"U góry listy Przetargi rozwiń „Profil firmy” — referencje, max wadium, CPV, regiony, polisę OC oraz model kosztów (stawki ekipy, koszty poboczne tygodniowe bez materiałów). Po rozwinięciu przetargu zobaczysz dopasowanie (Dobry profil / Do rozważenia), tabelę wymagań vs wasze dane, kryteria punktacji (waga ceny) i szacunek szans %."},
              {q:"Uczenie słów kluczowych", a:"Oznacz przetargi jako „Interesuje nas” — na dole panelu pojawią się propozycje słów. „Ucz system” dopisuje je do słownika w chmurze (kw-tenders-custom-keywords) i przelicza trafność. Pełna edycja słownika: panel „Słownik słów kluczowych” u góry listy."},
              {q:"Zarządzanie listą", a:"Eksport CSV (filtrowana lista), tryb „Zaznacz wiele” (masowy status lub usuwanie), przycisk „Usuń z listy” w szczegółach. Usunięte przetargi nie wracają przy sync BZP."},
              {q:"Super Admin — reset i skan", a:"Ustawienia ⚙: dni/strony skanu BZP, auto-sync (godziny), reset pipeline / słownika / profilu. Backup JSON z górnego paska obejmuje kw-tenders-*."},
              {q:"Lejek pipeline", a:"U góry listy widać statystyki: nowe → obejrzane → interesuje → oferta → złożone → wygrane/przegrane oraz wskaźnik skuteczności (% wygranych)."},
              {q:"Utwórz robotę z przetargu", a:"Status „Wygrany” (lub „Przygotowujemy ofertę” w widoku klasycznym) → „Utwórz robotę” / „Otwórz robotę”. W COMMAND CENTER AI: najlepsza okazja, briefing (wygrany bez roboty), alerty realizacji. SWZ/kosztorys trafia do plików roboty; w robocie link „Otwórz przetarg”."},
              {q:"Rozpocznij realizację kontraktu", a:"W robocie powiązanej z wygranym przetargiem (baner „Realizacja kontraktu”) — przycisk „Rozpocznij realizację”, gdy etap nie jest jeszcze „W realizacji”. Ustawia status W trakcie, etap WM W realizacji i wpis w historii roboty. Zapis trafia do chmury z resztą danych."},
              {q:"Planowa ekipa na kontrakcie", a:"W banerze BZP (Realizacja kontraktu): wybierz lidera i ekipę z kartoteki, potem „Zapisz ekipę”. To plan operacyjny kontraktu — KPI „Bez ekipy” i kolejka MID-B nadal patrzą na ten plan. Nie dodaje godzin ani nie zmienia listy płac."},
              {q:"Aktywni dziś na liście robót", a:"Badge „Aktywni dziś: N” na karcie = unikalni pracownicy z wpisem czasu na dzisiejszą datę (Roboty → Pracownicy na robocie). Widoczny tylko gdy N > 0. Osobno „X os. · Yh” to suma historyczna wszystkich wpisów na robocie."},
              {q:"Widget na Pulpicie", a:"Kafelek „Przetargi BZP” pokazuje liczbę do zgłoszenia, pilne terminy (≤7 dni) i skuteczność — klik przenosi do zakładki Przetargi."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"directory",
      icon:Users,
      title:"Pracownicy",
      subtitle:"Kartoteka — dane osobowe i stawki",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Kartoteka to główna baza pracowników. Dane wpisane tutaj będą dostępne w Liście Płac i Robotach — nie musisz wpisywać ich za każdym razem.</p>
          <div className="space-y-3">
            {[
              {q:"Jak dodać nowego pracownika?", a:'Kliknij "Nowy pracownik". Wpisz imię i nazwisko, telefon, stanowisko (np. Murarz, Elektryk, Kierowca) i domyślną stawkę godzinową. Data zatrudnienia jest opcjonalna.'},
              {q:"Telefon i kod pracownika", a:"Numer w kartotece (np. +48 501 234 567) — pracownik wpisuje 9 ostatnich cyfr przy logowaniu. Dodatkowo ustawia osobisty kod 4 cyfry (jak PIN do karty) przy pierwszym logowaniu — chroni wypłatę przed podglądem przez kolegów. Administrator może ustawić lub zresetować kod w edycji pracownika."},
              {q:"Reset kodu pracownika", a:"Pracownicy → edytuj → sekcja „Kod pracownika” → Resetuj kod. Pracownik ustawi nowy kod przy następnym logowaniu (telefon zostaje bez zmian)."},
              {q:"Konto testowe (np. do sprawdzania panelu pracownika)", a:"W edycji pracownika zaznacz „Konto testowe”. Takie konto może się logować jako pracownik (zdjęcia, raporty), ale nie pojawia się na liście płac, grafiku, pulpicie ani w wyborze pracownika na robocie. Auto-wykrywane dla imienia „test” i numeru +48 000 000 000."},
              {q:"Nieobecności (urlop, chorobowe, bezpłatny)", a:"Pracownicy → edytuj → sekcja „Nieobecności”. Wybierz typ i zakres tygodni Pn–So (jak na liście płac). W liście płac zamiast kwoty wypłaty pojawi się URLOP / CHOROBOWE / BEZPŁATNY — godziny w tygodniu zostają. Nie można dodać urlopu dla tygodni już zamkniętych w archiwum. Po „Zapisz tydzień” status urlopu jest zamrożony w archiwum."},
              {q:"Aplikacja na ekranie telefonu (PWA)", a:"Po wejściu jako pracownik pojawi się baner „Dodaj na ekran”. Na Androidzie — Zainstaluj. Na iPhone (Safari) — Udostępnij → Dodaj do ekranu początkowego. Działa szybciej i trzyma zdjęcia w kolejce offline gdy brak sieci."},
              {q:"Zdjęcia offline i znak wodny", a:"Bez internetu zdjęcia trafiają do kolejki i wysyłają się same po powrocie sieci. Każde zdjęcie ma znak wodny: adres, data i W&G DOM."},
              {q:"Notatka głosowa w raporcie", a:"Przy dodawaniu raportu (zakres prac, wiadomość dla admina) — ikona mikrofonu. Działa w Chrome/Edge na telefonie i komputerze."},
              {q:"Co to jest domyślna stawka?", a:"To stawka PLN za godzinę, którą ten pracownik zwykle zarabia. Będzie się automatycznie podpowiadać w Liście Płac i w Robotach. Możesz ją zmienić dla konkretnego tygodnia lub roboty — bez zmiany tej domyślnej."},
              {q:"Wiele robót dziennie — kiedy włączyć?", a:"Dla kierowcy, logistyki — kogoś kto jeździ po mieście i nie da się wpisać dokładnych godzin na każdej robocie (np. Jarosław). W kartotece zaznacz „Wiele robót dziennie” — wtedy nie pojawia się w alertach spójności na Pulpicie. Godziny liczysz tylko w liście płac."},
              {q:"Karta z archiwum pracownika", a:"Przy pracowniku kliknij ikonę wykresu (📊). Zobaczysz sumę godzin i wypłat w roku, wykres miesięczny oraz listę zapisanych tygodni z archiwum listy płac."},
              {q:"Jak oznaczyć pracownika jako nieaktywnego?", a:"Kliknij okrągły przycisk przy pracowniku (po prawej). Zmieni status na Nieaktywny — pracownik zniknie z list przy dodawaniu do tygodnia, ale jego historia zostanie. Żeby przywrócić — kliknij ponownie."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"archive",
      icon:Archive,
      title:"Archiwum",
      subtitle:"Historia tygodni i raport miesięczny",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Archiwum przechowuje wszystkie zamknięte tygodnie z historią wypłat. Możesz tu sprawdzić ile kto zarobił w dowolnym tygodniu i wygenerować raport miesięczny.</p>
          <div className="space-y-3">
            {[
              {q:"Jak przeglądać archiwum?", a:"U góry wybierz rok, potem miesiąc. Zobaczysz wszystkie tygodnie z tego okresu z podsumowaniem godzin i wypłat. Kliknij tydzień żeby rozwinąć szczegółową listę pracowników."},
              {q:"Jak wygenerować raport miesięczny?", a:'Wybierz miesiąc, potem kliknij czerwony przycisk "Raport miesięczny PDF". Dostaniesz dokument A4 poziomy z: podsumowaniem finansowym (wypłaty, koszty robót, materiały, faktury), tabelą wszystkich robót z tego miesiąca i szczegółowymi listami płac z każdego tygodnia.'},
              {q:"Jak usunąć zapisany tydzień?", a:"Przy każdym tygodniu jest ikona kosza. Kliknij ją → potwierdź. Uwaga: tej operacji nie można cofnąć."},
              {q:"Co jest w archiwum od wersji 1.9?", a:"Pełny tydzień: podsumowanie wypłat (z kolumną kosztów do zwrotu), szczegóły listy płac (dni, godziny, dodatkowe bloki, zaliczki) oraz zapisany grafik z adresami robót. W niedzielę (gdy wszyscy rozliczeni) aplikacja robi auto-zapis bieżącego tygodnia — w sobotę możesz spokojnie wypłacać."},
              {q:"Gdzie zobaczyć stary grafik?", a:"Archiwum → rozwiń tydzień → zakładka Grafik. Starsze wpisy (sprzed 1.9) mają tylko listę płac bez grafiku."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"worker",
      icon:HardHat,
      title:"Tryb pracownika",
      subtitle:"Zdjęcia, raporty z budowy i wymiary",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Na ekranie startowym wybierz <strong>Pracownik</strong> → znajdź się na liście → wpisz <strong>9 ostatnich cyfr telefonu</strong> (bez +48) oraz <strong>swój kod 4 cyfry</strong>. Przy pierwszym logowaniu ustawisz kod sam. Potem wybierz robotę — zdjęcia, raport lub sprawdź wypłatę.</p>
          <div className="space-y-3">
            {[
              {q:"Logowanie — telefon + kod", a:"Telefon potwierdza kim jesteś (9 cyfr z kartoteki). Kod 4 cyfry to Twój osobisty PIN — ustawiasz przy pierwszym logowaniu. Nie podawaj go kolegom. Zapomniałeś? Administrator resetuje kod w kartotece Pracownicy."},
              {q:"Zakładka Roboty", a:"Na górze „Twoje kontrakty” — roboty, do których admin przypisał Cię w planowej ekipie (lider lub lista wykonawców). Poniżej „Wszystkie roboty w toku”. Wybierz robotę → zdjęcia (przed / w trakcie / po), raport z wymiarami. Offline: kolejka zdjęć."},
              {q:"Twoje kontrakty — skąd lista?", a:"Administrator zapisuje plan ekipy w robocie (baner realizacji kontraktu). Nie dodaje to godzin ani nie zmienia wypłaty — tylko pokazuje Ci przypisane kontrakty na liście."},
              {q:"Status i termin na kontrakcie", a:"W sekcji „Twoje kontrakty” pod adresem widać status (np. W realizacji dla kontraktu z przetargu) oraz termin umowy z dat start/koniec roboty. Lista „Wszystkie roboty w toku” wygląda jak wcześniej."},
              {q:"Zakładka Wypłata u pracownika", a:"Kwota do wypłaty w najbliższy piątek, godziny bieżącego tygodnia, zaliczki i koszty do zwrotu (jeśli wpisane). Niżej — archiwum wypłat z zapisanych tygodni. Administrator musi najpierw dodać Cię do listy płac w danym tygodniu."},
              {q:"Ochrona danych wypłat", a:"Logowanie wymaga telefonu i osobistego kodu — kolega nie wejdzie na Twój profil samym numerem. Kwota ukrywa się też gdy przełączysz aplikację (Alt+Tab). Kopiowanie tekstu jest zablokowane."},
              {q:"Jak się zalogować?", a:"Administrator musi wpisać Twój numer w kartotece Pracownicy. Wybierz swoje imię z listy, wpisz telefon i kod. Nie wpisuj ręcznie cudzego imienia."},
              {q:"Jak dodać wiele zdjęć?", a:"W robocie użyj sekcji „Galeria — wiele zdjęć”: wybierz typ (przed/w trakcie/po), kliknij „Wybierz z galerii”, zaznacz wiele zdjęć, podejrzyj miniaturki i „Wyślij”."},
              {q:"Jak wysłać raport z budowy?", a:"Sekcja „Raport z budowy”: wpisz zakres w jednym polu (lista — kropki, numery, podpunkty), wymiary z opisem pomieszczenia lub foto rysunku, na dole „Wiadomość dla admina”. Po wysłaniu możesz edytować lub usunąć raport w „Twoje raporty”."},
              {q:"Opisy zdjęć?", a:"Przy galerii — opis pod każdym zdjęciem przed wysłaniem. Przy aparacie — pole „Opis do następnych zdjęć”. Po wgraniu — edytuj opis lub usuń zdjęcie w „Twoje wgrane zdjęcia”."},
              {q:"Gdzie admin widzi raport?", a:"Roboty → wybierz robotę → „Raporty — zakres i wymiary”. Rozwiń wpis — widać punkty z opisami, tabelę wymiarów, rysunek i wiadomość."},
              {q:"Nie widzę żadnej roboty", a:"Administrator musi dodać robotę ze statusem „w trakcie”. Lista ładuje się z chmury."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"inspector",
      icon:ClipboardCheck,
      title:"Panel Inspektora",
      subtitle:"Wrocławskie Mieszkania — podgląd robót bez stawek",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Na ekranie startowym wybierz <strong>Inspektor</strong> → użytkownik (np. Szymon Szóstak) → hasło. Inspektor widzi wszystkie roboty, ale <strong>bez stawek PLN/h</strong> pracowników. Widzi natomiast kto jest przypisany do roboty i numer telefonu z kartoteki.</p>
          <div className="space-y-3">
            {[
              {q:"Pulpit inspektora (nowy)", a:"KPI: aktywne kontrole, wymagające uwagi, zakończone, zdjęcia ekipy oczekujące na akceptację. Sekcja „Dzisiaj i wkrótce” — terminy odbioru. Centrum działań — maks. 3 najpilniejsze sprawy. Pasek postępu kontroli 0–100% na kartach."},
              {q:"Co widać na liście robót?", a:"Karta z adresem, postępem %, brakującymi elementami do odbioru i ostatnią aktywnością. Priorytety: 🔴 po terminie, 🟠 odbiór dziś, 🟢 kompletne. Badge 💰 — nierozliczone pozycje do odzyskania (najedź, aby zobaczyć kwotę PLN). Przycisk 📷 (FAB) — szybkie zdjęcie z aparatu do wybranej roboty."},
              {q:"Do rozliczenia na robocie (2.49.70)", a:"W sekcji WM (Odbiór) — karta 💰 Do rozliczenia: status, opis, kwoty (pierwotna, rozliczono, pozostało), KPI i pełna historia rozliczeń (kto, kiedy, na jakiej robocie). Tylko podgląd — bez dodawania i rozliczania. Kwoty odzyskania to nie stawki PLN/h z listy płac."},
              {q:"Zgłoś uwagę do pozycji (2.49.80)", a:"Przy pozycji Do rozliczenia kliknij Zgłoś uwagę — opis trafia do administratora przy tej pozycji (bez zmiany kwot). Odpowiedź admina widzisz w tym samym wątku. Notatki WM w panelu Odbioru są osobno."},
              {q:"Billing Evidence Pack — dowody (20.5A.5)", a:"Przy zgłaszaniu uwagi możesz dodać do 3 zdjęć i 1 PDF (max 8 MB każdy) — np. uszkodzenie, paragon, faktura. Pliki trafiają jako dowód w wątku pozycji. Administrator otwiera podgląd zdjęcia lub PDF bez pobierania. Tekst uwagi nadal jest wymagany."},
              {q:"Zgłoś nową pozycję Do rozliczenia (20.5A.6)", a:"Gdy na robocie nie ma jeszcze pozycji billing — kliknij Zgłoś pozycję w karcie Do rozliczenia. Wpisz opis, kwotę i opcjonalnie dowody (zdjęcia/PDF). Propozycja trafia do administratora; status widać w Twoje zgłoszenia. Po zatwierdzeniu powstaje pozycja w module Do rozliczenia — do tego czasu KPI robót się nie zmienia."},
              {q:"Zlecenie i kosztorys", a:"Przy robocie możesz zaznaczyć checkbox „mam zlecenie” / „mam kosztorys” oraz wrzucić plik (zlecenie: PDF; kosztorys: PDF, ATH, NOR, XML, DOC z programu NORMA). Przy .ath wybierz „Wszystkie pliki”, jeśli nie widać rozszerzenia. Status widać na liście — nie musisz pamiętać czy już wysłałeś email."},
              {q:"Dokumenty i zakresy", a:"Checklista dokumentów (zlecenie, zakres, kominiarz, pomiary…). Sekcja raportów pracowników: zakres prac, wymiary pomieszczeń, zdjęcia rysunków z opisami."},
              {q:"Galeria zdjęć", a:"Tylko zdjęcia zaakceptowane przez admina. Rozwiń robotę → „Pobierz galerię ZIP” (foldery: przed / w trakcie / po) lub „ZIP kategorii”. Nazwy plików: ulica, data, kategoria."},
              {q:"Kto zarządza kontem inspektora?", a:"Super Administrator (Dawid) w panelu ⚙ — zmiana hasła, dodawanie kolejnych inspektorów. Hasła sync w chmurze jak u adminów."},
              {q:"Gdzie admin widzi zmiany inspektora?", a:"Pulpit → „Uwaga dziś” (nowe zmiany) oraz zakładka Inspektor — feed aktywności + statystyki logowań. Klik „Otwórz w Robotach” na wpisie otwiera właściwą sekcję roboty (Dokumenty, Pliki, Zdjęcia, Przegląd/billing). Inspektor = monitoring; Roboty = działania."},
              {q:"Inspektor (admin) vs Roboty — podział ról", a:"Zakładka Inspektor w panelu administratora służy wyłącznie do monitorowania aktywności inspektora terenowego (feed, nieprzeczytane, KPI). Upload plików, checklista dokumentów, odpowiedź WM, zatwierdzanie propozycji billing i wysyłka plików emailem — w zakładce Roboty. Portfolio WM jest na Pulpicie."},
              {q:"Instrukcja dla inspektora", a:"W panelu inspektora: przycisk Pomoc / baner przy pierwszym wejściu. Dymki ? przy sekcjach wyjaśniają co kliknąć. Instrukcja opisuje zlecenia, kosztorysy NORMA, dokumenty, zdjęcia i raporty."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"recoverable-charges",
      icon:Wallet,
      title:"Do rozliczenia",
      subtitle:"Rejestr pozycji do odzyskania od klientów",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Menu <strong>Do rozliczenia</strong> (💰) służy do zapisywania kwot do odzyskania i <strong>rozliczania</strong> ich częściowo lub w całości — np. doliczenie kosztu do kolejnej roboty. To rejestr odzysku, nie faktura i nie lista płac.</p>
          <div className="space-y-3">
            {[
              {q:"Jak dodać pozycję?", a:"Kliknij „Dodaj pozycję”. Wybierz źródło: z roboty (lista adresów) albo poza systemem (wpisz klienta ręcznie). Uzupełnij opis, kwotę pierwotną, opcjonalnie inspektora i tagi."},
              {q:"Statusy 🔴🟡🟢", a:"Status jest wyliczany automatycznie z rozliczeń. 🔴 Do rozliczenia — nic nie rozliczono. 🟡 Rozliczone częściowo — część kwoty odzyskana, widać ile pozostało. 🟢 Rozliczone — cała kwota rozliczona."},
              {q:"Jak rozliczyć kwotę?", a:"Otwórz szczegóły pozycji i kliknij „Rozlicz”. Podaj kwotę (nie większą niż pozostało), opcjonalnie robotę docelową, typ rozliczenia i notatkę. Możesz zaznaczyć „Na podstawie informacji od inspektora”."},
              {q:"Panel szczegółów", a:"Kwota pierwotna, rozliczono i pozostało — bez zgadywania. Sekcja „Historia rozliczeń” pokazuje kto, kiedy, na jakiej robocie i ile rozliczył."},
              {q:"KPI u góry", a:"Do rozliczenia — suma pozostałych kwot pozycji otwartych. Rozliczone częściowo — suma pozostałych kwot pozycji częściowych. Odzyskano — łączna suma wszystkich rozliczeń."},
              {q:"Pulpit — karta Do odzyskania", a:"Na Pulpicie (pod skrótami liczbowymi) karta z 4 KPI: łączna kwota do odzyskania, liczba pozycji, ile częściowo rozliczonych, suma odzyskana. Pod spodem skrót aging (0–30 / 31–60 / 61–90 / 90+ dni) oraz do 3 pozycji „Wymaga uwagi” (tytuł, kwota, powód). Widać wiek najstarszej pozycji. Klik → moduł. Obramowanie ostrzegawcze gdy którykolwiek alert billing jest aktywny."},
              {q:"Wymaga uwagi (alerty)", a:"System wykrywa pozycje wymagające działania: kwota pozostała ≥ 2 000 PLN, wiek > 90 dni, częściowe rozliczenie bez postępu > 60 dni, brak aktywności (edycja lub rozliczenie) > 60 dni. W module pełna lista z filtrami; na Pulpicie max 3 pozycje. Licznik Uwaga dziś na Pulpicie rośnie o +1 (nie o każdą pozycję)."},
              {q:"Analiza odzyskiwania (aging)", a:"W module, pod KPI, sekcja pokazuje pełny aging: ile pozycji i jaka suma PLN czeka w każdym przedziale wieku od utworzenia pozycji. Liczone są tylko pozycje otwarte i częściowo rozliczone — rozliczone w całości nie wchodzą do kubełków. Suma kubełków = kwota Do odzyskania na Pulpicie."},
              {q:"Statystyki odzyskiwania", a:"Pod agingiem: KPI odzyskane w bieżącym miesiącu i roku, średni czas pełnego zamknięcia pozycji (tylko rozliczone w całości) oraz liczba zamkniętych pozycji. Trzy rankingi TOP 5: największe do odzyskania, najstarsze nierozliczone, największe odzyskane. Klik w pozycję z listy otwiera szczegóły. Na Pulpicie link „Zobacz analizę odzyskiwania” prowadzi do modułu."},
              {q:"Zdjęcia i pliki", a:"W menu „Zdjęcia i pliki” są dwie zakładki: Zdjęcia (galeria zaakceptowanych) i Pliki (zlecenia, kosztorysy, ZIP). Wcześniej były to osobne pozycje menu."},
              {q:"Czy to zmienia robotę lub listę płac?", a:"Nie. Pozycje są w osobnym zapisie chmurowym (kw-recoverable-charges). Roboty i payroll działają jak dotychczas."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"changelog",
      icon:ScrollText,
      title:"Historia zmian",
      subtitle:"Co nowego w aplikacji",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">W menu jest zakładka <strong>Zmiany/Instrukcja</strong>. W niej wybierz podzakładkę <strong>Zmiany</strong> — chronologiczna lista aktualizacji od najnowszej wersji w dół. Domyślnie widać 10 wpisów; na dole możesz przełączać strony albo ustawić 20 lub 50 wpisów na stronie.</p>
          <div className="space-y-3">
            {[
              {q:"Po co jest ta zakładka?", a:"Żebyś wiedział co się zmieniło po aktualizacji — nowe funkcje, poprawki i ulepszenia. Najnowsza wersja jest na górze z zieloną etykietą „Najnowsza”."},
              {q:"Skąd wiem jaka jest moja wersja?", a:"W prawym górnym rogu strony Zmiany widać numer wersji (np. v1.6). Ten sam numer pojawia się przy każdym wpisie w historii."},
              {q:"Czy muszę coś robić po aktualizacji?", a:"Nie — wystarczy odświeżyć stronę. Dane wczytają się z chmury automatycznie. Przeczytaj tylko wpisy „Nowość”, jeśli chcesz skorzystać z nowych przycisków."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"cloud-data",
      icon:Cloud,
      title:"Co zapisuje się w chmurze?",
      subtitle:"Które dane są wspólne na wszystkich urządzeniach",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Wszystko co dodajesz w aplikacji jako dane firmy zapisuje się <strong>lokalnie i w chmurze</strong>. Nie musisz klikać „Zapisz do chmury” — dzieje się to samo po każdej zmianie (ikona chmurki u góry).</p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5 leading-relaxed">
            <li><strong>Pracownicy</strong> — kartoteka, stawki, telefony, hash kodu pracownika (nie widać kodu — tylko zapisany)</li>
            <li><strong>Kontakty</strong> — odbiorcy email z uprawnieniami: Roboty (materiały z budowy) lub Lista płac</li>
            <li><strong>Lista płac</strong> — godziny (w tym dodatkowe), zaliczki, koszty do zwrotu, rozliczenia; eksport PDF/Word i wysyłka emailem</li>
            <li><strong>Archiwum</strong> — zapisane tygodnie</li>
            <li><strong>Roboty</strong> — adresy, dokumenty, materiały, raporty, wpisy czasu pracy</li>
            <li><strong>Zdjęcia i pliki</strong> — zdjęcia (Storage + metadane w robocie) i pliki robot (jobFiles)</li>
            <li><strong>Do rozliczenia</strong> — rejestr pozycji do odzyskania (<code>kw-recoverable-charges</code>)</li>
            <li><strong>Logowanie admina / inspektora</strong> — konta z hasłami jako hash SHA-256, sync w chmurze (<code>kw-admin-passwords</code>). Super Admin zmienia hasła w panelu ⚙. Pliki zlecenia/kosztorysu inspektora zapisują się przy robocie (<code>jobFiles</code>)</li>
          </ul>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-medium text-amber-400 mb-1">Bez internetu</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Możesz pracować dalej — dane zostaną w przeglądarce. Gdy wróci sieć, aplikacja ponowi zapis (czerwona chmurka = sprawdź połączenie i poczekaj chwilę).</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id:"backup",
      icon:Download,
      title:"Kopie zapasowe i synchronizacja",
      subtitle:"Jak nie stracić danych",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Dane zapisują się automatycznie w chmurze — nie musisz nic robić. Ale warto wiedzieć jak działa system bezpieczeństwa.</p>
          <div className="space-y-3">
            {[
              {q:"Logowanie administratora — konta i role", a:"Panel administracyjny → wybierz użytkownika z listy → wpisz hasło. Super Administrator (Dawid) w ikonie ⚙ może: zmieniać hasła, przełączać rolę Administrator ↔ Moderator oraz dodawać nowych użytkowników (login + hasło + poziom: Admin, Moderator lub Inspektor). Moderator nie widzi stawek PLN/h. Inspektor loguje się osobnym przyciskiem na ekranie startowym."},
              {q:"Logowanie administratora — zapamiętaj hasło", a:"Przy logowaniu możesz zaznaczyć „Zapamiętaj hasło na tym urządzeniu”. Hasło jest szyfrowane lokalnie w przeglądarce — nie wysyła się do chmury. Przy następnym wejściu na tym samym telefonie/komputerze pole hasła wypełni się samo (dla wybranego użytkownika). Wyloguj się ręcznie jeśli korzystasz ze wspólnego urządzenia."},
              {q:"Czy dane mogą zniknąć?", a:"Dane są w przeglądarce i w chmurze Supabase. Każdy zapis scala lokalne z chmurowymi — pustsza wersja nie nadpisze bogatszej. Chmura trzyma kopie prev/prev2 i dzienny pełny backup wszystkich kluczy. Przed sync tworzona jest też lokalna kopia na urządzeniu."},
              {q:"Co oznaczają ikonki chmurki w prawym górnym rogu?", a:"Szara chmurka = wszystko zsynchronizowane. Animowana chmurka ze strzałką = trwa zapis. Zielona chmurka = właśnie zapisano. Czerwona chmurka z X = błąd połączenia (sprawdź internet)."},
              {q:"Co to jest backup i jak go zrobić?", a:'W górnym pasku (ikona pobierania) kliknij „Eksportuj backup” — pobierze się plik .json. Super Admin: pełne przywracanie w ⚙ Ustawienia → Kopie zapasowe. Import scala z obecnymi danymi i zapisuje do chmury.'},
              {q:"Automatyczny backup emailem", a:"Raz w tygodniu — w niedzielę, po zapisaniu tygodnia do archiwum (przycisk „Zapisz tydzień” lub automatyczny zapis w niedzielę, gdy wszyscy rozliczeni). Wysyłana jest jedna kopia JSON na adres z ustawień. Nie ma codziennych maili przy każdym wejściu w aplikację."},
              {q:"Utrata danych — co robić?", a:"⚙ Ustawienia (Super Admin) → Kopie zapasowe: przywróć wszystko z chmury lub lokalnie. Dla pojedynczych typów: lista płac lub roboty osobno. W Liście płac: „Przywróć z archiwum” dla bieżącego tygodnia. Regularnie rób eksport backup z górnego paska."},
              {q:"Używam dwóch urządzeń — które dane są właściwe?", a:"Przy każdym zapisie aplikacja scala dane z obu źródeł — bogatsze wpisy wygrywają. Stara karta z pustą listą nie nadpisze chmury. Przy pierwszym wejściu na nowym urządzeniu dane pobierają się z chmury i łączą z lokalnymi."},
            ].map((item,i)=>(
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-sm font-medium flex items-center gap-2"><HelpCircle size={13} className="text-primary shrink-0"/>{item.q}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"tips",
      icon:Sparkles,
      title:"Przydatne sztuczki",
      subtitle:"Funkcje które ułatwiają pracę",
      content:(
        <div className="space-y-3">
          {[
            {icon:Copy, title:"Kopiuj pracowników z zeszłego tygodnia", desc:"W Liście Płac, gdy tydzień jest pusty, pojawia się przycisk \"Kopiuj z poprzedniego tygodnia\". Kliknij — od razu doda tych samych pracowników co w poprzednim tygodniu. Oszczędzasz czas."},
            {icon:Mic, title:"Dyktowanie notatek głosem", desc:"Przy polu Notatki w robotach jest ikona mikrofonu. Kliknij, powiedz co chcesz wpisać — aplikacja zamieni mowę na tekst. Działa w przeglądarce Chrome na telefonie i komputerze."},
            {icon:Bell, title:"Reminder w sobotę", desc:"W sobotę na Pulpicie pojawia się niebieski baner: zapisz tydzień i rozlicz pracowników. W Liście Płac też jest żółty baner. Po „Zapisz tydzień” wysyłany jest backup emailem (raz na tydzień)."},
            {icon:Scale, title:"Spójność listy płac ↔ roboty", desc:"Porównywana jest podstawowa zmiana z listy płac (Pn–So) z wpisami na robotach — dodatkowe godziny z opisem nie wchodzą do tego porównania. Pracownik z „Wiele robót dziennie” w kartotece jest pomijany (logistyka, kierowca)."},
            {icon:BarChart3, title:"Karta pracownika z archiwum", desc:"Pracownicy → ikona wykresu przy osobie: roczne godziny, wypłaty, słupki miesięczne i lista tygodni z archiwum."},
            {icon:FileDown, title:"Raport roczny PDF", desc:"Archiwum → wybierz rok → „Raport roczny PDF”: wypłaty × 12 miesięcy, roboty zdane, średni koszt roboczogodziny."},
            {icon:LayoutDashboard, title:"Pulpit — centrum dowodzenia", desc:"Sekcja „Uwaga dziś”: zdjęcia, raporty, paragony, inspektor (nowe zmiany), spójność godzin, dokumenty. Klik w wiersz → otwiera robotę, listę płac lub Inspektora."},
            {icon:CalendarDays, title:"Grafik tygodniowy", desc:"Menu Grafik — cały tydzień na jednym ekranie. Godziny z listy płac (łącznie z dodatkowymi blokami), adres z wpisu na robocie."},
            {icon:Wallet, title:"Koszty do zwrotu vs zaliczka", desc:"Zaliczka = pieniądze wzięte z góry (odejmowane). Koszty do zwrotu = pracownik zapłacił z własnej kieszeni (doliczane). Oba wpisujesz w panelu pracownika w Liście Płac."},
            {icon:Clock, title:"Dodatkowe godziny w dniu", desc:"Pod każdym dniem w panelu pracownika: „Dodatkowe godziny w …” → opis + od–do. Wliczają się do wypłaty, grafiku i PDF."},
            {icon:Search, title:"Globalne wyszukiwanie", desc:"Ikona lupy w prawym górnym rogu. Wpisz imię pracownika lub adres roboty — aplikacja znajdzie to w całej bazie danych."},
            {icon:Users, title:"Filtrowanie robót po pracowniku", desc:"W zakładce Roboty jest rozwijana lista pracowników. Wybierz kogoś — zobaczysz tylko roboty na których ten pracownik miał wpisy czasu pracy."},
            {icon:KeyRound, title:"Zapamiętaj hasło admina", desc:"Przy logowaniu administratora zaznacz „Zapamiętaj hasło na tym urządzeniu” — hasło zostaje zaszyfrowane lokalnie (nie w chmurze). Nie używaj na wspólnym komputerze."},
            {icon:FileDown, title:"PDF z roboty do wysłania klientowi", desc:"Każda robota ma przycisk PDF w nagłówku. Generuje profesjonalny dokument z listą dokumentów, czasem pracy i kosztami — można go od razu wysłać mailowo."},
            {icon:Mail, title:"Email z roboty — zdjęcia i raporty", desc:"Maile z biuro@wgdom.fun. W Kontaktach włącz uprawnienie „Roboty” — tylko te adresy pojawią się przy wysyłce z karty roboty. Wybierz treść (zdjęcia, raport) i wyślij."},
            {icon:Wallet, title:"Email listy płac — PDF i Word", desc:"W Liście płac: Email → wybierz odbiorcę z uprawnieniem „Lista płac” (ustawiasz w Kontaktach). Dołącz PDF i/lub Word; w treści maila tabela jak w PDF."},
          ].map((tip,i)=>(
            <div key={i} className="flex gap-4 bg-secondary/40 rounded-xl p-4 border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <tip.icon size={15} className="text-primary"/>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">{tip.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-3">

        {/* Header */}
        {!embedded && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <BookOpen size={18} className="text-primary"/>
          </div>
          <div>
            <h1 className="text-lg font-bold">Instrukcja obsługi</h1>
            <p className="text-xs text-muted-foreground">Wszystko co musisz wiedzieć żeby sprawnie korzystać z aplikacji</p>
          </div>
        </div>
        )}

        {/* Sections */}
        {sections.map(sec=>(
          <div key={sec.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={()=>setOpen(open===sec.id?null:sec.id)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${open===sec.id?"bg-primary/15":"bg-secondary"}`}>
                <sec.icon size={18} className={open===sec.id?"text-primary":"text-muted-foreground"}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{sec.title}</p>
                <p className="text-xs text-muted-foreground">{sec.subtitle}</p>
              </div>
              <ChevDown size={16} className={`text-muted-foreground transition-transform shrink-0 ${open===sec.id?"rotate-180":""}`}/>
            </button>
            {open===sec.id&&(
              <div className="px-5 pb-5 border-t border-border pt-4">
                {sec.content}
              </div>
            )}
          </div>
        ))}

        <p className="text-xs text-muted-foreground text-center pt-2 pb-4">Masz pytanie? Napisz lub zadzwoń do osoby która skonfigurowała aplikację.</p>
      </div>
    </div>
  );
}


const CHANGELOG_PAGE_SIZES = [10, 20, 50] as const;
type ChangelogPageSize = (typeof CHANGELOG_PAGE_SIZES)[number];

export function GuideView() {
  const [tab, setTab] = useState<"help" | "changelog">("help");
  const guideHeaderRef = useRef<HTMLDivElement>(null);
  useWheelScrollForward(guideHeaderRef);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div ref={guideHeaderRef} className="shrink-0 px-4 sm:px-8 pt-6 pb-3 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <BookOpen size={18} className="text-primary"/>
          </div>
          <div>
            <h1 className="text-lg font-bold">Zmiany / Instrukcja</h1>
            <p className="text-xs text-muted-foreground">Pomoc krok po kroku i historia wersji aplikacji</p>
          </div>
        </div>
        <div className="flex gap-1 p-1 bg-secondary rounded-xl">
          <button
            type="button"
            onClick={() => setTab("help")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === "help" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Instrukcja
          </button>
          <button
            type="button"
            onClick={() => setTab("changelog")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${tab === "changelog" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ScrollText size={14}/>
            Zmiany
            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">v{CHANGELOG[0].version}</span>
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {tab === "help" ? <HelpView embedded /> : <ChangelogView embedded />}
      </div>
    </div>
  );
}

function ChangelogView({ embedded = false }: { embedded?: boolean }) {
  const TYPE_STYLE = {
    new:     {bg:"bg-primary/15",    text:"text-primary",       dot:"bg-primary",     label:"Nowość"},
    fix:     {bg:"bg-green-500/15",  text:"text-green-400",     dot:"bg-green-400",   label:"Poprawka"},
    improve: {bg:"bg-blue-500/15",   text:"text-blue-400",      dot:"bg-blue-400",    label:"Ulepszenie"},
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<ChangelogPageSize>(10);

  const total = CHANGELOG.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const rangeFrom = safePage * pageSize + 1;
  const rangeTo = Math.min((safePage + 1) * pageSize, total);

  const visibleReleases = useMemo(
    () => CHANGELOG.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [safePage, pageSize],
  );

  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [safePage, pageSize]);

  const goToPage = (next: number) => setPage(Math.max(0, Math.min(totalPages - 1, next)));

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-2">

        {/* Header */}
        {!embedded ? (
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <ScrollText size={18} className="text-primary"/>
          </div>
          <div>
            <h1 className="text-lg font-bold">Historia zmian</h1>
            <p className="text-xs text-muted-foreground">
              {total} wersji · wyświetlane {rangeFrom}–{rangeTo}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5">
            <Sparkles size={12} className="text-primary"/>
            <span className="text-xs font-semibold text-primary">v{CHANGELOG[0].version}</span>
          </div>
        </div>
        ) : (
        <div className="flex items-center justify-between gap-3 mb-6">
          <p className="text-xs text-muted-foreground">
            {total} wersji · wyświetlane {rangeFrom}–{rangeTo}
          </p>
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 shrink-0">
            <Sparkles size={12} className="text-primary"/>
            <span className="text-xs font-semibold text-primary">v{CHANGELOG[0].version}</span>
          </div>
        </div>
        )}

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border hidden sm:block"/>

          <div className="space-y-8">
            {visibleReleases.map((release, ri)=>{
              const globalIndex = safePage * pageSize + ri;
              const isLatest = globalIndex === 0;
              return (
              <div key={`${release.version}-${release.date}`} className="relative sm:pl-12">
                {/* Circle on timeline */}
                <div className={`hidden sm:flex absolute left-0 top-3 w-10 h-10 rounded-full items-center justify-center border-2 z-10 shrink-0 ${isLatest?"border-primary bg-primary/15":"border-border bg-card"}`}>
                  <span className="text-[10px] font-bold" style={{color: isLatest?"var(--primary)":"var(--muted-foreground)"}}>{release.version}</span>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  {/* Release header */}
                  <div className={`px-5 py-4 flex items-center justify-between gap-3 ${isLatest?"bg-primary/5 border-b border-primary/20":"border-b border-border"}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full bg-secondary shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground">{release.version}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isLatest?"text-primary":"text-foreground"}`}>{release.label}</span>
                          {isLatest&&<span className="text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Najnowsza</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{fmtDate(release.date)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 font-mono">v{release.version}</span>
                  </div>

                  {/* Items */}
                  <div className="px-5 py-4 space-y-2.5">
                    {release.items.map((item, ii)=>{
                      const s = TYPE_STYLE[item.type];
                      return (
                        <div key={ii} className="flex items-start gap-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${s.bg} ${s.text}`}>{s.label}</span>
                          <p className="text-sm text-foreground/90 leading-relaxed">{item.text}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stats footer */}
                  <div className="px-5 py-2.5 bg-secondary/30 border-t border-border flex items-center gap-4">
                    {(["new","improve","fix"] as const).map(t=>{
                      const count = release.items.filter(i=>i.type===t).length;
                      if(!count) return null;
                      const s = TYPE_STYLE[t];
                      return <span key={t} className={`text-xs ${s.text}`}>{count}× {s.label.toLowerCase()}</span>;
                    })}
                  </div>
                </div>
              </div>
            );})}
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-8 pt-6 border-t border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {totalPages > 1 ? (
              <p className="text-xs text-muted-foreground">
                Strona <span className="font-semibold text-foreground">{safePage + 1}</span> z {totalPages}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Wszystkie wpisy na jednej stronie</p>
            )}
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="shrink-0">Wpisy na stronie</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value) as ChangelogPageSize); setPage(0); }}
                className="bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {CHANGELOG_PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={14}/>
                Poprzednia
              </button>
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToPage(i)}
                    className={`min-w-[2rem] h-8 rounded-lg text-xs font-medium transition-colors ${i === safePage ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages - 1}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Następna
                <ChevronRight size={14}/>
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4 pb-2">W&amp;G DOM — zarządzanie pracą na budowie · Zbudowane przez Dawid T.T. 😊</p>
      </div>
    </div>
  );
}

