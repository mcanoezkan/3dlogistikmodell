# Healthcare Simulation Suite – Desktop-Version (Windows-Exe mit Lizenz)

Die Desktop-Version ist die Suite in einem eigenen Programmfenster (Electron). Beim ersten Start
verlangt sie einen **Lizenzschlüssel**; oben rechts steht danach die Restlaufzeit („Lizenz: noch 87 Tage“).

## Exe bauen

```bash
cd desktop
npm install
npm run exe      # portable Exe: dist/Healthcare_Simulation_Suite_1.0.0.exe (läuft ohne Installation)
npm run setup    # Installer (nur unter Windows oder mit Wine)
npm start        # zum Ausprobieren unter Windows/Linux/macOS
```

Alternativ auf GitHub unter **Actions → Desktop-Exe → Run workflow**: baut Exe und Installer auf Windows.

## Lizenzschlüssel erzeugen

`tools/lizenz-generator.html` im Browser öffnen (offline):
1. Privaten Schlüssel `HSS_Lizenz_PRIVAT.jwk.json` laden (bleibt bei UNITY, nie ins Repository).
2. Kunde, Anzahl Nutzer, Beginn und Laufzeit in Minuten/Stunden/Tagen/Wochen/Monaten/Jahren oder „bis Zeitpunkt“.
3. Optional Geräte-IDs (je Zeile eine) – dann läuft der Schlüssel nur auf diesen Rechnern; höchstens so viele wie Nutzer.
4. „Lizenzschlüssel erzeugen“ → Schlüssel an den Kunden. Die Liste der ausgestellten Lizenzen lässt sich als CSV speichern.

Der Kunde trägt den Schlüssel beim ersten Start ein. Die Geräte-ID zeigt die Suite im Lizenzfenster an
(„kopieren“). Bei Ablauf sperrt die Suite; Projekte bleiben erhalten und sind mit neuem Schlüssel wieder da.

## Was die Lizenz leistet – und was nicht

* Schlüssel sind mit ECDSA P-256 signiert; ohne den privaten Schlüssel lassen sie sich nicht fälschen oder verlängern.
* Zurückgestellte Systemuhr wird erkannt.
* **Nutzerzahl:** Ohne Gerätebindung ist sie im Schlüssel vermerkt und in der Lizenzanzeige sichtbar, aber nicht technisch
  erzwungen (dafür bräuchte es einen Lizenzserver, der Aktivierungen zählt). Mit Gerätebindung (Geräte-IDs im Schlüssel)
  läuft die Lizenz nur auf den freigeschalteten Rechnern.
* Die Prüfung läuft im Programm selbst. Wer die Exe gezielt zerlegt und verändert, kann sie umgehen – für Kunden im
  Projektgeschäft reicht das in der Regel; ein Kopierschutz mit Server wäre der nächste Schritt.
* Exportierte HTML-Ansichten (nur ansehen) brauchen keine Lizenz.
