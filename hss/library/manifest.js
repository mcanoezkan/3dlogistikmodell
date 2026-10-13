/* HSS-Bibliothek · Paketliste
   Neues Paket hinzufügen: Datei in diesen Ordner legen und hier eintragen. Die Suite lädt die
   Pakete beim Start; am Programm selbst ist nichts zu ändern.
   Alternativ ohne Dateizugriff: in der App unter „Bibliothek → Hochladen“ *.hssobj.json,
   *.hsslib.json oder *.glb wählen (wird im Browser gespeichert und in Projektdateien mitgeführt). */
window.HSS_LIBRARY_FILES = [
  'medizintechnik.js',
  'station.js',
  'logistik.js',
  'personen-fahrzeuge.js',
  'aussen.js'
];
(function () {
  var base = (document.currentScript && document.currentScript.src || '').replace(/manifest\.js.*$/, '');
  for (var i = 0; i < window.HSS_LIBRARY_FILES.length; i++) document.write('<script src="' + base + window.HSS_LIBRARY_FILES[i] + '"><\/script>');
})();
