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
  Shield,
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
  Library,
  Wallet,
  Printer,
  Clock,
  Search,
  KeyRound,
  Mail,
  Send,
} from "lucide-react";
import { useWheelScrollForward } from "@/lib/wheel-scroll-forward";
import { CHANGELOG } from "@/app/changelog-data";
import {
  CATALOG_UX_PRICING_SETTINGS_TAB_LABEL,
  CATALOG_UX_SOURCE_LABEL,
  CATALOG_UX_WORK_CATALOG_TAB_LABEL,
} from "@/lib/tender-catalog-ux-labels";

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
              {q:"Jak przypisać pracownika do robót z listy płac?", a:"Przełącznik „Przydziały robót” (obok Sumy / Szczegóły dni) → kliknij pracownika. Dla każdego dnia wybierz robotę i godziny — suma musi zgadzać się z godzinami z listy płac (widać ✅ Spójne lub ❌ brak/nadmiar). To ten sam zapis co Roboty → Pracownicy — zmiany są widoczne w obu miejscach. Badge 🟢🟡🔴 na liście pokazuje spójność tygodnia."},
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
              {q:"Jak założyć nową robotę?", a:'Kliknij "Nowa robota" w lewym górnym rogu. Wpisz adres, numer mieszkania i klienta. **Wybierz Inspektora WM** (pole obowiązkowe) — decyduje, kto widzi robotę w Panelu inspektora. Pod polami dat wybierz typ lokalu (Zamienny / Socjalny / Repatrianci — obowiązkowe), kuchenkę (gaz / elektr. / 2 paln.) oraz opcjonalnie piec gazowy (Zostaje / Wymiana / Brak).'},
              {q:"Inspektor WM — przypisanie roboty", a:"W Przeglądzie roboty pole Inspektor WM jest obowiązkowe. Inspektor logujący się na swoje konto widzi wyłącznie roboty z jego przypisaniem. Admin widzi wszystkie roboty i może zmienić inspektora. Zmiana synchronizuje się przez chmurę (kw-jobs)."},
              {q:"Dokumenty do odbioru — co to jest?", a:"To lista dokumentów które trzeba zebrać żeby zdać robotę. Zaznaczaj je gdy je masz: Zlecenie, Zakres robót, Kosztorys, Kominiarz, Pomiary, Oświadczenia, Gwarancje, Rysunek/Plan. Zdjęcia są opcjonalne. Pozycja „Rysunek/Plan” może zostać zaliczona przez wymiary pomieszczeń, obrys lokalu (dokumentacja ekipy) albo plan techniczny PDF (admin, Pliki roboty). Pasek postępu na liście robót pokazuje ile dokumentów masz już skompletowanych."},
              {q:"Dokumentacja robót a plan techniczny", a:"Dokumentacja robót zawiera zdjęcia, zakres prac, wymiary oraz obrys lokalu — materiał źródłowy z budowy. Plan techniczny PDF jest oddzielnym dokumentem przygotowywanym na podstawie tych materiałów (Roboty → Pliki → plan techniczny). Obie ścieżki mogą zaliczyć pozycję checklisty „Rysunek/Plan”, ale to różne artefakty."},
              {q:"Pomiary Elektryczne (WM Druk)", a:"WM Druk → „Pomiary”: „Nowy pomiar” — raport powiązany z Robotą, samodzielny (detached) lub TEST-RAP. „Katalog Pomiarów” — lista, filtry, edycja, usuwanie (pojedyncze i zbiorcze), eksport DOCX/ZIP. Ustawienia domyślne w WM Druk → Ustawienia. Sync: kw-electrical-measurements + kw-electrical-measurement-registry + kw-electrical-measurements-deleted-ids (tombstone usuniętych)."},
              {q:"Schematy jednokreskowe (WM Druk)", a:"WM Druk → „Schematy” (między Pomiary a Katalogiem): lista z wyszukiwaniem i filtrem roboczy/finalny. Utwórz z szablonu mieszkania 1F/3F lub zaimportuj z raportu RAP. Edytor: dane główne, obwody, presety, notatki. Podgląd SVG na żywo. Eksport PDF A4 (roboczy = znak wodny WERSJA ROBOCZA). Sync: kw-electrical-schematics."},
              {q:"Generic File Attachments (20.5A.10)", a:"Roboty → Pliki — pod dokumentami kontraktowymi (zlecenie, kosztorys, plan) jest sekcja Załączniki ogólne. Tylko administrator wgrywa i usuwa: PDF, DOC/DOCX, XLS/XLSX, ZIP, RAR, DWG, TXT do 25 MB. Zdjęcia (JPG/PNG) wrzucaj w zakładkę Zdjęcia. Podgląd: PDF, DOCX, XLSX; reszta — pobierz. Osobny przycisk Załączniki ZIP (folder zalaczniki/). Email plików: domyślnie tylko dokumenty kontraktowe; opcjonalnie dołącz załączniki ogólne."},
              {q:"Szkic terenowy vs plan techniczny PDF (20.5A.9)", a:"To dwa różne artefakty. Obrys lokalu / wymiarówka — zdjęcie lub odręczny rzut z budowy — wrzuca ekipa w zakładce Dokumentacja robót; trafia też do Zdjęć. Plan techniczny — gotowy PDF z biura — wgrywa administrator w Robotach → Pliki roboty → „Dodaj plan techniczny”. Upload planu PDF automatycznie zaznacza wymagany dokument odbiorowy „Rysunek/Plan” (ta sama pozycja checklisty co obrys/wymiary). Nie wrzucaj planu PDF jako Zlecenie."},
              {q:"Kiedy robota zmienia status na Zdana?", a:"Gdy zaznaczysz wszystkie wymagane dokumenty (bez zdjęć) i wybierzesz typ lokalu. Przycisk „Zdane” ostrzeje, jeśli brakuje dokumentów albo typu lokalu."},
              {q:"Jak dodać czas pracy na robocie?", a:'Roboty → wybierz robotę → „Pracownicy na robocie”. Najszybciej: „Wczoraj → dziś” (ta sama ekipa co wczoraj) lub „Z listy płac” (osoby zaznaczone dziś w liście płac). Ręcznie: „Dodaj wpis” — pracownik, data (domyślnie dziś), 9 h, stawka. Wpis pokazuje adres na Pulpicie i w Grafiku.'},
              {q:"Jak dodać koszty materiałów?", a:'Przewiń do sekcji "Materiały" → kliknij "Dodaj". Wpisz opis i koszt. Materiały sumują się z kosztem pracy i tworzą łączny koszt remontu.'},
              {q:"Jak dodać dokumentację robót (zakres + wymiary)?", a:'Zakładka „Dokumentacja” na karcie roboty: u góry formularz (taki sam jak u pracownika), na dole lista wysłanych wpisów. Możesz też poprosić pracownika o wysłanie z telefonu.'},
              {q:"Jak wyeksportować kartę roboty do PDF?", a:'Kliknij czerwony przycisk "PDF" w nagłówku roboty. Wygeneruje się dokument z dokumentami, pracownikami, materiałami i podsumowaniem kosztów.'},
              {q:"Dokumentacja ekipy — gdzie?", a:"Roboty → wybierz robotę → zakładka „Dokumentacja”. Rozwiń wpis — widać zakres prac, tabelę pomieszczeń i obrys lokalu."},
              {q:"Link podglądu dla klienta", a:"W karcie roboty: sekcja „Podgląd dla klienta” → Utwórz link → Kopiuj. Klient otwiera link bez logowania — widzi tylko zaakceptowane zdjęcia i dokumentację ekipy (bez kosztów). Wyłącz link gdy nie jest już potrzebny."},
              {q:"Historia roboty", a:"Przycisk „Historia” na karcie roboty — log zdarzeń: zdjęcia, dokumenty, emaile, link klienta, zmiany statusu."},
              {q:"Pulpit — Braki dokumentów (V3)", a:"Pod KPI sekcja „Roboty → Braki dokumentów”: lista robót w toku bez kompletu wymaganych dokumentów. Licznik KPI i badge sekcji = liczba robót na liście. Klik w adres → karta roboty; klik w dokument → oznacz odebrany. Pełna lista bez ukrytych pozycji."},
              {q:"Pulpit — Pilne uwagi na dziś (V3)", a:"Sekcja z kategoriami: Płace, Dokumentacja ekipy, Zdjęcia, Inspektor, WM, Odbiory, Do odzyskania. KPI „Pilne uwagi” = suma liczników kategorii (możesz policzyć ręcznie). Każda kategoria pokazuje pełną listę pozycji po rozwinięciu."},
              {q:"Pulpit — szybki dostęp do roboty", a:"W sekcjach „Braki dokumentów” i „Pilne uwagi” oraz „Roboty w trakcie” kliknij wiersz — aplikacja otworzy od razu tę robotę w zakładce Roboty."},
              {q:"Pulpit — Odbiory (20.5Z.5B)", a:"W „Pilne uwagi na dziś” kategoria „Odbiory” pokazuje roboty w fazie Do odbioru (ta sama logika co KPI w module Roboty). Widać adres, klienta i status. Klik w wiersz otwiera kartę roboty. Osobna kategoria — nie miesza się z „Braki dokumentów”."},
              {q:"Badge menu Roboty (20.5Z.5A)", a:"Liczba przy pozycji Roboty w menu bocznym i na dolnym pasku mobile = suma robót w fazie W toku + Do odbioru (ta sama logika co KPI po wejściu w moduł). Zdjęcia oczekujące na akceptację są na Pulpicie w „Pilne uwagi → Zdjęcia”."},
              {q:"Lista robót — układ i KPI (2.1A)", a:"Po wejściu w Roboty domyślnie widać fazę „W trakcie” (kolejność tabów: W trakcie → Do odbioru → Zdane → Wszystkie). Układ: przyciski Nowa robota / Pliki → KPI (W toku, Do odbioru, BZP — trzy kafelki) → przełącznik Lista / Kolejki → szukaj → fazy → lista lub kolejki. Klik w kafelek KPI włącza filtr (drugi klik wyłącza). Filtry ▼: lider realizacji, pracownik (godziny), zaznacz wiele do usunięcia. Karta: adres i status, klient • termin • lider, badge Aktywni dziś (wpisy na dziś), BZP, WM. Sygnały „bez planowej ekipy” i „WM po terminie” na liście Roboty są ukryte w UI (decyzja 20.5Z.4A) — WM po terminie widać na Pulpicie."},
              {q:"Mobile — otwarcie roboty (2.62.79)", a:"Na telefonie kliknięcie roboty przełącza na pełnoekranową kartę szczegółów — lista i pasek KPI znikają. Wróć przyciskiem „Lista” u góry lub gestem Wstecz w przeglądarce. Na tablecie i komputerze nadal widać listę obok szczegółów."},
              {q:"Roboty — widok Kolejki (2.50)", a:"Przełącznik Kolejki zbiera pilne roboty w sekcjach zamiast chronologii miesięcy. Widoczne sekcje: BZP wymaga startu (kontrakt czeka na „Rozpocznij realizację”), Do odbioru — braki (faza odbioru, brakuje dokumentów), Gotowe do zdania (komplet docs — można oznaczyć Zdane), Dokumenty >7 dni (w toku dłużej niż tydzień bez kompletu). Sekcje „WM po terminie” i „Bez ekipy” są ukryte w UI (20.5Z.4A); WM po terminie — Pulpet. Jedna robota trafia tylko do jednej sekcji. Szukajka i KPI działają tak samo jak w Liście."},
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
      id:"wmprint",
      icon:Printer,
      title:"Odbiory WM Druk",
      subtitle:"Szablony dokumentów WM i paczki ZIP per robota",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">
            Moduł <strong>Odbiory WM Druk</strong> (menu pod Robotami) służy do kompletowania dokumentacji przekazywanej do WM Wrocław. Działa dla robót <strong>aktywnych i zakończonych</strong> — nie tylko przy odbiorze końcowym.
          </p>
          <div className="space-y-3">
            {[
              {q:"Zakładki modułu", a:"Odbiory — lista robót pogrupowana po statusie robota (W TRAKCIE · GOTOWE DO ODBIORU · ZDANE), kompletność dokumentów per robota i generowanie ZIP. Szablony — biblioteka dokumentów + Stan konfiguracji (braki grup bez plików). Historia — kto, kiedy i jaki dokument wygenerował (PDF, DOCX lub pakiet ZIP) — tylko metadane, bez kopii plików. Ustawienia — domyślne miasto (JOB_CITY) i przyrostek nazwy ZIP."},
              {q:"Kompletność robota vs konfiguracja", a:"Przy robocie % liczy tylko sloty wgrywane per robota (Kominiarz, Gaz, Wentylacja…) — czego brakuje do tej konkretnej roboty. Braki globalnych szablonów (np. Oświadczenie bez pliku) nie obniżają % — widać je w Szablony → Stan konfiguracji."},
              {q:"Sekcje i filtr statusu", a:"Sekcje w Odbiorach wynikają wyłącznie ze statusu robota w module Roboty (W trakcie / Do odbioru / Zdane). Zmiana statusu w Robotach automatycznie przenosi robotę do właściwej sekcji. Filtr: Wszystkie · W trakcie · Do odbioru · Zdane."},
              {q:"Zmienne w szablonach", a:"W plikach szablonów użyj: {{DATE}}, {{YEAR}}, {{JOB_ADDRESS}}, {{JOB_STREET}}, {{JOB_BUILDING}}, {{JOB_APARTMENT}}, {{JOB_CITY}}. Data: dzisiejsza lub własna (format 14.06.2026 r.). Adres Gorlicka 26 m.6 → ulica Gorlicka, budynek 26, lokal 6, pełny Gorlicka 26/6."},
              {q:"Generowanie", a:"Generuj komplet (ZIP) — paczka ze zaznaczonych szablonów i dokumentów robota. Struktura: folder Odbiory/ (dokumenty WM) oraz opcjonalnie Pomiary/ (5× DOCX aktywnego raportu RAP). Checkbox „Dołącz dokumenty pomiarowe” — domyślnie włączony gdy istnieje aktywny RAP produkcyjny; raporty testowe TEST-RAP są ignorowane. Domyślnie wszystkie aktywne szablony są zaznaczone — odznacz wyjątki przed generowaniem. Zaznacz wszystko / Odznacz wszystko. Licznik Wybrane: N / M. Pojedynczy dokument — ikona pobierz przy szablonie generowanym. Nazwa ZIP np. GORLICKA_26_6_ODBIOR_WM.zip. Po udanym pobraniu wpis trafia do Historii (moduł WM Druk) i widać go też w szczegółach roboty."},
              {q:"Dokumenty per robota", a:"Sloty „wgrywane per robota” (Kominiarz, Gaz, Pomiary…) — wgraj PDF przy wybranej robocie. Dodatkowe pliki bez szablonu — przycisk Dodaj dokument. Sync: kw-wm-print-job-docs w chmurze."},
              {q:"Samodzielne pomiary (detached RAP)", a:"WM Druk → Pomiary → „Nowy pomiar” → Samodzielny. Raport może powstać bez powiązania z Robotą — wpisujesz adres i numer lokalu ręcznie. Otrzymuje normalny numer RAP z rejestru. Eksport DOCX i ZIP działa jak przy raporcie powiązanym z robotą. Sync: kw-electrical-measurements + registry."},
              {q:"Katalog Pomiarów — edycja i usuwanie", a:"WM Druk → Katalog Pomiarów: przycisk „Edytuj” otwiera pełny formularz raportu (adres, obwody, RCD, wyniki) bez zmiany numeru RAP. „Usuń” przy wierszu lub w szczegółach — potwierdzenie, raport znika z katalogu i WM Druk. Multi-select + „Usuń zaznaczone” usuwa wiele raportów naraz. Eksport DOCX/ZIP pozostaje dla pozostałych raportów."},
              {q:"Rejestr RAP — numer nie wraca do puli", a:"Usunięcie raportu nie zwalnia numeru RAP. W rejestrze wpis zostaje ze statusem ANULOWANY (CANCELLED). Kolejny nowy raport dostaje następny wolny numer — nigdy ponownie ten sam. Przykład: RAP-45, RAP-46, RAP-47 → usuń RAP-46 → następny nowy to RAP-48 (nie RAP-46). Zakładka „Rejestr RAP” w katalogu pokazuje historię numerów."},
              {q:"PDF statyczne vs ZI", a:"Skany PDF (Izba, SEP, Uprawnienia, Wzorcowanie) trafiają do ZIP bez zmian — bajt w bajt. ZI to formularz Tauron 2026 (AcroForm): generator dopisuje w §4 OKREŚLENIE OBIEKTU Ulicę, Numer budynku i Numer lokalu z adresu roboty — pozostałe pola wgrane wcześniej w szablonie ZI (np. dane zgłaszającego) są zachowywane. W panelu Szablony trzymaj wypełniony ZI.pdf jako źródło grupy ZI."},
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
      id:"operationalnotes",
      icon:ScrollText,
      title:"Notatki operacyjne",
      subtitle:"Baza wiedzy operacyjnej — osobna od uwag na robocie",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">
            Menu <strong>Notatki operacyjne</strong> to wspólna baza wiedzy firmy — procedury, ustalenia, kontekst operacyjny. Notatki mogą być <strong>globalne</strong> albo <strong>powiązane z konkretną robotą</strong>. Zapis synchronizuje się w chmurze (<code>kw-operational-notes</code>).
          </p>
          <div className="space-y-3">
            {[
              {q:"Czym różnią się od „Uwagi wewnętrzne (robota)”?", a:"W Roboty → Przegląd pole „Uwagi wewnętrzne (robota)” to krótki tekst przy tej jednej robocie (pole job.notes) — np. kod do domofonu. Notatki operacyjne to osobny moduł: tytuł, treść, komentarze, archiwum, wersje treści. Możesz je przypisać do roboty, ale żyją poza kartą roboty i są widoczne w całej bazie wiedzy."},
              {q:"Jak utworzyć notatkę z roboty?", a:"Roboty → wybierz robotę → Przegląd → sekcja „Notatki operacyjne” → Nowa notatka. Robota jest już wybrana w formularzu. Po zapisie możesz wrócić strzałką „Wróć do …” — otworzy się ta sama robota."},
              {q:"Co oznacza „Potwierdzam przeczytanie”?", a:"Otwarcie notatki nie oznacza przeczytania. Dopiero kliknięcie ✓ Potwierdzam przeczytanie zapisuje stan w chmurze (kw-operational-notes-read-state). Po edycji, komentarzu lub innej zmianie wersji (contentRev) trzeba potwierdzić ponownie. Autor nowej notatki jest oznaczony jako przeczytane automatycznie."},
              {q:"Skąd badge i banner nieprzeczytanych?", a:"Licznik obejmuje tylko aktywne notatki widoczne dla Twojej roli. Banner u góry panelu admina i badge przy menu „Notatki operacyjne” pokazują tę samą liczbę."},
              {q:"Widget na Pulpicie (2.57.4)", a:"Pod rzędem KPI kafel „Notatki operacyjne”: Łącznie (aktywne widoczne), Nieprzeczytane (bez ACK), Od inspektora (wszystkie aktywne od inspektora), ostatnia aktywność z tytułem. Klik otwiera moduł Notatki operacyjne."},
              {q:"Audyt notatek (2.57.5, Super Admin)", a:"W module Notatki operacyjne przycisk „Audyt” (tylko konto Super Admin) otwiera panel boczny z historią działań z chmury (kw-operational-notes-audit-log). Filtry: akcja, użytkownik, notatka oraz wyszukiwanie tekstowe. Paginacja 50 wpisów na stronę. Administrator i moderator nie widzą tego przycisku."},
              {q:"Komentarze", a:"W szczegółach notatki dodajesz komentarze pod treścią — np. doprecyzowanie ustalenia. Enter lub Wyślij zapisuje. Komentarze nie zastępują edycji treści głównej."},
              {q:"Archiwum", a:"Archiwizuj starą notatkę, gdy nie jest już aktywna, ale chcesz ją zachować. Zakładka Archiwum w module — stamtąd możesz Przywrócić. Archiwum ≠ usunięcie: usunięta notatka znika z list (logical delete) i nie wraca z chmury."},
              {q:"Kto ma dostęp?", a:"Super Administrator, Administrator i Moderator — pełny dostęp w module (tworzenie, edycja, archiwum, usuwanie). Inspektor terenowy — osobny panel (2.58.0): ikona Notatki operacyjne w headerze, bez edycji własnych notatek — tylko tworzenie i komentarze."},
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
      id:"audithub",
      icon:Shield,
      title:"Audit Hub",
      subtitle:"Historia działań — tylko Super Admin · 7 źródeł",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">
            <strong>Audit Hub</strong> to read-only podgląd istniejących logów w jednym miejscu — bez nowego zapisu z poziomu tego widoku. Łączy m.in. Security log (logowania admina, uprawnienia, import/restore danych).
          </p>
          <div className="space-y-3">
            {[
              {q:"Co to jest Audit Hub?", a:"Menu „Audit Hub” (ikona tarczy) łączy siedem źródeł: audyt notatek operacyjnych, logowania inspektora, activity log robotów, historię generowania WM Druk Odbiory (wm_print), audyt WM Druk Pomiary i Schematy (wm_druk — RAP, schematy, eksporty), publikacje pakietów odbiorowych oraz Security log. Wpisy sortowane od najnowszych. Filtry: źródło, osoba, wyszukiwanie. Paginacja 50 na stronę."},
              {q:"Kto ma dostęp?", a:"Wyłącznie Super Administrator (konto Dawid). Administrator i moderator nie widzą pozycji w menu ani widoku — próba wejścia przekierowuje na Pulpit."},
              {q:"WM Druk — dwa źródła w Audit Hub", a:"„WM Druk · Odbiory” (wm_print) — generowanie PDF/DOCX/ZIP szablonów odbiorów i wpisy w Historii. „WM Druk · Pomiary i Schematy” (wm_druk) — tworzenie/edycja/usuwanie RAP, eksporty DOCX/ZIP z katalogu, operacje na schematach jednokreskowych. Oba strumienie są oddzielne w filtrze źródła."},
              {q:"Jak działają deep linki?", a:"Kliknij wiersz w tabeli → szczegóły → przycisk „Przejdź”. Notatki operacyjne → moduł Notatki + panel Audyt. Inspektor · logowania → widok Inspektor. Roboty → karta roboty (właściwa zakładka). WM Druk Odbiory / Historia / Pomiary / Schematy / Katalog — odpowiednia zakładka modułu WM Druk. Pakiety odbiorowe → WM Druk → Odbiory. Powrót: strzałka Wstecz do Audit Hub."},
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
      id:"workcatalog",
      icon:Library,
      title: CATALOG_UX_WORK_CATALOG_TAB_LABEL,
      subtitle:"Katalog robót firmy v3 — lista, ceny i kompletność",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">
            <strong>Przetargi → zakładka {CATALOG_UX_WORK_CATALOG_TAB_LABEL}</strong> to katalog pozycji firmy (schema v3, <code>kw-wgdom-work-catalog</code>).
            Lista z filtrami, edycja <strong>ceny firmy</strong>, aktywność, edycja wielu cen, podgląd rynku, kompletność katalogu oraz <strong>pakiety robót</strong> (szablony kroków).
            Dostęp: Super Administrator zawsze; Administrator — gdy włączona flaga w ustawieniach aplikacji.
            To jedyne miejsce edycji stawek używanych we wycenie przetargów.
          </p>
          <div className="space-y-3">
            {[
              {q:"Skąd biorą się dane?", a:"Po pierwszym logowaniu admina aplikacja synchronizuje kw-wgdom-work-catalog z chmurą. Gdy katalog jest pusty, po starcie uruchamia się jednorazowy bootstrap danych. Widok czyta lokalny store i odświeża się automatycznie po zakończeniu deferred bootstrap. Gdy lista jest pusta tuż po starcie — poczekaj chwilę lub odśwież stronę."},
              {q:"Wyszukiwarka", a:"Pole na górze ekranu (Search First) — szuka po nazwie robota, słowach kluczowych i branży. Wyczyść krzyżykiem po prawej."},
              {q:"Filtry", a:"Chipy Wszystkie / Aktywne / Nieaktywne, Ulubione (Roboty) oraz lista rozwijana Branża (16 branż TradeId). Licznik pod wyszukiwarką pokazuje ile robót pasuje do filtrów oraz ile jest ulubionych."},
              {q:"Cena firmy (P2.2)", a:"Na karcie roboty pole Cena firmy — wpisz kwotę ≥ 0 z max. 2 miejscami po przecinku. Zapis po Enter lub wyjściu z pola (blur). Jednostka obok pola (np. zł / m²). Dane zapisują się w kw-wgdom-work-catalog (przeglądarka + chmura gdy sync działa)."},
              {q:"Aktywność (P2.3)", a:"Checkbox Aktywna / Nieaktywna na karcie — jednym tapnięciem. Lista domyślnie pokazuje tylko aktywne roboty; chip „Nieaktywne” lub „Wszystkie” filtruje jak w P2.1. Zmiana zapisuje updatedAt i trafia do chmury (P1.11)."},
              {q:"Ulubione (P2.10)", a:"Gwiazdka na karcie robota (poza trybem Edytuj wiele) oznacza ulubione — zapis od razu do chmury. Ulubione są wyświetlane na górze listy. Chip Ulubione filtruje roboty (współpracuje z wyszukiwaniem, branżą i aktywnością). W nagłówku widać liczbę ulubionych robót."},
              {q:"Edytuj wiele cen (P2.4)", a:"Przycisk Edytuj wiele w nagłówku — zaznacz roboty checkboxem, wybierz akcję (+%, −%, +zł, −zł lub ustaw cenę), wpisz wartość i kliknij Podgląd zmian. Zobaczysz starą i nową cenę każdej roboty, potem Potwierdź. Bez historii zmian i bez wpływu na Przetargi."},
              {q:"Firma vs rynek (P2.5)", a:"Pod polem ceny firmy widać podsumowanie: Twoja cena, cena rynkowa (gdy jest w katalogu) i status 🟢 ok. ±10% · 🟡 odbiega 11–25% · 🔴 >25%. Gdy brak ceny rynkowej — wyświetlamy „—”. Tylko podgląd — bez aktualizacji rynku i bez KNR/materiałów."},
              {q:"Kompletność (P2.6)", a:"Pod nagłówkiem widać Uzupełniono: X% — liczymy roboty z ceną firmy większą niż 0. Panel Branże pokazuje ile z ilu pozycji ma cenę w każdej branży (np. 8 / 11). 🟢 = 100% · 🟡 = 50–99% · 🔴 = poniżej 50%. Kliknij branżę, żeby przefiltrować listę; kliknij ponownie, żeby wrócić do wszystkich branż."},
              {q:"Pakiety robót (P2.7)", a:"Przełącznik Roboty | Pakiety u góry widoku. Pakiet to nazwa, branża i lista kroków (roboty z katalogu, opcjonalna ilość i notatka). Ta sama robota może wystąpić wielokrotnie. Strzałki ↑↓ zmieniają kolejność kroków. Duplikuj tworzy kopię pakietu. Usuń wymaga potwierdzenia w dialogu. Zapis trafia do kw-wgdom-work-bundles (przeglądarka + chmura). Po zapisie pozostajesz przy edytowanym pakiecie."},
              {q:"Pakiety — ulubione i czas (P2.8)", a:"Gwiazdka na liście pakietów oznacza ulubione — zapis od razu do chmury. Ulubione są wyświetlane na górze listy. W edytorze możesz podać Szacowany czas (dni) — liczba całkowita od 1 w górę albo puste pole. Zapis pakietu wymaga nazwy, branży, co najmniej jednego kroku oraz roboty obecnej w katalogu regionu."},
              {q:"Pakiety — filtr i badge kroków (P2.9)", a:"Chipy Ulubione filtrują listę pakietów (działają razem z wyszukiwaniem, branżą i aktywnością). W nagłówku widać liczbę ulubionych pakietów. Na karcie pakietu badge ostrzega, gdy krok wskazuje na brakującą robotę w katalogu (czerwony) lub nieaktywną robotę (pomarańczowy) — bez blokady podglądu listy; naprawę wykonuj w edytorze przed zapisem."},
              {q:"Czego tu nie ma?", a:"Bez historii zmian, aktualizacji rynku z CSV i integracji pakietów z kosztorysem Przetargów. Jedna robota = jeden wiersz listy Roboty."},
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
              {q:"Co to „Do zgłoszenia”?", a:"Domyślny zakres listy — aktywne przetargi z Wrocławia lub od kluczowych zamawiających, pasujące do słownika remontów. Ustawiasz w Filtrach zaawansowanych (zakres listy) lub chipie „Do zgłoszenia” w sekcji Operacyjne."},
              {q:"Układ listy V4", a:"Główny ekran: wyszukiwarka → banner decyzji (klik filtruje „Do decyzji”) → Moja kolejka (Do decyzji · Brak kosztorysu) → Klienci (WM, MOPS, ZZK, Gminy, Uczelnie, Wszystko) → Filtry zaawansowane. KPI, operacyjne presety, pozostała kolejka i własne presety — w panelu zaawansowanym."},
              {q:"Moja kolejka (Lista)", a:"Na głównym ekranie tylko: Do decyzji (bez GO/HOLD/ODPUŚĆ) i Brak kosztorysu. Pozostałe (termin dziś/jutro, referencje) — w Filtrach zaawansowanych. Klik ustawia filtr; drugi klik czyści."},
              {q:"Klienci (Lista)", a:"Rząd segmentów: WM · MOPS · ZZK · Gminy · Uczelnie · Wszystko — filtruje listę po typie zamawiającego. Licznik przy segmencie gdy są przetargi."},
              {q:"Filtry zaawansowane (Lista)", a:"Operacyjne (Moje, Do zgłoszenia, ≤7 dni…), pozostała kolejka, alerty, zakres listy, statystyki KPI, pipeline, Moje presety (zapis lokalny), eksport CSV, legenda."},
              {q:"Podpowiedzi listy (rekomendacje)", a:"Banner pod wyszukiwarką — np. ile przetargów czeka na decyzję. Gdy są decyzje do podjęcia, klik w banner ustawia filtr „Do decyzji”. Reguły lokalne w aplikacji (bez zewnętrznego modelu) — heurystyki na podstawie stanu listy i kolejki."},
              {q:"Workflow Hub (Przetarg)", a:"Zakładka Przetarg to centrum przygotowania oferty. Na górze (Command Layer) masz: 5 zakładek V4, Status Ribbon (proces + trust), jedną Główną akcję (CTA) — bez scrollu chrome. W treści: Pozycja w portfolio (bridge do Strategii), accordiony Szczegóły postępu i Informacje o przetargu (domyślnie zwinięte), Operator Action Bar (Upload · Analiza · e-Zamówienia · Eksport). Decyzję GO/HOLD/ODPUŚĆ zapisujesz na zakładce Decyzja."},
              {q:"Command Layer (detal przetargu)", a:"Sticky pasek u góry detalu workspace: Powrót · breadcrumb (Workspace › numer › tab; Decyzja › Kwalifikacja/Oferta) · tytuł · 5 zakładek. Następny krok (CTA workflow) na każdej zakładce w chrome. Pasek procesu (5 etapów) widoczny na wszystkich zakładkach — aktywny etap podświetlony („Tu jesteś”). Na Przetargu dodatkowo: sygnały zaufania (zwijane). Przy blockerach — chip „Blokery” w chrome. Kosztorys — zwarty chrome. Menu Moduł (mobile) pokazuje aktywny workspace i powrót."},
              {q:"Routing detalu (V4 URL)", a:"Klik w przetarg na liście lub mapie otwiera osobny adres /przetargi/:id/:zakładka. Produkcja używa routingu V4; stary widok accordion (rollback) jest tylko awaryjny i nie jest domyślny."},
              {q:"Operator Action Bar", a:"Pasek akcji operacyjnych na Przetargu: e-Zamówienia · Wgraj SWZ · Przeanalizuj dokumenty · Eksport PDF. Na desktopie (≥1024 px) pod Command Layer; na mobile i tablecie sticky na dole ekranu. Roboty i Usuń z listy pozostają w sekcji operatora (accordion Przygotowanie oferty)."},
              {q:"Pozycja w portfolio (Przetarg)", a:"Karta pod accordionem postępu: score, rekomendacja systemu, Twoja decyzja, ranking w portfolio i skrót powodów. Przycisk Strategia otwiera moduł Strategia z podświetleniem tego przetargu — bez osobnej zakładki strategia w detalu."},
              {q:"Mobile Cards (Kosztorys · Ceny · Dokumenty)", a:"Na ekranach <1024 px (telefon i tablet) duże tabele zamieniają się na karty wierszy — bez poziomego scrollu. Od 1024 px widać pełne tabele desktop. Dotyczy kosztorysu ATH, wyceny pozycji, UNKNOWN i tabel w Dokumentach."},
              {q:"Sekcja Dzisiaj (Lista)", a:"Na górze listy — przetargi wymagające reakcji dziś (nowe, termin ≤3 d. bez wyceny, wadium, brak kosztorysu w ofercie). Poniżej pozostała lista po filtrach, bez duplikatów."},
              {q:"Rozwiń przetarg — co się dzieje?", a:"Po wejściu w przetarg (dowolna zakładka V4) aplikacja w tle uruchamia pipeline: pobranie ogłoszenia i załączników BZP, ewentualnie pliki u zamawiającego, analizę kosztorysu i wstępną wycenę — bez konieczności otwierania Dokumentów. Zakładki: Przetarg (Workflow Hub) · Dokumenty · Kosztorys · Ceny · Decyzja. Ręcznie: „Przeanalizuj dokumenty” wymusza ponowną analizę; „Szukaj u zamawiającego” gdy auto-discovery nie wystarczyło."},
              {q:"Stary kosztorys po aktualizacji aplikacji", a:"Snapshot dossier w chmurze ma pole parserVersion. Gdy aplikacja ulepszy parser (np. PDF przedmiaru WM), stare zapisy bez tej wersji są uznawane za nieaktualne. Otwórz zakładkę Dokumenty lub Wycena — aplikacja automatycznie przeskanuje załączniki ponownie i zapisze świeży kosztorys (sync w chmurze). Ręcznie: „Analizuj SWZ”."},
              {q:"Decyzja (GO / HOLD / ODPUŚĆ)", a:"Zakładka Decyzja: werdykt systemu (STARTUJ / ANALIZUJ / ODPUŚĆ), kontekst przetargu, ekonomia oraz zapis decyzji właściciela GO · HOLD · ODPUŚĆ. Postęp i operator przygotowania są na Przetargu — bez duplikacji."},
              {q:"Pasek procesu oferty (Przetarg)", a:"Pięć etapów na zakładce Przetarg: Dokumenty, Analiza, Kosztorys, Wycena, Oferta. Kolory pokazują postęp (gotowe / w toku / brak). Klik etapu otwiera odpowiednią zakładkę V4 (np. Kosztorys → /kosztorys, Oferta → Decyzja z widokiem oferty)."},
              {q:"Jakość danych przetargowych (Trust Layer)", a:"System ocenia dokumenty, analizę, kosztorys, wycenę i spójność danych przez jeden agregat (buildTenderTrustAssessment). Na każdej zakładce jest jedna główna powierzchnia statusu: na Przetargu banner tylko gdy coś wymaga uwagi (cisza gdy OK), chipy ograniczone limitem; na Dokumentach mały badge w podsumowaniu; na Kosztorysie krótka wskazówka pod paskiem fazy; na Wycenie jeden komunikat. To nie to samo co pewność rekomendacji GO/HOLD na Decyzji."},
              {q:"Główna akcja (sticky CTA)", a:"Rekomendowana akcja workflow w Command Layer na wszystkich zakładkach detalu. Na Przetargu etykieta „Główna akcja”; na pozostałych „Następny krok · [zakładka]”. Przycisk min. 44 px na mobile. Gdy nieaktywny — powód pod przyciskiem. Logika bez zmian (intelligenceCtx SSOT)."},
              {q:"Automatyczne szukanie dokumentów (pipeline)", a:"Po otwarciu przetargu aplikacja sama pobiera załączniki BZP i — gdy trzeba — szuka u zamawiającego (ta sama logika co przyciski „Odśwież BZP” i „Szukaj u zamawiającego” na zakładce Dokumenty). „Odśwież BZP” wymusza ponowny skan. Dane synchronizują się z chmurą jak pozostałe pola przetargu."},
              {q:"Executive Summary na Decyzji vs w modalu PDF", a:"Na Decyzji widzisz skrót głównych robót z snapshotu dossier. W modalu podglądu PDF Executive Summary może dodatkowo wnioskować roboty z tekstu (P2A) — na panelu Decyzji ta inferencja z PDF nie działa."},
              {q:"Podgląd PDF — liczba pozycji i główne roboty", a:"Niebieska karta nad dokumentem pokazuje typ, liczbę pozycji, status cen i źródło. Gdy PDF się wczytuje, przy pozycjach widać „W trakcie analizy”. Gdy parser nie wyciągnął tabeli KNR (np. przedmiar Case 2), zamiast „0” pojawi się „Nie ustalono liczby pozycji”. Sekcja Główne roboty wtedy może wnioskować branże z tekstu PDF (pewność Średnia) — o ile w snapshot nie ma już działów ani katalogu. Dane snapshotu synchronizują się z chmurą jak pozostałe pola przetargu."},
              {q:"Zakładka Dokumenty — lista załączników", a:"W workspace Dokumenty załączniki są pogrupowane w siedem sekcji (accordion): SWZ, Przedmiary/ATH, Formularze ofertowe, Umowy, OPZ/STWiOR, Załączniki formalne i Pozostałe. Sekcje z dokumentami są domyślnie rozwinięte; puste grupy można zwinąć. Nad listą widać podsumowanie dokumentów (Summary Header). Nazwy plików są czytelniejsze (polskie znaki, spacje zamiast podkreśleń) — oryginalna nazwa pliku przy pobieraniu się nie zmienia."},
              {q:"Szczegóły formalne — skrót", a:"Pod listą dokumentów sekcja „Szczegóły formalne” pokazuje domyślnie krótkie podsumowanie (wadium, termin składania, kryteria, liczba warunków udziału). Pełna karta przetargu i propozycje słów kluczowych otwierają się dopiero po „Pokaż pełne szczegóły formalne”."},
              {q:"Kompletność oferty (workspace Oferta)", a:"Na górze zakładki Oferta sekcja „Kompletność oferty” odpowiada, czy pakiet jest gotowy do złożenia — licznik gotowych elementów i status (gotowa / wymaga uzupełnienia / niekompletna). Domyślnie widać skrót; „Pokaż szczegóły” rozwija checklistę krytyczne (wykaz robót, referencje, profil, warunki udziału) i dodatkowe (polisa OC, pełnomocnictwo). Dane pochodzą z tej samej analizy co workspace Kwalifikacja — bez osobnej bazy."},
              {q:"Strategia przetargów — co mam zrobić dziś?", a:"Zakładka Strategia zaczyna od: Najważniejsza rekomendacja (Centrum działań + pełna karta Najlepsza okazja), krótko Dlaczego, lista Co zrobić teraz (Centrum działań), Największe ryzyka. Monitoring, liczniki, kolejki, prognoza i portfel są w Pozostałe informacje (domyślnie zwinięte). Logika scoringu bez zmian."},
              {q:"Archiwum 7Z — komunikat o kosztorysie", a:"Gdy załącznik to plik .7z, aplikacja rozpakowuje go automatycznie (jak ZIP). „Błąd odczytu archiwum 7Z” oznacza problem techniczny z plikiem. „Nie znaleziono kosztorysu ATH/XLS/XLSX w archiwum 7Z” oznacza, że archiwum zostało odczytane poprawnie, ale zamawiający nie dołączył kosztorysu (np. same PDF projektów). Wtedy pobierz kosztorys ręcznie z platformy zamawiającego."},
              {q:"Dokumenty u zamawiającego (BIP)", a:"Gdy załączniki e-Zamówienia nie wystarczą: linki tylko z treści ogłoszenia BZP + ewentualnie wyszukiwanie BIP po słowach z tytułu i numerze postępowania (nie cały portal). Pobierane są max. 3 pliki pasujące do tego przetargu (SWZ/kosztorys). Resztę otwórz ręcznie z listy linków z ogłoszenia."},
              {q:"Kosztorys PRO — ekran decyzyjny", a:"W zakładce Kosztorys: panel KOSZTORYS PRO (KPI: pozycje ATH, pokrycie, FIT WGDOM, status), TOP 20 pozycji oraz BOQ Explorer — jedna tabela ATH + WGDOM z wyszukiwaniem i filtrami branżowymi. Kolumna Benchmark rbh pokazuje orientacyjne porównanie stawki robocizny (below/ok/above). Przy komórkach ATH bez ceny lub bez dopasowania pojawia się ikona z wyjaśnieniem; nad tabelą widać chip źródła dokumentu (typ, pewność, plik). „Pełny podgląd ATH” (lub link w BOQ) otwiera modal z pełną tabelą parsera; „Pobierz ATH” zapisuje plik źródłowy z dossier."},
              {q:"Kalkulator ceny ofertowej", a:`W zakładce workspace Wycena zobaczysz od razu: koszt własny, marżę i cenę oferty (rekomendowaną). W „Szczegóły → Pozycje kosztorysowe” sprawdzisz stawki materiału i robocizny per wiersz ATH (źródło: ${CATALOG_UX_SOURCE_LABEL}). Stawki edytujesz w Przetargi → ${CATALOG_UX_WORK_CATALOG_TAB_LABEL}.`},
              {q:`${CATALOG_UX_PRICING_SETTINGS_TAB_LABEL} przetargów`, a:`Przetargi → ${CATALOG_UX_PRICING_SETTINGS_TAB_LABEL}: podgląd stawek kategorii (tylko odczyt) oraz edycja parametrów firmy (RBH, marża, narzuty). Ceny pozycji edytujesz w Przetargi → ${CATALOG_UX_WORK_CATALOG_TAB_LABEL}. Kolumna Benchmark to orientacyjny zakres robocizny — bez zmiany wyceny. Override per przetarg: Wycena → Pozycje kosztorysowe.`},
              {q:"Klasyfikacja przedmiaru (UNKNOWN)", a:"W Wycena → Szczegóły → Klasyfikacja przedmiaru pokrycie % pozycji ATH. Przy UNKNOWN wybierz kategorię i Zapisz — fraza trafia do słownika użytkownika (chmura). Zarządzanie słownikiem: Profil firmy → WGDOM Classification Dictionary."},
              {q:"Koszty robocizny w Robotach", a:"W karcie roboty — panel „Koszty robocizny”: ile kosztuje ekipa na tej robocie wg listy płac i alokacji kosztów pobocznych (paliwo, narzędzia…) proporcjonalnie do godzin. Pokazuje też minimalną cenę z marżą."},
              {q:"Ocena opłacalności", a:"Po analizie SWZ widzisz ocenę (Sensowny / Ostrożnie / Ryzykowny). Wpisz „Nasz szacunek” — system porówna z wartością zamówienia i wadium."},
              {q:"Profil firmy i szacunek szans", a:"U góry listy Przetargi rozwiń „Profil firmy” — referencje, max wadium, CPV, regiony, polisę OC oraz model kosztów (stawki ekipy, koszty poboczne tygodniowe bez materiałów). Po rozwinięciu przetargu zobaczysz dopasowanie (Dobry profil / Do rozważenia), tabelę wymagań vs wasze dane, kryteria punktacji (waga ceny) i szacunek szans %."},
              {q:"Uczenie słów kluczowych", a:"Oznacz przetargi jako „Interesuje nas” — na dole panelu pojawią się propozycje słów. „Ucz system” dopisuje je do słownika w chmurze (kw-tenders-custom-keywords) i przelicza trafność. Pełna edycja słownika: panel „Słownik słów kluczowych” u góry listy."},
              {q:"Klienci strategiczni — szybkie filtry (P3.6)", a:"Na liście Przetargów chipy WM, ZZK, MOPS, TBS, Gminy, Uczelnie — tylko z liczbą > 0. Klik filtruje listę (Wyczyść resetuje wszystkie chipy). Działa z wyszukiwarką i domyślnym filtrem „Do zgłoszenia”."},
              {q:"Zarządzanie listą", a:"W panelu filtrów (Narzędzia): „Zaznacz wiele” włącza tryb zaznaczania — checkbox przy każdej karcie ma etykietę głosową (np. „Zaznacz przetarg: …”) i działa z klawiatury. Eksport CSV (przefiltrowana lista). Usuwanie pojedyncze: „Usuń z listy” w szczegółach. Zaawansowane filtry listy i statusu: przycisk „Filtry zaawansowane”."},
              {q:"Super Admin — reset i skan", a:"Ustawienia ⚙: dni/strony skanu BZP, auto-sync (godziny), reset pipeline / słownika / profilu. Backup JSON z górnego paska obejmuje kw-tenders-*."},
              {q:"Lejek pipeline", a:"Przycisk „Pipeline” pod filtrami — domyślnie zwinięty. Po rozwinięciu: nowe → obejrzane → interesuje → oferta → złożone → wygrane/przegrane oraz skuteczność %."},
              {q:"Legenda trafności i statusów", a:"Ikona ? na pasku pod filtrami — rozwija skróconą legendę (trafność, statusy pipeline, oceny SWZ). Domyślnie ukryta."},
              {q:"Utwórz robotę z przetargu", a:"Status „Wygrany” → „Utwórz robotę” / „Otwórz robotę” na liście przetargów lub w Przetargi → Strategia (najlepsza okazja, priorytety). SWZ/kosztorys trafia do plików roboty; w robocie link „Otwórz przetarg”."},
              {q:"Rozpocznij realizację kontraktu", a:"W robocie powiązanej z wygranym przetargiem (baner „Realizacja kontraktu”) — przycisk „Rozpocznij realizację”, gdy etap nie jest jeszcze „W realizacji”. Ustawia status W trakcie, etap WM W realizacji i wpis w historii roboty. Zapis trafia do chmury z resztą danych."},
              {q:"Planowa ekipa na kontrakcie", a:"W banerze BZP (Realizacja kontraktu): wybierz lidera i ekipę z kartoteki, potem „Zapisz ekipę”. To plan operacyjny kontraktu (executionAssigneeDirectoryIds) — osobno od faktycznych godzin (Roboty → Pracownicy). Od 20.5Z.4A nie ma kafelka KPI „Bez ekipy” na liście Roboty. Nie dodaje godzin ani nie zmienia listy płac."},
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
      title:"Kadry",
      subtitle:"Pracownicy i kontakty e-mail",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Menu <strong>Kadry</strong> ma dwie zakładki: <strong>Pracownicy</strong> (kartoteka, stawki, PIN) i <strong>Kontakty</strong> (adresy e-mail do wysyłki z robot i listy płac). Dane synchronizują się osobno w chmurze (<code>kw-directory</code> i <code>kw-contacts</code>).</p>
          <div className="space-y-3">
            {[
              {q:"Gdzie są kontakty e-mail?", a:"W tym samym module — zakładka Kontakty. Z listy płac lub roboty skrót „Zarządzaj kontaktami” otwiera od razu tę zakładkę."},
              {q:"Jak dodać nowego pracownika?", a:'Kliknij "Nowy pracownik". Wpisz imię i nazwisko, telefon, stanowisko (np. Murarz, Elektryk, Kierowca) i domyślną stawkę godzinową. Data zatrudnienia jest opcjonalna.'},
              {q:"Telefon i kod pracownika", a:"Numer w kartotece (np. +48 501 234 567) — pracownik wpisuje 9 ostatnich cyfr przy logowaniu. Dodatkowo ustawia osobisty kod 4 cyfry (jak PIN do karty) przy pierwszym logowaniu — chroni wypłatę przed podglądem przez kolegów. Administrator może ustawić lub zresetować kod w edycji pracownika."},
              {q:"Reset kodu pracownika", a:"Pracownicy → edytuj → sekcja „Kod pracownika” → Resetuj kod. Pracownik ustawi nowy kod przy następnym logowaniu (telefon zostaje bez zmian)."},
              {q:"Konto testowe (np. do sprawdzania panelu pracownika)", a:"W edycji pracownika zaznacz „Konto testowe”. Takie konto może się logować jako pracownik (zdjęcia, raporty), ale nie pojawia się na liście płac, grafiku, pulpicie ani w wyborze pracownika na robocie. Auto-wykrywane dla imienia „test” i numeru +48 000 000 000."},
              {q:"Nieobecności (urlop, chorobowe, bezpłatny)", a:"Pracownicy → edytuj → sekcja „Nieobecności”. Wybierz typ i zakres tygodni Pn–So (jak na liście płac). W liście płac zamiast kwoty wypłaty pojawi się URLOP / CHOROBOWE / BEZPŁATNY — godziny w tygodniu zostają. Nie można dodać urlopu dla tygodni już zamkniętych w archiwum. Po „Zapisz tydzień” status urlopu jest zamrożony w archiwum."},
              {q:"Aplikacja na ekranie telefonu (PWA)", a:"Po wejściu jako pracownik pojawi się baner „Dodaj na ekran”. Na Androidzie — Zainstaluj. Na iPhone (Safari) — Udostępnij → Dodaj do ekranu początkowego. Działa szybciej i trzyma zdjęcia w kolejce offline gdy brak sieci."},
              {q:"Zdjęcia offline i znak wodny", a:"Bez internetu zdjęcia trafiają do kolejki i wysyłają się same po powrocie sieci. Każde zdjęcie ma znak wodny: adres, data i W&G DOM."},
              {q:"Notatka głosowa w dokumentacji", a:"Przy dodawaniu dokumentacji robót (zakres prac, wiadomość dla admina) — ikona mikrofonu. Działa w Chrome/Edge na telefonie i komputerze."},
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
      subtitle:"Zdjęcia, dokumentacja robót i wymiary",
      content:(
        <div className="space-y-4">
          <p className="text-sm text-foreground/90 leading-relaxed">Na ekranie startowym wybierz <strong>Pracownik</strong> → znajdź się na liście → wpisz <strong>9 ostatnich cyfr telefonu</strong> (bez +48) oraz <strong>swój kod 4 cyfry</strong>. Przy pierwszym logowaniu ustawisz kod sam. Potem wybierz robotę — zdjęcia, dokumentację robót lub sprawdź wypłatę.</p>
          <div className="space-y-3">
            {[
              {q:"Logowanie — telefon + kod", a:"Telefon potwierdza kim jesteś (9 cyfr z kartoteki). Kod 4 cyfry to Twój osobisty PIN — ustawiasz przy pierwszym logowaniu. Nie podawaj go kolegom. Zapomniałeś? Administrator resetuje kod w kartotece Pracownicy."},
              {q:"Zakładka Roboty", a:"Na górze „Twoje kontrakty” — roboty, do których admin przypisał Cię w planowej ekipie (lider lub lista wykonawców). Poniżej „Wszystkie roboty w toku”. Wybierz robotę → zdjęcia (przed / w trakcie / po), dokumentacja robót (zakres, wymiary, obrys). Offline: kolejka zdjęć."},
              {q:"Twoje kontrakty — skąd lista?", a:"Administrator zapisuje plan ekipy w robocie (baner realizacji kontraktu). Nie dodaje to godzin ani nie zmienia wypłaty — tylko pokazuje Ci przypisane kontrakty na liście."},
              {q:"Status i termin na kontrakcie", a:"W sekcji „Twoje kontrakty” pod adresem widać status (np. W realizacji dla kontraktu z przetargu) oraz termin umowy z dat start/koniec roboty. Lista „Wszystkie roboty w toku” wygląda jak wcześniej."},
              {q:"Zakładka Wypłata u pracownika", a:"Kwota do wypłaty w najbliższy piątek, godziny bieżącego tygodnia, zaliczki i koszty do zwrotu (jeśli wpisane). Niżej — archiwum wypłat z zapisanych tygodni. Administrator musi najpierw dodać Cię do listy płac w danym tygodniu."},
              {q:"Ochrona danych wypłat", a:"Logowanie wymaga telefonu i osobistego kodu — kolega nie wejdzie na Twój profil samym numerem. Kwota ukrywa się też gdy przełączysz aplikację (Alt+Tab). Kopiowanie tekstu jest zablokowane."},
              {q:"Jak się zalogować?", a:"Administrator musi wpisać Twój numer w kartotece Pracownicy. Wybierz swoje imię z listy, wpisz telefon i kod. Nie wpisuj ręcznie cudzego imienia."},
              {q:"Jak dodać wiele zdjęć?", a:"W robocie użyj sekcji „Galeria — wiele zdjęć”: wybierz typ (przed/w trakcie/po), kliknij „Wybierz z galerii”, zaznacz wiele zdjęć, podejrzyj miniaturki i „Wyślij”."},
              {q:"Postęp dokumentacji (pasek kroków)", a:"Po wejściu w robotę u góry widać postęp: Zdjęcia → Dokumentacja → Wymiary → Obrys. Kropki zielone = krok ukończony (liczone z Twoich zapisanych zdjęć i dokumentacji). Kliknij krok — przewinie do sekcji. Baner podpowiada następny krok. Inspektor na tej podstawie przygotuje plan techniczny — nie musisz go robić sam."},
              {q:"Jak wysłać dokumentację robót?", a:"Sekcja „Dokumentacja robót”: wpisz zakres w jednym polu (lista — kropki, numery, podpunkty), wymiary z opisem pomieszczenia lub foto obrysu lokalu, na dole „Wiadomość dla admina”. Po wysłaniu możesz edytować lub usunąć wpis w „Twoja dokumentacja”."},
              {q:"Opisy zdjęć?", a:"Przy galerii — opis pod każdym zdjęciem przed wysłaniem. Przy aparacie — pole „Opis do następnych zdjęć”. Po wgraniu — edytuj opis lub usuń zdjęcie w „Twoje wgrane zdjęcia”."},
              {q:"Gdzie admin widzi dokumentację?", a:"Roboty → wybierz robotę → zakładka „Dokumentacja”. Rozwiń wpis — widać zakres prac, tabelę wymiarów, obrys lokalu i wiadomość."},
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
              {q:"Dokumentacja i zakresy", a:"Checklista dokumentów (zlecenie, zakres, kominiarz, pomiary…). Sekcja Dokumentacja robót: zakres prac, wymiary pomieszczeń, foto obrysu lokalu."},
              {q:"Galeria zdjęć", a:"Tylko zdjęcia zaakceptowane przez admina. Rozwiń robotę → „Pobierz galerię ZIP” (foldery: przed / w trakcie / po) lub „ZIP kategorii”. Nazwy plików: ulica, data, kategoria."},
              {q:"Kto zarządza kontem inspektora?", a:"Super Administrator (Dawid) w panelu ⚙ — zmiana hasła, dodawanie kolejnych inspektorów. Hasła sync w chmurze jak u adminów."},
              {q:"Gdzie admin widzi zmiany inspektora?", a:"Pulpit → „Uwaga dziś” (nowe zmiany) oraz zakładka Inspektor — feed aktywności + statystyki logowań. Klik „Otwórz w Robotach” na wpisie otwiera właściwą sekcję roboty (Dokumenty, Pliki, Zdjęcia, Przegląd/billing). Inspektor = monitoring; Roboty = działania."},
              {q:"Inspektor (admin) vs Roboty — podział ról", a:"Zakładka Inspektor w panelu administratora służy wyłącznie do monitorowania aktywności inspektora terenowego (feed, nieprzeczytane, KPI). Upload plików, checklista dokumentów, odpowiedź WM, zatwierdzanie propozycji billing i wysyłka plików emailem — w zakładce Roboty. Portfolio WM nie jest na Pulpicie — przegląd robót WM: Roboty (lista, filtry, kolejki) oraz panel inspektora terenowego (zakładka Portfolio WM)."},
              {q:"Notatki operacyjne (2.58.0)", a:"W headerze panelu inspektora ikona Notatki operacyjne (ScrollText) z czerwonym badge, gdy masz nieprzeczytane aktywne notatki. Klik otwiera pełnoekranowy widok — bez nowej zakładki na dole. Widzisz własne notatki oraz te udostępnione przez admina (shareWithInspector). Możesz tworzyć notatki, dodawać komentarze, potwierdzać przeczytanie (ACK) i sprawdzać listy Przeczytali/Nie przeczytali. Nie edytujesz treści notatek, nie archiwizujesz, nie usuwasz i nie zmieniasz widoczności — zmiany treści to domena admina; Ty doprecyzowujesz komentarzami. Nowa notatka inspektora jest automatycznie widoczna dla zespołu admina. Dane sync w chmurze (te same klucze KV co panel admina)."},
              {q:"Instrukcja dla inspektora", a:"W panelu inspektora: przycisk Pomoc / baner przy pierwszym wejściu. Dymki ? przy sekcjach wyjaśniają co kliknąć. Instrukcja opisuje zlecenia, kosztorysy NORMA, dokumenty, zdjęcia, dokumentację robót i Notatki operacyjne."},
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
              {q:"Pulpit — Do odzyskania (V3)", a:"Na Pulpicie w „Pilne uwagi na dziś” kategoria „Do odzyskania”: każdy alert billing to osobna pozycja (tytuł, kwota, powód). Licznik kategorii = liczba alertów. Klik w pozycję → moduł Do rozliczenia. Pełna analiza aging i KPI pozostają w module."},
              {q:"Wymaga uwagi (alerty)", a:"System wykrywa pozycje wymagające działania: kwota pozostała ≥ 2 000 PLN, wiek > 90 dni, częściowe rozliczenie bez postępu > 60 dni, brak aktywności (edycja lub rozliczenie) > 60 dni. W module pełna lista z filtrami; na Pulpicie każdy alert to jedna pozycja w kategorii „Do odzyskania”."},
              {q:"Analiza odzyskiwania (aging)", a:"W module, pod KPI, sekcja pokazuje pełny aging: ile pozycji i jaka suma PLN czeka w każdym przedziale wieku od utworzenia pozycji. Liczone są tylko pozycje otwarte i częściowo rozliczone — rozliczone w całości nie wchodzą do kubełków. Suma kubełków = kwota Do odzyskania na Pulpicie."},
              {q:"Statystyki odzyskiwania", a:"Pod agingiem: KPI odzyskane w bieżącym miesiącu i roku, średni czas pełnego zamknięcia pozycji (tylko rozliczone w całości) oraz liczba zamkniętych pozycji. Trzy rankingi TOP 5: największe do odzyskania, najstarsze nierozliczone, największe odzyskane. Klik w pozycję z listy otwiera szczegóły. Na Pulpicie link „Zobacz analizę odzyskiwania” prowadzi do modułu."},
              {q:"Zdjęcia i pliki", a:"W menu „Zdjęcia i pliki” są dwie zakładki: Zdjęcia (galeria) i Pliki (Files Hub — read-only). Pliki pokazują dokumenty kontraktowe, dokumentację ekipy (workerReports) i załączniki ogólne oraz podgląd checklisty odbiorowej. Upload i edycja tylko w Robotach → Pliki. ZIP dokumentów, załączników i zdjęć pobierasz osobno."},
              {q:"Files Hub — co to jest?", a:"Jeden widok plików roboty: (1) dokumenty kontraktowe — zlecenie, kosztorys, plan PDF, (2) dokumentacja robót — wpisy ekipy z linkiem do zakładki Dokumentacja, (3) załączniki ogólne, (4) checklista odbiorowa X/9 jako informacja. Licznik Pliki sumuje kontrakt + dokumentację + załączniki (bez zdjęć i bez checklisty)."},
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
          <p className="text-sm text-foreground/90 leading-relaxed">W menu są osobne pozycje <strong>Instrukcja</strong> i <strong>Zmiany</strong> (widoczne dla Super Administratora; Administrator — gdy włączone w ⚙ Ustawienia). Zakładka <strong>Zmiany</strong> to chronologiczna lista aktualizacji od najnowszej wersji w dół. Domyślnie widać 10 wpisów; na dole możesz przełączać strony albo ustawić 20 lub 50 wpisów na stronie.</p>
          <div className="space-y-3">
            {[
              {q:"Po co jest ta zakładka?", a:"Żebyś wiedział co się zmieniło po aktualizacji — nowe funkcje, poprawki i ulepszenia. Najnowsza wersja jest na górze z zieloną etykietą „Najnowsza”."},
              {q:"Kto widzi Instrukcję i Zmiany?", a:"Super Administrator zawsze. Administrator — tylko gdy w ⚙ Ustawienia włączysz „Instrukcja dla administratorów” i/lub „Zmiany dla administratorów”. Moderator, inspektor i pracownik — nie mają dostępu."},
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
            <li><strong>Kadry</strong> — kartoteka (<code>kw-directory</code>) + zakładka Kontakty e-mail (<code>kw-contacts</code>)</li>
            <li><strong>Lista płac</strong> — godziny (w tym dodatkowe), zaliczki, koszty do zwrotu, rozliczenia; eksport PDF/Word i wysyłka emailem</li>
            <li><strong>Archiwum</strong> — zapisane tygodnie</li>
            <li><strong>Roboty</strong> — adresy, dokumenty, materiały, raporty, wpisy czasu pracy</li>
            <li><strong>Zdjęcia i pliki</strong> — galeria zdjęć + Files Hub (kontrakt, dokumentacja ekipy, załączniki)</li>
            <li><strong>Do rozliczenia</strong> — rejestr pozycji do odzyskania (<code>kw-recoverable-charges</code>)</li>
            <li><strong>Notatki operacyjne</strong> — baza wiedzy operacyjnej (<code>kw-operational-notes</code>)</li>
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
              {q:"Co to jest backup i jak go zrobić?", a:'W górnym pasku (ikona pobierania) kliknij „Eksportuj backup” — pobierze się plik .json z pełnym stanem aplikacji, w tym Notatek operacyjnych (notatki, stan przeczytania ACK, audit-log, usunięte ID). Super Admin: pełne przywracanie w ⚙ Ustawienia → Kopie zapasowe. Import scala z obecnymi danymi i zapisuje do chmury.'},
              {q:"Automatyczny backup emailem", a:"Raz w tygodniu — w niedzielę, po zapisaniu tygodnia do archiwum (przycisk „Zapisz tydzień” lub automatyczny zapis w niedzielę, gdy wszyscy rozliczeni). Wysyłana jest jedna kopia JSON na adres z ustawień. Nie ma codziennych maili przy każdym wejściu w aplikację."},
              {q:"Utrata danych — co robić?", a:"⚙ Ustawienia (Super Admin) → Kopie zapasowe: przywróć wszystko z chmury lub lokalnie. Dla pojedynczych typów: lista płac lub roboty osobno. W Liście płac: „Przywróć z archiwum” dla bieżącego tygodnia. Regularnie rób eksport backup z górnego paska."},
              {q:"Używam dwóch urządzeń — które dane są właściwe?", a:"Przy każdym zapisie aplikacja scala dane z obu źródeł — bogatsze wpisy wygrywają. Stara karta z pustą listą nie nadpisze chmury. Przy pierwszym wejściu na nowym urządzeniu dane pobierają się z chmury i łączą z lokalnymi."},
              {q:"Dlaczego widzę komunikat o nowej wersji?", a:"Gdy na serwerze pojawi się nowsza wersja WGDOM niż ta w Twojej otwartej karcie, u góry ekranu zobaczysz zielony baner z numerem wersji. Kliknij „Odśwież teraz”, aby załadować najnowsze funkcje — aplikacja nie odświeża się sama. „Później” ukrywa baner do końca sesji; po kolejnym deployu komunikat może wrócić. Twoje dane w chmurze są bezpieczne."},
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
            {icon:LayoutDashboard, title:"Pulpit — operacje na dziś", desc:"KPI (Wypłata, Ekipa, WM, Braki dokumentów, Pilne uwagi) → sekcja braków dokumentów → Pilne uwagi (kategorie) → skrót Przetargów. Strategia i prognozy w Przetargi → Strategia."},
            {icon:CalendarDays, title:"Grafik tygodniowy", desc:"Menu Grafik — cały tydzień na jednym ekranie. Godziny z listy płac (łącznie z dodatkowymi blokami), adres z wpisu na robocie."},
            {icon:Wallet, title:"Koszty do zwrotu vs zaliczka", desc:"Zaliczka = pieniądze wzięte z góry (odejmowane). Koszty do zwrotu = pracownik zapłacił z własnej kieszeni (doliczane). Oba wpisujesz w panelu pracownika w Liście Płac."},
            {icon:Clock, title:"Dodatkowe godziny w dniu", desc:"Pod każdym dniem w panelu pracownika: „Dodatkowe godziny w …” → opis + od–do. Wliczają się do wypłaty, grafiku i PDF."},
            {icon:Search, title:"Globalne wyszukiwanie", desc:"Ikona lupy w prawym górnym rogu. Wpisz imię pracownika lub adres roboty — aplikacja znajdzie to w całej bazie danych."},
            {icon:Users, title:"Filtrowanie robót po pracowniku", desc:"W zakładce Roboty jest rozwijana lista pracowników. Wybierz kogoś — zobaczysz tylko roboty na których ten pracownik miał wpisy czasu pracy."},
            {icon:KeyRound, title:"Zapamiętaj hasło admina", desc:"Przy logowaniu administratora zaznacz „Zapamiętaj hasło na tym urządzeniu” — hasło zostaje zaszyfrowane lokalnie (nie w chmurze). Nie używaj na wspólnym komputerze."},
            {icon:FileDown, title:"PDF z roboty do wysłania klientowi", desc:"Każda robota ma przycisk PDF w nagłówku. Generuje profesjonalny dokument z listą dokumentów, czasem pracy i kosztami — można go od razu wysłać mailowo."},
            {icon:Mail, title:"Email z roboty — zdjęcia i raporty", desc:"Maile z biuro@wgdom.fun. W Kontaktach włącz uprawnienie „Roboty” — tylko te adresy pojawią się przy wysyłce z karty roboty. Wybierz treść (zdjęcia, raport) i wyślij."},
            {icon:Send, title:"Kontakt z inspektorem — szablony A–D", desc:"W szczegółach roboty: przycisk „Kontakt z inspektorem”. W Kontaktach zaznacz „Inspektor WM” u odbiorcy; opcjonalnie „Domyślny odbiorca inspektora” (np. Szymon). Modal startuje z domyślnym — „Zmień odbiorcę” pozwala wysłać test do innej osoby. System sugeruje szablon, pokazuje co mamy gotowe i czego brakuje — wyślij emailem bez załączników."},
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

export type GuideViewMode = "instructions" | "changes";

export function GuideView({ mode }: { mode: GuideViewMode }) {
  const guideHeaderRef = useRef<HTMLDivElement>(null);
  useWheelScrollForward(guideHeaderRef);
  const isInstructions = mode === "instructions";

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div ref={guideHeaderRef} className="shrink-0 px-4 sm:px-8 pt-6 pb-3 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            {isInstructions ? (
              <BookOpen size={18} className="text-primary"/>
            ) : (
              <ScrollText size={18} className="text-primary"/>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2 flex-wrap">
              {isInstructions ? "Instrukcja obsługi" : "Zmiany"}
              {!isInstructions && (
                <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                  v{CHANGELOG[0].version}
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isInstructions
                ? "Pomoc krok po kroku — moduły, FAQ i skróty"
                : "Historia wersji aplikacji — nowości, poprawki i ulepszenia"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {isInstructions ? <HelpView embedded /> : <ChangelogView embedded />}
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

