/* =====================================================================
   Circulara Production · Reifegradmodell Produktion
   Gleicher Aufbau wie das Circulara-Modell (circular_model.json):
   Dimension → Indikator → Leitfragen (Multiple Choice, Score 0 … 1)
   mit Erläuterung, Handlungsempfehlung je Indikator und fünf Reifestufen.
   Quellen (Auswahl): VDI 5200 Blatt 1 (Fabrikplanung, 2011); Wiendahl, Reichardt,
   Nyhuis: Handbuch Fabrikplanung (2. Aufl. 2014); Grundig: Fabrikplanung (7. Aufl. 2021);
   Rother/Shook: Learning to See (1999); Shingo: A Revolution in Manufacturing – The SMED
   System (1985); Nakajima: Introduction to TPM (1988); Takeda: Das synchrone
   Produktionssystem (2012); Lichtblau et al.: Industrie 4.0-Readiness (IMPULS/VDMA 2015);
   ASR A1.8 Verkehrswege; DIN EN 13306 Instandhaltung; VDI 2870 Ganzheitliche
   Produktionssysteme.
   ===================================================================== */
(function () {
'use strict';
const O = (a, b, c, d, e) => [a, b, c, d, e].map((label, i) => ({ label, score: i / 4 }));

window.PRS_MODEL_PROD = {
  id: 'produktion',
  name: 'Produktionsreife',
  titel: 'Produktionsreife-Check',
  untertitel: 'Dein virtueller Assistent zur Bewertung der <b>Produktionsreife</b> deines Werks – mit Zielbild-Layout im Fabrikplaner.',
  statusTitel: 'Produktionsreife-Assessment Status',
  reifeTitel: 'Ihre Produktionsreife',
  objekt: 'Produktionsbereich',
  objektBeispiel: 'z. B. Fertigung Getriebegehäuse, Werk Süd',
  weights: { 'Produkt & Programm': 0.15, 'Prozesse & Materialfluss': 0.25, 'Technik & Ausstattung': 0.25, 'Organisation & Mitarbeitende': 0.20, 'Digitalisierung & Steuerung': 0.15 },
  ui: {
    'Produkt & Programm': { bg: '#E9FBF5', bg2: '#F6FFFC', accent: '#1F7E8A', pill: '#D8F6EE', icon: 'cube' },
    'Prozesse & Materialfluss': { bg: '#EAF3FF', bg2: '#F6FAFF', accent: '#2B6CB0', pill: '#DCEBFF', icon: 'flow' },
    'Technik & Ausstattung': { bg: '#FFF6E8', bg2: '#FFFBF3', accent: '#B7791F', pill: '#FFE9C8', icon: 'gear' },
    'Organisation & Mitarbeitende': { bg: '#F3EEFF', bg2: '#FAF7FF', accent: '#6B46C1', pill: '#E8DEFF', icon: 'team' },
    'Digitalisierung & Steuerung': { bg: '#FFF0F5', bg2: '#FFF7FB', accent: '#C026D3', pill: '#FAD5E8', icon: 'net' }
  },
  summaries: {
    'Produkt & Programm': 'Standardisierung, Teilefamilien und Planbarkeit des Produktionsprogramms.',
    'Prozesse & Materialfluss': 'Prozessstabilität, gerichteter Materialfluss, Bestände, Rüsten und Austaktung.',
    'Technik & Ausstattung': 'Anlagenverfügbarkeit, Kapazität, Automatisierung, Fördertechnik und Instandhaltung.',
    'Organisation & Mitarbeitende': 'Qualifikation, Verantwortung im Team, Shopfloor-Management und Verbesserungskultur.',
    'Digitalisierung & Steuerung': 'Planung und Steuerung, Betriebsdatenerfassung, Transparenz und Vernetzung.'
  },
  levels: [
    { min_score: 0.0, max_score: 0.25, name: 'Stufe 1', label: 'Reaktiv', emoji: '🔴', description: 'Die Produktion arbeitet überwiegend auf Zuruf; Abläufe, Wege und Kapazitäten sind kaum beschrieben, Störungen werden einzeln behoben. Der Nutzen einer flussorientierten Organisation wird noch nicht erschlossen.' },
    { min_score: 0.25, max_score: 0.5, name: 'Stufe 2', label: 'Stabilisierend', emoji: '🟠', description: 'Erste Standards, Kennzahlen und Verbesserungsprojekte sind vorhanden; die Umsetzung erfolgt punktuell. Materialfluss, Ausstattung und Organisation sind noch nicht aufeinander abgestimmt.' },
    { min_score: 0.5, max_score: 0.75, name: 'Stufe 3', label: 'Standardisiert', emoji: '🟡', description: 'Prozesse sind standardisiert und weitgehend stabil; der Materialfluss ist gerichtet, Kapazitäten werden geplant und Daten werden als Entscheidungsgrundlage genutzt. Teams übernehmen Verantwortung für ihren Bereich.' },
    { min_score: 0.75, max_score: 1.0, name: 'Stufe 4', label: 'Gesteuert', emoji: '🟢', description: 'Die Produktion wird über Kennzahlen in Echtzeit gesteuert; Takt, Bestände und Anlagenverfügbarkeit sind beherrscht. Organisation, Technik und Layout bilden ein abgestimmtes Produktionssystem.' },
    { min_score: 1.0, max_score: 1.01, name: 'Stufe 5', label: 'Optimiert', emoji: '🟣', description: 'Die Produktion verbessert sich kontinuierlich und selbstständig; Daten aus Anlagen und Prozessen fließen systematisch in Optimierungen ein. Reife wird als dynamischer Entwicklungszustand verstanden.' }
  ],
  model: {
    'Produkt & Programm': {
      '1.1 Standardisierung & Modularität': {
        description: 'Bewertet Gleichteile, Module und fertigungsgerechte Gestaltung der Produkte.',
        questions: [
          { code: '1.1.1', text: 'Wie hoch ist der Anteil an Gleichteilen, Modulen und standardisierten Baugruppen im Produktprogramm?', explanation: 'Gleichteile und Module senken die Zahl unterschiedlicher Arbeitsfolgen und machen eine fluss- bzw. linienorientierte Fertigung erst wirtschaftlich. Je höher der Standardisierungsgrad, desto größer die Teilefamilien, die gemeinsam gefertigt werden können. (vgl. Wiendahl et al. 2014; Grundig 2021)',
            options: O('Kaum Gleichteile; nahezu jedes Produkt besteht aus auftragsspezifischen Einzelteilen.', 'Wenige Gleichteile (z. B. Normteile); Baugruppen werden überwiegend auftragsbezogen konstruiert.', 'Ein Teil der Baugruppen ist standardisiert; Varianten entstehen jedoch früh im Prozess.', 'Modularer Baukasten für die meisten Produkte; Varianten entstehen überwiegend spät in der Montage.', 'Durchgängige Plattform- und Modulstrategie; Varianten werden konsequent erst am Ende der Wertschöpfung gebildet.') },
          { code: '1.1.2', text: 'In welchem Umfang werden Produkte fertigungs- und montagegerecht (DfM/DfA) entwickelt?', explanation: 'Fertigungs- und montagegerechte Konstruktion reduziert Bearbeitungsschritte, Rüstvorgänge und Sonderprozesse. Sie ist Voraussetzung für kurze, abgestimmte Taktzeiten. (vgl. Boothroyd/Dewhurst 2011; Grundig 2021)',
            options: O('Die Fertigung wird in der Entwicklung nicht einbezogen; Probleme zeigen sich erst in der Serie.', 'Die Fertigung wird bei Bedarf informell gefragt.', 'Fertigungsgerechtes Gestalten erfolgt in Projekten mit Freigabe durch die Fertigung.', 'Verbindliche DfM/DfA-Richtlinien und gemeinsame Reviews von Entwicklung und Produktion.', 'Simultaneous Engineering mit Kennzahlen zu Teilezahl, Montagezeit und Fehlerrisiko je Produkt.') }
        ]
      },
      '1.2 Teilefamilien & Programmplanbarkeit': {
        description: 'Bewertet die Bildung von Teilefamilien und die Planbarkeit des Produktionsprogramms.',
        questions: [
          { code: '1.2.1', text: 'Sind Teile und Produkte zu Familien mit ähnlicher Arbeitsfolge zusammengefasst?', explanation: 'Teilefamilien mit gleicher oder ähnlicher Arbeitsfolge sind die Grundlage für Fertigungsinseln und Linien. Ohne Familienbildung bleibt nur die verrichtungsorientierte Werkstattfertigung. (vgl. Opitz 1966; Wiendahl et al. 2014)',
            options: O('Keine Familienbildung; jedes Teil wird einzeln disponiert.', 'Familien sind informell bekannt, werden aber nicht genutzt.', 'Für einzelne Bereiche sind Teilefamilien definiert und werden gemeinsam gefertigt.', 'Teilefamilien sind systematisch (z. B. Klassifizierung, Routing-Analyse) gebildet und den Fertigungsbereichen zugeordnet.', 'Teilefamilien werden laufend aus Produktdaten abgeleitet und steuern Layout, Kapazität und Planung.') },
          { code: '1.2.2', text: 'Wie stabil und planbar ist das Produktionsprogramm (Prognosegüte, Schwankung der Mengen)?', explanation: 'Stabile, gut prognostizierbare Mengen erlauben feste Takte und dedizierte Linien. Stark schwankende Programme verlangen flexible, umrüstbare Strukturen. (vgl. VDI 5200; Takeda 2012)',
            options: O('Mengen schwanken stark und kurzfristig; Prognosen liegen nicht vor.', 'Grobe Jahresprognosen; Abweichungen von über 40 % sind üblich.', 'Rollierende Prognose; Abweichungen von 20–40 %.', 'Abgestimmte Absatz- und Produktionsplanung (S&OP); Abweichungen unter 20 %.', 'Hohe Planungsgüte mit Glättung (Heijunka); Schwankungen unter 10 %.') }
        ]
      }
    },
    'Prozesse & Materialfluss': {
      '2.1 Prozessstabilität & Standardarbeit': {
        description: 'Bewertet Standardarbeit, Prozessfähigkeit und Qualität im ersten Durchlauf.',
        questions: [
          { code: '2.1.1', text: 'In welchem Umfang sind Arbeitsabläufe als Standardarbeit beschrieben und werden eingehalten?', explanation: 'Standardarbeit (Arbeitsfolge, Taktzeit, Standardbestand) ist die Basis für stabile Prozesse, kurze Einarbeitung und jede Form der Austaktung. (vgl. VDI 2870; Ohno 1988)',
            options: O('Keine dokumentierten Abläufe; jede Person arbeitet nach eigener Erfahrung.', 'Arbeitsanweisungen für einzelne kritische Tätigkeiten.', 'Standardarbeitsblätter für die meisten Arbeitsplätze; Einhaltung wird stichprobenartig geprüft.', 'Standards sind visualisiert, werden auditiert und bei Verbesserungen aktualisiert.', 'Standardarbeit mit Taktzeit, Arbeitsfolge und Standardbestand ist überall gelebt und Basis jeder Verbesserung.') },
          { code: '2.1.2', text: 'Wie hoch ist die Qualität im ersten Durchlauf (First Pass Yield) über alle Fertigungsschritte?', explanation: 'Nacharbeit und Ausschuss erzeugen Rückflüsse und Störungen. Eine verkettete Fertigung reagiert empfindlich auf instabile Qualität, deshalb ist ein hoher First Pass Yield Voraussetzung für Linien. (vgl. Pfeifer/Schmitt 2010)',
            options: O('Unter 80 %; Nacharbeit ist fester Bestandteil des Ablaufs.', '80–90 %; Fehlerursachen werden selten nachverfolgt.', '90–95 %; die wichtigsten Fehlerursachen sind bekannt.', '95–99 %; Fehler werden am Entstehungsort erkannt (Poka Yoke, Werkerselbstprüfung).', 'Über 99 %; Prozesse sind fähig (Cpk ≥ 1,33) und werden statistisch überwacht.') }
        ]
      },
      '2.2 Materialfluss & Bestände': {
        description: 'Bewertet Flussrichtung, Wege, Zwischenbestände und Materialbereitstellung.',
        questions: [
          { code: '2.2.1', text: 'Wie gerichtet verläuft der Materialfluss vom Wareneingang bis zum Versand?', explanation: 'Ein gerichteter Fluss ohne Rückwege und Kreuzungen verkürzt Wege und Durchlaufzeit und ist das zentrale Ziel der Layoutplanung (Idealplanung nach dem Materialfluss). (vgl. VDI 5200; Wiendahl et al. 2014)',
            options: O('Ungerichtet; Teile wandern mehrfach zwischen Hallenbereichen hin und her.', 'Überwiegend ungerichtet; einzelne Bereiche sind sinnvoll benachbart.', 'Grundrichtung erkennbar, aber mit deutlichen Rück- und Kreuzungsflüssen.', 'Weitgehend gerichteter Fluss; Rückflüsse nur bei Sonderprozessen.', 'Durchgängig gerichteter Fluss (I-, L- oder U-Fluss) ohne Kreuzungen, mit kurzen Wegen.') },
          { code: '2.2.2', text: 'Wie hoch sind die Zwischenbestände (Work in Progress) zwischen den Fertigungsschritten?', explanation: 'Hohe Zwischenbestände verlängern die Durchlaufzeit (Little’s Law), binden Fläche und Kapital und verdecken Probleme. Linien und Inseln arbeiten mit kleinen, begrenzten Puffern. (vgl. Rother/Shook 1999; Nyhuis/Wiendahl 2012)',
            options: O('Sehr hohe Bestände; Material stapelt sich vor fast jeder Maschine, Durchlaufzeit mehrere Wochen.', 'Hohe Bestände; Puffer sind nicht begrenzt.', 'Bestände sind bekannt und teilweise begrenzt; Durchlaufzeit wenige Tage.', 'Begrenzte Puffer (FIFO-Bahnen, Supermärkte) an den meisten Schnittstellen.', 'Minimale, festgelegte Bestände; Fluss im One-Piece- oder Kleinlosfluss.') },
          { code: '2.2.3', text: 'Wie wird Material an die Arbeitsplätze bereitgestellt?', explanation: 'Eine getaktete Materialbereitstellung (Routenzug, Kanban, Supermarkt) entkoppelt Logistik und Wertschöpfung und hält die Werker an der Maschine. (vgl. Günthner et al. 2012; Takeda 2012)',
            options: O('Werker holen Material selbst aus dem Lager.', 'Bereitstellung per Stapler auf Zuruf.', 'Feste Bereitstellflächen; Nachschub nach Sichtprüfung.', 'Verbrauchsgesteuerte Bereitstellung (Kanban) mit festen Touren.', 'Getakteter Routenzug oder FTS mit Supermarkt; Bereitstellung synchron zum Bedarf.') }
        ]
      },
      '2.3 Rüsten & Austaktung': {
        description: 'Bewertet Rüstzeiten, Losgrößenflexibilität und die Abstimmung der Prozessschritte.',
        questions: [
          { code: '2.3.1', text: 'Wie lang sind die Rüstzeiten an den Engpassanlagen?', explanation: 'Kurze Rüstzeiten (SMED) erlauben kleine Lose und häufige Wechsel; sie sind Voraussetzung für variantenreiche Linien und Inseln. (vgl. Shingo 1985)',
            options: O('Über 4 Stunden; Rüsten wird möglichst vermieden.', '1–4 Stunden; Rüstvorgänge sind nicht analysiert.', '30–60 Minuten; erste Rüstoptimierungen umgesetzt.', '10–30 Minuten; Rüsten ist nach SMED standardisiert.', 'Unter 10 Minuten (Single Minute Exchange of Die) an allen Engpassanlagen.') },
          { code: '2.3.2', text: 'Wie gut sind die Bearbeitungszeiten der aufeinanderfolgenden Schritte aufeinander abgestimmt?', explanation: 'Eine Linie läuft nur dann ohne Wartezeiten, wenn die Zykluszeiten der Stationen nahe der Taktzeit liegen (Austaktung, Line Balancing). (vgl. Boysen et al. 2007; Takeda 2012)',
            options: O('Zykluszeiten sind nicht bekannt.', 'Zykluszeiten sind bekannt, unterscheiden sich aber um mehr als den Faktor 3.', 'Engpass ist bekannt; die Zeiten unterscheiden sich um den Faktor 2–3.', 'Stationen sind auf eine Taktzeit ausgelegt; Abweichungen unter 30 %.', 'Ausgetaktete Stationen (Abweichung unter 10 %) mit Taktzeit aus dem Kundenbedarf.') }
        ]
      }
    },
    'Technik & Ausstattung': {
      '3.1 Anlagenverfügbarkeit & Kapazität': {
        description: 'Bewertet Gesamtanlageneffektivität, Kapazitätsreserve und Technologiestand.',
        questions: [
          { code: '3.1.1', text: 'Wie hoch ist die Gesamtanlageneffektivität (OEE) der wichtigsten Anlagen?', explanation: 'Die OEE (Verfügbarkeit × Leistung × Qualität) bestimmt, wie viele Anlagen für eine Stückzahl benötigt werden. Sie fließt direkt in die Kapazitätsrechnung des Layouts ein. (vgl. Nakajima 1988; DIN EN 13306)',
            options: O('Unbekannt oder unter 50 %.', '50–60 %.', '60–70 %.', '70–80 %.', 'Über 80 %; Verluste werden täglich ausgewertet.') },
          { code: '3.1.2', text: 'Reicht die vorhandene Maschinenkapazität für das geplante Produktionsprogramm?', explanation: 'Fehlende Kapazität an einem Engpass begrenzt die Ausbringung des gesamten Systems. In Linien muss jede Station die Taktzeit erreichen, sonst sind parallele Anlagen nötig. (vgl. Goldratt 1984; Grundig 2021)',
            options: O('Deutlich zu wenig Kapazität; regelmäßig Fremdvergabe oder Sonderschichten.', 'Mehrere Engpässe; Lieferzusagen werden häufig verschoben.', 'Ein bekannter Engpass; Ausbringung reicht knapp.', 'Ausreichende Kapazität mit geringer Reserve (unter 15 %).', 'Ausreichende Kapazität mit geplanter Reserve von 15–25 % an allen Engpässen.') },
          { code: '3.1.3', text: 'Wie ist der Technologiestand der Maschinen und Anlagen?', explanation: 'Veraltete Anlagen verursachen lange Rüst- und Ausfallzeiten und lassen sich schwer verketten oder vernetzen. (vgl. Lichtblau et al. 2015)',
            options: O('Überwiegend über 20 Jahre alt, ohne Steuerungsschnittstellen.', 'Überwiegend über 15 Jahre alt; nur einzelne CNC-Anlagen.', 'Gemischter Bestand; die Engpassanlagen sind modern.', 'Überwiegend aktuelle CNC-Technik mit Schnittstellen.', 'Moderner, vernetzter Anlagenpark mit Investitionsplan nach Lebenszyklus.') }
        ]
      },
      '3.2 Automatisierung & Fördertechnik': {
        description: 'Bewertet Automatisierung der Handhabung und die Intralogistik-Ausstattung.',
        questions: [
          { code: '3.2.1', text: 'Wie hoch ist der Automatisierungsgrad bei Handhabung, Be- und Entladen der Maschinen?', explanation: 'Automatisierte Beladung (Roboter, Palettenwechsler) erhöht die Laufzeit über Pausen und Schichten hinweg und entkoppelt Mensch und Maschine. (vgl. Hesse 2016)',
            options: O('Vollständig manuell.', 'Einzelne Hilfsmittel (Hebezeuge, Wechseltische).', 'Teilautomatisierung an Engpassanlagen (z. B. Palettenwechsler).', 'Roboterbeladung an den meisten Hauptanlagen.', 'Verkettete, mannarme Fertigung über mehrere Schritte.') },
          { code: '3.2.2', text: 'Wie ist die innerbetriebliche Fördertechnik ausgestattet?', explanation: 'Fördertechnik (Rollenbahnen, Routenzüge, FTS) verbindet die Fertigungsschritte und ist das Rückgrat jeder Linie. Fehlende Fördertechnik führt zu Staplerverkehr und Suchzeiten. (vgl. Arnold/Furmans 2019; ASR A1.8)',
            options: O('Ausschließlich Handtransport und Stapler auf Zuruf.', 'Stapler mit festen Zuständigkeiten; keine Verkettung.', 'Einzelne Rollenbahnen oder Förderer zwischen Schritten.', 'Routenzug und Förderer verbinden die Hauptbereiche.', 'Durchgängige Verkettung mit FTS, Fördertechnik und automatischem Lager.') }
        ]
      },
      '3.3 Instandhaltung & Betriebsmittel': {
        description: 'Bewertet Instandhaltungsstrategie sowie Werkzeug- und Betriebsmittelmanagement.',
        questions: [
          { code: '3.3.1', text: 'Nach welcher Strategie wird instandgehalten?', explanation: 'In verketteten Systemen stoppt der Ausfall einer Anlage den gesamten Fluss. Vorbeugende und zustandsorientierte Instandhaltung (TPM) ist deshalb Voraussetzung für Linien. (vgl. Nakajima 1988; DIN EN 13306)',
            options: O('Rein reaktiv (Feuerwehr).', 'Reaktiv mit gesetzlich vorgeschriebenen Prüfungen.', 'Vorbeugende Wartungspläne für die Hauptanlagen.', 'TPM mit autonomer Instandhaltung durch die Bediener.', 'Zustandsorientiert und vorausschauend (Predictive Maintenance) mit Ausfallanalysen.') },
          { code: '3.3.2', text: 'Wie werden Werkzeuge, Vorrichtungen und Prüfmittel verwaltet?', explanation: 'Ein geordnetes Werkzeug- und Vorrichtungsmanagement verkürzt Rüst- und Suchzeiten und ist Voraussetzung für Rüsten nach SMED. (vgl. Shingo 1985)',
            options: O('Nicht organisiert; Werkzeuge werden gesucht.', 'Zentrale Ausgabe ohne Bestandsübersicht.', 'Feste Lagerorte; Voreinstellung für einzelne Maschinen.', 'Werkzeugvoreinstellung und Rüstwagen je Anlage.', 'Digitales Werkzeugmanagement mit Standzeitüberwachung.') }
        ]
      }
    },
    'Organisation & Mitarbeitende': {
      '4.1 Qualifikation & Flexibilität': {
        description: 'Bewertet Mehrfachqualifikation, Einsatzflexibilität und Einarbeitung.',
        questions: [
          { code: '4.1.1', text: 'Wie viele Mitarbeitende können mehrere Arbeitsplätze oder Maschinen bedienen?', explanation: 'Mehrfachqualifikation ist die Voraussetzung für Inseln und U-Linien, in denen ein Team mehrere Schritte betreut und Mengenschwankungen über den Personaleinsatz ausgleicht. (vgl. Wiendahl et al. 2014)',
            options: O('Kaum jemand; jede Person ist an eine Maschine gebunden.', 'Einzelne Springer.', 'Etwa ein Drittel ist für mindestens drei Arbeitsplätze qualifiziert; eine Qualifikationsmatrix existiert.', 'Die Mehrheit ist mehrfach qualifiziert; die Matrix wird geplant fortgeschrieben.', 'Teams decken alle Schritte ihres Bereichs ab; Jobrotation ist Standard.') },
          { code: '4.1.2', text: 'Wie strukturiert erfolgt die Einarbeitung neuer Mitarbeitender?', explanation: 'Eine standardisierte Einarbeitung (z. B. TWI – Training Within Industry) verkürzt die Anlernzeit und sichert gleichbleibende Qualität bei Fluktuation. (vgl. Dinero 2005)',
            options: O('Mitlaufen ohne Plan.', 'Einarbeitung durch erfahrene Kolleg:innen ohne Unterlagen.', 'Einarbeitungsplan mit Freigabe je Arbeitsplatz.', 'Lehrwerkstatt bzw. Trainingsplatz und standardisierte Unterweisung.', 'Systematisches Qualifizierungsprogramm mit Messung der Anlernzeit.') }
        ]
      },
      '4.2 Führung & Verantwortung': {
        description: 'Bewertet Teamstrukturen, Ergebnisverantwortung und Shopfloor-Management.',
        questions: [
          { code: '4.2.1', text: 'Wie ist die Verantwortung für Mengen, Termine und Qualität organisiert?', explanation: 'Objektorientierte Organisationsformen (Inseln, Linien, Segmente) übertragen Ergebnisverantwortung an Teams. Funktionale Abteilungen passen zur Werkstattfertigung. (vgl. Wildemann 1988; Grundig 2021)',
            options: O('Ausschließlich beim Meister bzw. der Produktionsleitung.', 'Abteilungsweise nach Verrichtung (Dreherei, Fräserei …).', 'Erste Teams mit Verantwortung für Teilbereiche.', 'Teams mit Ergebnisverantwortung für Produktfamilien oder Linien.', 'Selbststeuernde Teams in Fertigungssegmenten mit eigenem Budget und Kennzahlen.') },
          { code: '4.2.2', text: 'Gibt es ein regelmäßiges Shopfloor-Management mit Kennzahlen am Ort des Geschehens?', explanation: 'Kurze tägliche Runden an Kennzahlentafeln machen Abweichungen sichtbar und sorgen für schnelle Entscheidungen; sie sind das Steuerungsinstrument jeder Linie. (vgl. Hertle et al. 2015)',
            options: O('Nein.', 'Unregelmäßige Besprechungen im Büro.', 'Tägliche Runden in einzelnen Bereichen.', 'Kaskadiertes Shopfloor-Management mit Kennzahlentafeln in allen Bereichen.', 'Digitales Shopfloor-Management mit Eskalationsregeln und Maßnahmenverfolgung.') }
        ]
      },
      '4.3 Verbesserungskultur': {
        description: 'Bewertet kontinuierliche Verbesserung und systematische Problemlösung.',
        questions: [
          { code: '4.3.1', text: 'Wie verankert ist die kontinuierliche Verbesserung (KVP) im Alltag?', explanation: 'Ein gelebter KVP sorgt dafür, dass ein neues Layout nach der Umstellung weiter verbessert statt schleichend verschlechtert wird. (vgl. Imai 1986; VDI 2870)',
            options: O('Kein KVP.', 'Betriebliches Vorschlagswesen mit geringer Beteiligung.', 'Regelmäßige KVP-Workshops in einzelnen Bereichen.', 'KVP-Zeit ist fest eingeplant; Ideen werden im Team umgesetzt.', 'Verbesserung ist Teil jeder Rolle; Wirkung wird gemessen und belohnt.') },
          { code: '4.3.2', text: 'Wie systematisch werden Probleme gelöst?', explanation: 'Standardisierte Problemlösung (PDCA, A3, 8D) beseitigt Ursachen dauerhaft und stabilisiert damit Takt und Qualität. (vgl. Shook 2008)',
            options: O('Symptome werden behoben; Ursachen bleiben unklar.', 'Ursachenanalyse nur bei Kundenreklamationen.', 'Strukturierte Methoden (z. B. 8D) bei größeren Problemen.', 'PDCA/A3 als Standard für alle wiederkehrenden Probleme.', 'Problemlösung auf allen Ebenen mit Wissensdatenbank und Wirksamkeitsprüfung.') }
        ]
      }
    },
    'Digitalisierung & Steuerung': {
      '5.1 Planung & Auftragssteuerung': {
        description: 'Bewertet Produktionsplanung, Feinsteuerung und Auftragsfreigabe.',
        questions: [
          { code: '5.1.1', text: 'Wie werden Aufträge geplant und eingelastet?', explanation: 'Eine kapazitätsgerechte Feinplanung verhindert Überlast an Engpässen und ist Basis für verlässliche Liefertermine. (vgl. Schuh/Stich 2012)',
            options: O('Manuell auf Zuruf oder in Listen.', 'ERP-Grobplanung ohne Kapazitätsabgleich.', 'ERP mit Kapazitätsplanung; Feinplanung im Tabellenwerkzeug.', 'Feinplanung im APS/MES mit Engpassbetrachtung.', 'Automatische, simulationsgestützte Feinplanung mit Rückmeldung in Echtzeit.') },
          { code: '5.1.2', text: 'Wie wird die Auftragsfreigabe gesteuert (Push oder Pull)?', explanation: 'Verbrauchsgesteuerte Freigabe (Kanban, CONWIP) begrenzt die Bestände im System und ist die Steuerungslogik von Linien und Inseln. (vgl. Hopp/Spearman 2008)',
            options: O('Alle Aufträge werden sofort freigegeben.', 'Freigabe nach Termin, ohne Bestandsgrenze.', 'Belastungsorientierte Freigabe in einzelnen Bereichen.', 'Pull-Steuerung (Kanban/CONWIP) für Standardteile.', 'Durchgängige Pull-Steuerung vom Versand bis zur Vorfertigung.') }
        ]
      },
      '5.2 Datenerfassung & Transparenz': {
        description: 'Bewertet Betriebs- und Maschinendatenerfassung sowie Kennzahlentransparenz.',
        questions: [
          { code: '5.2.1', text: 'Wie werden Betriebs- und Maschinendaten erfasst?', explanation: 'Ohne verlässliche Daten zu Laufzeiten, Störungen und Mengen bleiben OEE, Engpässe und Durchlaufzeiten Schätzungen. (vgl. VDI 5600; Lichtblau et al. 2015)',
            options: O('Gar nicht oder auf Papier.', 'Manuelle Rückmeldung von Mengen und Zeiten im ERP.', 'BDE-Terminals an den Arbeitsplätzen.', 'Automatische Maschinendatenerfassung an den Hauptanlagen.', 'Durchgängige, automatische Erfassung aller Anlagen und Aufträge in Echtzeit.') },
          { code: '5.2.2', text: 'Wie transparent sind Kennzahlen (Ausbringung, OEE, Durchlaufzeit, Bestand) für die Teams?', explanation: 'Transparente Kennzahlen machen Abweichungen früh sichtbar und sind die Grundlage für Shopfloor-Management und KVP. (vgl. Hertle et al. 2015)',
            options: O('Kennzahlen liegen nicht vor.', 'Monatliche Auswertungen für die Leitung.', 'Wöchentliche Kennzahlen je Bereich.', 'Tägliche Kennzahlen an den Bereichstafeln.', 'Kennzahlen in Echtzeit an Andon-Tafeln und auf mobilen Geräten.') }
        ]
      },
      '5.3 Vernetzung & Rückverfolgbarkeit': {
        description: 'Bewertet Rückverfolgbarkeit sowie Integration der IT-Systeme.',
        questions: [
          { code: '5.3.1', text: 'Wie gut lassen sich Teile und Aufträge durch die Fertigung zurückverfolgen?', explanation: 'Rückverfolgbarkeit (Charge, Seriennummer) ist für Qualitätsanalysen und viele Kundenanforderungen Pflicht und erleichtert die Steuerung verketteter Systeme. (vgl. VDA 2016)',
            options: O('Nicht rückverfolgbar.', 'Über Papierbegleitscheine.', 'Auftragsbezogen im ERP.', 'Chargen- bzw. seriennummerngenau mit Barcode/RFID.', 'Lückenlos mit Prozessdaten je Teil (digitaler Zwilling).') },
          { code: '5.3.2', text: 'Wie sind ERP, MES, Maschinen und Logistik miteinander verbunden?', explanation: 'Durchgängige Schnittstellen vermeiden Doppelerfassung und ermöglichen die Steuerung von Fördertechnik und FTS aus den Auftragsdaten. (vgl. VDI 5600; IEC 62264)',
            options: O('Keine Verbindung; Insellösungen.', 'Datenaustausch über Dateien bzw. manuell.', 'Einzelne Schnittstellen (z. B. ERP–BDE).', 'Integriertes ERP/MES mit angebundenen Hauptanlagen.', 'Durchgängig vernetzte Systemlandschaft inklusive Intralogistik und Lager.') }
        ]
      }
    }
  },
  recommendations: {
    '1.1 Standardisierung & Modularität': 'Das Produktprogramm sollte auf Gleichteile und Module ausgerichtet werden: Varianten spät in der Wertschöpfung bilden, Baukästen definieren und neue Produkte gemeinsam mit der Fertigung fertigungs- und montagegerecht (DfM/DfA) gestalten. Das vergrößert die Teilefamilien und macht flussorientierte Strukturen wirtschaftlich.',
    '1.2 Teilefamilien & Programmplanbarkeit': 'Teile sollten anhand ihrer Arbeitsfolgen zu Familien zusammengefasst (Routing-Analyse, Produkt-Prozess-Matrix) und festen Fertigungsbereichen zugeordnet werden. Parallel ist eine rollierende Absatz- und Produktionsplanung mit Glättung der Mengen (Heijunka) einzuführen.',
    '2.1 Prozessstabilität & Standardarbeit': 'Für alle Arbeitsplätze sollte Standardarbeit mit Arbeitsfolge, Taktzeit und Standardbestand beschrieben, visualisiert und auditiert werden. Fehler sind am Entstehungsort zu vermeiden (Poka Yoke, Werkerselbstprüfung); der First Pass Yield ist je Schritt zu messen.',
    '2.2 Materialfluss & Bestände': 'Das Layout sollte nach dem Materialfluss neu geordnet werden (gerichteter I- oder U-Fluss ohne Rückwege). Zwischenbestände sind über FIFO-Bahnen und Supermärkte zu begrenzen, und die Materialbereitstellung ist auf getaktete Routenzüge bzw. Kanban umzustellen.',
    '2.3 Rüsten & Austaktung': 'An den Engpassanlagen sollten Rüstvorgänge nach SMED analysiert und auf unter 30 Minuten gesenkt werden. Die Stationen sind auf eine aus dem Kundenbedarf abgeleitete Taktzeit auszulegen (Line Balancing), damit eine verkettete Fertigung ohne Wartezeiten läuft.',
    '3.1 Anlagenverfügbarkeit & Kapazität': 'Die OEE der Hauptanlagen sollte gemessen und systematisch gesteigert werden. Fehlende Kapazität an Engpässen ist durch zusätzliche oder leistungsfähigere Anlagen zu schließen; eine geplante Reserve von 15–25 % sichert die Lieferfähigkeit.',
    '3.2 Automatisierung & Fördertechnik': 'Die Fertigungsschritte sollten durch Fördertechnik (Rollenbahnen, Routenzug, FTS) verkettet und die Beladung der Engpassanlagen automatisiert werden (Roboter, Palettenwechsler). So steigt die Laufzeit und der Staplerverkehr in der Halle sinkt.',
    '3.3 Instandhaltung & Betriebsmittel': 'Die Instandhaltung sollte von reaktiv auf vorbeugend und zustandsorientiert umgestellt werden (TPM mit autonomer Instandhaltung durch die Bediener). Werkzeuge und Vorrichtungen sind voreinzustellen und anlagennah auf Rüstwagen bereitzustellen.',
    '4.1 Qualifikation & Flexibilität': 'Eine Qualifikationsmatrix sollte eingeführt und gezielt fortgeschrieben werden, sodass jede Person mindestens drei Arbeitsplätze beherrscht. Eine standardisierte Einarbeitung (z. B. TWI) verkürzt die Anlernzeit.',
    '4.2 Führung & Verantwortung': 'Die Organisation sollte von verrichtungsorientierten Abteilungen auf Teams mit Ergebnisverantwortung für Produktfamilien, Inseln oder Linien umgestellt werden. Ein tägliches, kaskadiertes Shopfloor-Management mit Kennzahlentafeln steuert den Bereich.',
    '4.3 Verbesserungskultur': 'Kontinuierliche Verbesserung sollte mit fester KVP-Zeit, PDCA/A3 als Standard für Problemlösung und messbarer Wirkung im Alltag verankert werden.',
    '5.1 Planung & Auftragssteuerung': 'Die Auftragsplanung sollte um eine kapazitätsgerechte Feinplanung mit Engpassbetrachtung ergänzt und die Freigabe auf Pull-Steuerung (Kanban, CONWIP) umgestellt werden.',
    '5.2 Datenerfassung & Transparenz': 'Betriebs- und Maschinendaten sollten automatisch erfasst und als tägliche bzw. Echtzeit-Kennzahlen (Ausbringung, OEE, Durchlaufzeit, Bestand) an den Bereichstafeln sichtbar gemacht werden.',
    '5.3 Vernetzung & Rückverfolgbarkeit': 'ERP, MES, Anlagen und Intralogistik sollten über Schnittstellen verbunden und Teile per Barcode/RFID rückverfolgbar gemacht werden. Das ist die Grundlage für FTS-Steuerung und digitale Auftragsverfolgung.'
  }
};

/* ---------- Rahmendaten für die Fabrikplanung (unabhängig vom Reifegrad) ---------- */
window.PRS_RAHMEN = {
  formIst: { label: 'Aktuelle Organisationsform der Fertigung', opts: [['werkstatt', 'Werkstattfertigung (nach Verrichtung: Dreherei, Fräserei …)'], ['insel', 'Inselfertigung (Fertigungsinseln / Zellen)'], ['linie', 'Linien- bzw. Fließfertigung'], ['gemischt', 'Gemischt / keine klare Struktur']] },
  varianten: { label: 'Anzahl Produktvarianten', opts: [['v1', 'bis 5', 1], ['v2', '6–20', 0.7], ['v3', '21–100', 0.35], ['v4', 'über 100', 0.05]] },
  stueck: { label: 'Stückzahl je Jahr (Endprodukte)', opts: [['s1', 'unter 1.000', 0.05, 600], ['s2', '1.000–10.000', 0.35, 5000], ['s3', '10.000–100.000', 0.75, 40000], ['s4', 'über 100.000', 1, 150000]] },
  los: { label: 'Typische Losgröße', opts: [['l1', 'Einzelstück (1)', 0], ['l2', 'Kleinserie (2–50)', 0.3], ['l3', 'Serie (51–1.000)', 0.7], ['l4', 'Großserie (über 1.000)', 1]] },
  aehnlich: { label: 'Anteil der Teile mit gleicher Arbeitsfolge', opts: [['a1', 'unter 25 %', 0.05], ['a2', '25–50 %', 0.35], ['a3', '51–75 %', 0.7], ['a4', 'über 75 %', 1]] },
  familien: { label: 'Produktfamilien (für Inseln/Linien)', opts: [['1', '1 Familie'], ['2', '2 Familien'], ['3', '3 Familien'], ['4', '4 Familien']] },
  schichten: { label: 'Schichtmodell', opts: [['1', '1 Schicht'], ['2', '2 Schichten'], ['3', '3 Schichten']] },
  halle: { label: 'Verfügbare (leere) Halle', opts: [['72x36', '72 × 36 m (2.592 m²)'], ['96x48', '96 × 48 m (4.608 m²)'], ['120x60', '120 × 60 m (7.200 m²)']] },
  lager: { label: 'Lagerkonzept', opts: [['regal', 'Palettenregallager (Stapler)'], ['hrl', 'Hochregal mit Regalbediengerät']] },
  auto: { label: 'Automatisierungsziel', opts: [['manuell', 'manuell'], ['teil', 'teilautomatisiert (Roboter an Engpässen)'], ['hoch', 'hochautomatisiert (Roboter, FTS)']] },
  schritte: { label: 'Fertigungsschritte (Mehrfachauswahl)', opts: [['saege', 'Zuschnitt / Sägen'], ['laser', 'Laserschneiden'], ['biegen', 'Biegen / Abkanten'], ['drehen', 'Drehen'], ['fraesen', 'Fräsen'], ['schweissen', 'Schweißen'], ['waschen', 'Waschen / Reinigen'], ['lackieren', 'Lackieren / Beschichten'], ['spritzguss', 'Spritzgießen'], ['pressen', 'Umformen / Pressen']] }
};
})();
